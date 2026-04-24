---
name: c-build-debug
description: C Chat 앱 빌드 및 디버깅 스킬. Makefile 구조, gcc 플래그, GDB/Valgrind 사용법, 자주 발생하는 컴파일 에러 해결 패턴 제공. 빌드 오류나 런타임 디버깅 시 사용.
allowed-tools: shell
---

# C Chat 빌드 & 디버깅 가이드

## 빌드 명령

```bash
make           # 서버 + 클라이언트 전체 빌드
make server    # 서버만 빌드
make client    # 클라이언트만 빌드
make clean     # 빌드 아티팩트 정리
```

빌드 결과물:
- `chat_program/src/server/chat_server`
- `chat_program/src/client/chat_client`

## 컴파일 플래그

```makefile
CC       = gcc
CFLAGS   = -std=c11 -Wall -Wextra -Wshadow
GTK_FLAGS= $(shell pkg-config --cflags gtk4)
GTK_LIBS = $(shell pkg-config --libs gtk4)
MYSQL_FLAGS = $(shell mysql_config --cflags)
MYSQL_LIBS  = $(shell mysql_config --libs)
THREAD_LIBS = -lpthread

SERVER_CFLAGS = $(CFLAGS) $(MYSQL_FLAGS)
CLIENT_CFLAGS = $(CFLAGS) $(GTK_FLAGS)
```

## 디버그 빌드 (AddressSanitizer)

```bash
gcc -std=c11 -g3 -O0 \
    -fsanitize=address,undefined \
    -Wall -Wextra -Wshadow \
    -o chat_server_dbg \
    chat_program/src/common/*.c \
    chat_program/src/server/*.c \
    $(mysql_config --cflags --libs) -lpthread
```

## GDB 사용법

```bash
# 빌드 (-g 옵션 필수)
make DEBUG=1   # 또는 위 디버그 빌드 명령

# 서버 디버그
gdb ./chat_server_dbg
(gdb) run 8080          # 포트 8080으로 시작
(gdb) bt                # 크래시 시 백트레이스
(gdb) thread apply all bt  # 모든 스레드 스택
(gdb) info threads      # 스레드 목록
(gdb) break auth.c:45   # 브레이크포인트
```

## Valgrind 메모리 검사

```bash
valgrind \
    --leak-check=full \
    --show-leak-kinds=all \
    --track-origins=yes \
    --verbose \
    ./chat_server_dbg 8080 2>&1 | tee valgrind.log
```

## 자주 발생하는 에러 & 해결법

### 1. `undefined reference to 'mysql_init'`
```
→ mysql_config --libs 링크 플래그 누락
해결: gcc ... $(mysql_config --libs)
```

### 2. `implicit declaration of function 'gtk_window_new'`
```
→ GTK4 헤더 include 누락
해결: #include <gtk/gtk.h>
     + pkg-config --cflags gtk4 플래그 추가
```

### 3. `error: 'for' loop initial declarations are only allowed in C99 mode`
```
→ -std=c11 플래그 누락
해결: CFLAGS에 -std=c11 추가
```

### 4. `Segmentation fault (core dumped)`
```bash
# 1. 코어 덤프 활성화
ulimit -c unlimited

# 2. 크래시 재현 후
gdb ./chat_server core
(gdb) bt   # 크래시 위치 확인

# 흔한 원인:
# - NULL 포인터 역참조 (malloc 반환값 미검사)
# - GTK4 recv 스레드에서 widget 직접 수정
# - 패킷 필드 길이 초과 접근
```

### 5. Deadlock (프로세스가 멈춤)
```bash
# 실행 중인 서버 PID 확인
pgrep chat_server

# GDB attach
gdb -p <PID>
(gdb) thread apply all bt  # 모든 스레드 스택 → pthread_mutex_lock 두 번 보이면 데드락
```

## 런타임 실행

```bash
# 서버 시작 (포트 8080)
./chat_program/src/server/chat_server 8080

# 클라이언트 연결
./chat_program/src/client/chat_client 127.0.0.1 8080
```

## 의존성 확인

```bash
pkg-config --modversion gtk4      # GTK4 버전 확인
mysql_config --version             # MySQL client 버전
ldd ./chat_server | grep mysql     # 동적 링크 확인
```
