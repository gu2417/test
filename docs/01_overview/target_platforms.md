# 타깃 플랫폼 · 지원 매트릭스

## 1. 요약

`requirements.md` NFR-06 은 Linux + Windows(MinGW) 를 명시하지만, 본 설계는
사용자 확정에 따라 **macOS 를 정식 지원 플랫폼으로 추가**한다. 세 환경 모두에서
동일 소스 트리로 빌드·실행 가능해야 한다.

## 2. 지원 매트릭스

| 구분 | Linux (glibc) | Windows (MinGW-w64) | macOS (Darwin) |
|------|---------------|---------------------|----------------|
| 서버 | ✅ 지원 | ✅ 지원 | ✅ 지원 |
| 클라이언트 | ✅ 지원 | ✅ 지원 | ✅ 지원 |
| 컴파일러 | gcc 9+ / clang 10+ | mingw-w64 gcc 8+ | Apple clang 13+ |
| C 표준 | C11 | C11 | C11 |
| 스레드 | `pthread` | `pthread-win32` (MinGW 번들) | `pthread` |
| 소켓 | `<sys/socket.h>` | `<winsock2.h>` + `ws2_32` 링크 | `<sys/socket.h>` |
| Raw-mode | `termios` | Win32 Console API (`SetConsoleMode`) | `termios` |
| Key input | `read()` + `ioctl` | `_getch()` / `ReadConsoleInput` | `read()` + `ioctl` |
| Sleep | `nanosleep` | `Sleep` | `nanosleep` |
| 파일 경로 | `/` | `\` (설계상 경로 하드코딩 금지) | `/` |
| 터미널 크기 | `TIOCGWINSZ` | `GetConsoleScreenBufferInfo` | `TIOCGWINSZ` |
| MySQL 클라이언트 | `libmysqlclient-dev` | MySQL Connector/C (win) | `mysql-client` (brew) |

## 3. 저사양 기준선

**최소 사양**(클라이언트 실행 기준):

| 항목 | 최소값 |
|------|--------|
| CPU | 듀얼코어 1.6GHz |
| RAM | 2GB (OS 포함) — 클라이언트 자체는 ≤20MB 상주 |
| 터미널 크기 | 80열 × 24행 |
| 네트워크 | 1Mbps |

서버는 NFR-05 에 따라 MySQL 제외 **100MB 이하** 상주.

## 4. 이식성 원칙

1. 플랫폼 분기는 **전부 `common/` 또는 `client/console.h` 에 집중**한다.
   기능 코드(auth, room, message)에는 `#ifdef _WIN32` 를 쓰지 않는다.
2. 경로 구분자·파일 I/O 는 추상 헬퍼를 통해서만 접근.
3. 빌드는 단일 `Makefile` 과 선택적 `Makefile.mingw` 로 관리.
   macOS 는 기본 `Makefile` 이 자동으로 `-I$(brew --prefix)/opt/mysql-client/include` 등을 해석.
4. 바이트 오더는 전송 시 항상 network byte order 가정. 패킷은 텍스트이므로 문제 되지 않음.

## 5. 확인된 제약

- Windows cmd.exe 는 ANSI 이스케이프가 Win10 1607+ 에서만 동작 →
  클라이언트 시작 시 `SetConsoleMode(ENABLE_VIRTUAL_TERMINAL_PROCESSING)` 호출.
- macOS Terminal.app 은 일부 유니코드 박스 드로잉 폭이 2칸으로 렌더 → 와이어프레임은
  ASCII(`+`, `-`, `|`) 기본, 확장 박스 문자는 설정으로 제공.
