# C Console Chat

> **C11 기반 콘솔 실시간 채팅 애플리케이션** — KakaoTalk · Google Chat 스타일의 TUI 채팅 시스템

[![Language](https://img.shields.io/badge/Language-C11-blue.svg)](https://en.cppreference.com/w/c/11)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey.svg)](#지원-플랫폼)
[![Architecture](https://img.shields.io/badge/Architecture-TCP%20Server--Client-green.svg)](#시스템-아키텍처)
[![Database](https://img.shields.io/badge/Database-MySQL%205.7%2B-orange.svg)](#데이터베이스)
[![Version](https://img.shields.io/badge/Requirements-v2.0.0-informational.svg)](./requirements.md)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [주요 기능](#2-주요-기능)
3. [시스템 요구사항](#3-시스템-요구사항)
4. [빠른 시작](#4-빠른-시작)
5. [시스템 아키텍처](#5-시스템-아키텍처)
6. [프로젝트 구조](#6-프로젝트-구조)
7. [패킷 프로토콜](#7-패킷-프로토콜)
8. [데이터베이스](#8-데이터베이스)
9. [TUI 화면 구성](#9-tui-화면-구성)
10. [슬래시 커맨드](#10-슬래시-커맨드)
11. [보안](#11-보안)
12. [비기능 요구사항](#12-비기능-요구사항)
13. [개발 로드맵](#13-개발-로드맵)
14. [설계 문서](#14-설계-문서)

---

## 1. 프로젝트 개요

### 1-1. 소개

**C Console Chat**은 C11로 작성된 경량 실시간 채팅 애플리케이션입니다. 카카오톡의 1:1 채팅·그룹 채팅·오픈채팅 개념과 Google Chat의 Space 개념을 **ANSI TUI(Text User Interface)** 로 구현합니다.

모든 영속 데이터(유저·메시지·채팅방·친구 관계·설정)는 **MySQL**에 저장되며, 서버 재시작 후에도 완전히 복원됩니다. GUI 없이 터미널만으로 동작하므로, 저사양 환경이나 SSH 원격 접속 환경에서도 사용할 수 있습니다.

### 1-2. 대상 사용자

- 소규모(≤100 동시 접속) 학습용·사내 커뮤니티 운영자
- GUI가 제한되거나 CPU/메모리가 부족한 저사양 노트북 사용자
- C 네트워크 프로그래밍·멀티스레딩·TUI 구현을 학습하는 개발자

### 1-3. 채팅방 유형

| 유형 | 설명 | 참여 방식 |
|------|------|-----------|
| **그룹 채팅방** | 초대 기반 닫힌 방 (카카오톡 단톡방) | 방장 또는 멤버가 친구 초대 |
| **오픈채팅방** | 누구나 목록에서 발견·참여 가능, 선택적 비밀번호 설정 | 목록 조회 후 자유 참여 |
| **1:1 DM** | 친구 또는 ID 직접 입력으로 자동 개설 | 자동 개설 |

### 1-4. 범위

**In-Scope (v2.0.0)**
- TCP Server-Client 분리 구조, 멀티스레드 서버
- MySQL 영속 저장 (유저·친구·방·메시지·리액션·설정)
- 콘솔 TUI: 로그인·메인·채팅·마이페이지·설정 화면
- 슬래시 커맨드 기반 입력
- 크로스 플랫폼 빌드: **Linux · Windows(MinGW) · macOS**
- 보안 기본선: 비밀번호 SHA-256 해시, SQL Prepared Statement 강제

**Out-of-Scope**
- GUI/웹 클라이언트, 파일·이미지 전송, 음성·화상 통화
- TLS 암호화 전송 (평문 전송은 로컬 네트워크 한정)
- 분산 서버·샤딩·로드밸런싱, 외부 푸시 알림 연동

---

## 2. 주요 기능

### 2-1. 계정 관리 (FR-A)

| ID | 기능 | 설명 |
|----|------|------|
| FR-A01 | 회원가입 | ID(최대 20자) · Password(최대 30자) · 닉네임(최대 20자) · 상태메시지 등록 |
| FR-A02 | 로그인 | ID + Password 검증, 중복 로그인 차단 |
| FR-A03 | 로그아웃 | 접속 종료, `last_seen` 갱신, 온라인 상태 해제 |
| FR-A04 | 프로필 수정 | 닉네임, 상태메시지 변경 |
| FR-A05 | 비밀번호 변경 | 현재 PW 확인 후 새 PW 설정 |
| FR-A06 | 마지막 접속 시간 | 오프라인 유저 프로필에 `마지막 접속: N분 전` 표시 |

### 2-2. 친구 관리 (FR-F)

| ID | 기능 | 설명 |
|----|------|------|
| FR-F01 | 친구 추가 | 상대방 ID 검색 후 친구 요청 전송 |
| FR-F02 | 친구 요청 수락/거절 | 수신된 요청 목록에서 처리 |
| FR-F03 | 친구 목록 조회 | 온라인/오프라인 상태 표시 포함 |
| FR-F04 | 친구 삭제 | 친구 목록에서 제거 |
| FR-F05 | 친구 차단 | 차단 시 메시지 수신 차단, 목록에서 숨김 |
| FR-F06 | 온라인 상태 표시 | `[ON]` / `[OFF]` / `[바쁨]` 3가지 상태 |
| FR-F07 | 유저 검색 | ID 또는 닉네임으로 전체 유저 검색 |

### 2-3. 1:1 DM (FR-D)

| ID | 기능 | 설명 |
|----|------|------|
| FR-D01 | DM 시작 | 친구 목록에서 선택하거나 ID 직접 입력으로 채팅방 개설 |
| FR-D02 | 메시지 전송 | 텍스트 메시지 전송 (최대 500자) |
| FR-D03 | 읽음 확인 | 상대방이 읽으면 `[읽음]` 표시 (카카오톡 스타일) |
| FR-D04 | 메시지 히스토리 | 입장 시 최근 50개 메시지 출력 (MySQL 조회) |
| FR-D05 | 안읽은 메시지 수 | 채팅 목록에 미읽 메시지 수 배지 표시 |

### 2-4. 그룹 채팅방 (FR-G)

| ID | 기능 | 설명 |
|----|------|------|
| FR-G01 | 채팅방 생성 | 방 이름(최대 30자) · 주제(최대 100자) · 최대 인원(기본 30명) · 비밀번호 선택 설정 |
| FR-G02 | 멤버 초대 | 방장 또는 멤버가 친구를 채팅방에 초대 |
| FR-G03 | 메시지 전송 | 입장한 방의 전체 참여자에게 브로드캐스트 |
| FR-G04 | 멘션(@) | `@닉네임`으로 특정 사용자 언급, 해당 사용자에게 알림 |
| FR-G05 | 채팅방 나가기 | 퇴장 메시지 브로드캐스트 후 방에서 제거 |
| FR-G06 | 방장 권한 | 멤버 강퇴 · 방 삭제 · 공지 등록 · 핀 메시지 설정 |
| FR-G07 | 공동 방장 | 방장이 특정 멤버에게 관리자 권한 부여/해제 |
| FR-G08 | 공지사항 등록/조회 | 공지 등록 시 입장할 때마다 상단 표시 |
| FR-G09 | 메시지 히스토리 | 입장 시 최근 100개 메시지 출력 (MySQL 조회) |
| FR-G10 | 멤버 목록 조회 | `/members`로 현재 방 참여자 및 온라인 상태 확인 |

### 2-5. 오픈채팅방 (FR-O)

| ID | 기능 | 설명 |
|----|------|------|
| FR-O01 | 오픈채팅방 생성 | 방 이름 · 주제 · 최대 인원 · 비밀번호(선택) 설정, 누구나 발견 가능 |
| FR-O02 | 목록 조회 | 전체 오픈채팅방 목록 (방이름, 현재인원/최대인원, 주제) |
| FR-O03 | 방 검색 | 방 이름 또는 주제 키워드로 검색 |
| FR-O04 | 자유 참여 | 목록에서 선택 후 참여, 비밀번호 방은 입력 후 참여 |
| FR-O05 | 익명 닉네임 | 오픈채팅방 전용 별도 닉네임 설정 가능 (미설정 시 기본 닉네임 사용) |

### 2-6. 메시지 부가기능 (FR-M)

| ID | 기능 | 설명 |
|----|------|------|
| FR-M01 | 귓속말 | `/w <닉네임> <내용>` — 특정 사용자에게만 전달 |
| FR-M02 | 메시지 삭제 | `/del <msg_id>` — 내 메시지 삭제, 상대에게 `삭제된 메시지` 표시 |
| FR-M03 | 메시지 수정 | `/edit <msg_id> <새내용>` — 전송 후 5분 이내 수정, `(수정됨)` 표시 |
| FR-M04 | 답장(인용) | `/reply <msg_id> <내용>` — 특정 메시지 인용 후 답장, 인용 원문 축약 표시 |
| FR-M05 | 리액션 | `/react <msg_id> <이모지>` — 메시지에 텍스트 이모지 반응 추가/취소, 집계 표시 |
| FR-M06 | 이모티콘 변환 | `:smile:` → `(^_^)`, `:heart:` → `<3` 등 텍스트 이모지 세트 |
| FR-M07 | 시스템 메시지 | 입/퇴장 · 초대 · 강퇴 · 공지 등 이벤트를 구분된 색상으로 표시 |
| FR-M08 | 메시지 검색 | `/search <키워드>` — 현재 채팅방 내 메시지 전문 검색 |
| FR-M09 | 타임스탬프 | 모든 메시지에 `[HH:MM]` 형식 시간 표시 (설정에서 형식 변경 가능) |
| FR-M10 | 핀 메시지 | `/pin <msg_id>` — 방장이 방 상단에 중요 메시지 고정 |
| FR-M11 | /me 액션 | `/me <동작>` — 이탤릭 스타일의 액션 메시지 (예: `* 홍길동 손을 흔든다`) |

### 2-7. 알림 (FR-N)

| ID | 기능 | 설명 |
|----|------|------|
| FR-N01 | 메시지 알림 | 현재 보고 있지 않은 채팅방/DM 메시지 수신 시 상단 배너 출력 |
| FR-N02 | 친구 요청 알림 | 로그인 시 및 실시간으로 알림 |
| FR-N03 | 멘션 알림 | `@나` 언급 시 강조 알림 (DND 상태에서도 표시) |
| FR-N04 | DND 모드 | `/dnd` 명령으로 알림 무음 설정 (멘션 제외) |
| FR-N05 | 타이핑 표시 | 상대방이 입력 중일 때 `홍길동 님이 입력 중...` 표시 |
| FR-N06 | 방 알림 무음 | `/mute` — 특정 채팅방 알림만 무음 처리 |

### 2-8. 유저 커스터마이징 (FR-C)

| ID | 기능 | 설명 |
|----|------|------|
| FR-C01 | 내 메시지 색상 | 내가 보낸 메시지의 텍스트 색상 선택 (red/green/yellow/blue/magenta/cyan/white) |
| FR-C02 | 닉네임 색상 | 채팅창에 표시되는 내 닉네임 색상 선택 |
| FR-C03 | 테마 | dark / light 터미널 테마 선택 |
| FR-C04 | 타임스탬프 형식 | `HH:MM` / `HH:MM:SS` / `MM-DD HH:MM` 중 선택 |
| FR-C05 | 상태메시지 | 친구 목록에 표시되는 한 줄 상태메시지 수정 |
| FR-C06 | 온라인 상태 | `online` / `busy` / `invisible` 수동 설정 |
| FR-C07 | 오픈채팅 닉네임 | 오픈채팅방별 별도 닉네임 설정 |

### 2-9. 마이페이지 (FR-P)

| ID | 기능 | 설명 |
|----|------|------|
| FR-P01 | 프로필 조회 | ID · 닉네임 · 상태메시지 · 가입일 · 마지막 접속 시간 |
| FR-P02 | 활동 통계 | 총 전송 메시지 수 · 참여 중인 채팅방 수 · 친구 수 |
| FR-P03 | 참여 채팅방 목록 | 현재 참여 중인 그룹/오픈채팅방 목록 |
| FR-P04 | 최근 DM 목록 | 최근 대화한 상대 목록 (마지막 메시지, 안읽은 수 포함) |
| FR-P05 | 프로필 수정 | 닉네임 · 상태메시지 인라인 수정 |
| FR-P06 | 비밀번호 변경 | 현재 PW 확인 후 새 PW 설정 |

### 2-10. 관리자 기능 (FR-ADM)

| ID | 기능 | 설명 |
|----|------|------|
| FR-ADM01 | 전체 공지 | 서버 전체 접속 유저에게 공지 브로드캐스트 |
| FR-ADM02 | 유저 강제 로그아웃 | 특정 유저 강제 접속 해제 |
| FR-ADM03 | 서버 상태 조회 | 접속 인원 · 활성 채팅방 수 · DB 레코드 수 등 통계 |
| FR-ADM04 | 유저 목록 조회 | 전체 가입 유저 목록 (온/오프라인 포함) |
| FR-ADM05 | 채팅방 강제 삭제 | 특정 채팅방 강제 종료 및 삭제 |

---

## 3. 시스템 요구사항

### 3-1. 지원 플랫폼

| 구분 | Linux (glibc) | Windows (MinGW-w64) | macOS (Darwin) |
|------|:---:|:---:|:---:|
| 서버 | ✅ | ✅ | ✅ |
| 클라이언트 | ✅ | ✅ | ✅ |
| 컴파일러 | gcc 9+ / clang 10+ | mingw-w64 gcc 8+ | Apple clang 13+ |
| C 표준 | C11 | C11 | C11 |
| 스레드 | `pthread` | `pthread-win32` | `pthread` |
| 소켓 | `<sys/socket.h>` | `<winsock2.h>` + `ws2_32` | `<sys/socket.h>` |

### 3-2. 최소 사양 (클라이언트)

| 항목 | 최솟값 |
|------|--------|
| CPU | 듀얼코어 1.6GHz |
| RAM | 2GB (OS 포함) — 클라이언트 자체 ≤20MB 상주 |
| 터미널 | 80열 × 24행 |
| 네트워크 | 1Mbps |

> 서버는 MySQL 제외 **100MB 이하** 상주 (NFR-05).

### 3-3. 의존성

| 의존성 | 버전 | 용도 |
|--------|------|------|
| MySQL | 5.7+ / 8.x | 영속 저장 |
| libmysqlclient (C API) | MySQL 번들 | 서버측 DB 접근 |
| pthread | OS 번들 | 멀티스레딩 |
| C11 런타임 | - | 공통 |

---

## 4. 빠른 시작

### 4-1. 의존성 설치

**Ubuntu / Debian**
```bash
sudo apt install build-essential libmysqlclient-dev
```

**macOS (Homebrew)**
```bash
brew install mysql-client
```

**Windows (MSYS2)**
```bash
pacman -S mingw-w64-x86_64-gcc mingw-w64-x86_64-mysql-connector-c
```

### 4-2. 데이터베이스 초기화

```bash
# MySQL 서버에 접속하여 스키마 생성
mysql -u root -p < sql/schema.sql
```

> `sql/schema.sql`에 테이블 DDL과 초기 `admin` 계정 시드가 포함되어 있습니다.  
> **⚠ 배포 전 반드시 `admin` 계정의 기본 비밀번호를 변경하세요.**

### 4-3. 빌드

```bash
# 서버 + 클라이언트 전체 빌드
make

# 개별 빌드
make server    # server/chat_server
make client    # client/chat_client

# 디버그 빌드 (AddressSanitizer 포함, Linux/macOS)
make DEBUG=1

# 정리
make clean
```

### 4-4. 실행

```bash
# 서버 실행 (기본 포트 8080)
./server/chat_server

# 포트 지정
./server/chat_server 9090

# 클라이언트 실행 (기본: localhost:8080)
./client/chat_client

# 호스트·포트 지정
./client/chat_client 192.168.1.10 9090
```

### 4-5. 접속 예시

```
╔══════════════════════════════╗
║     C Chat  v2.0             ║
╠══════════════════════════════╣
║  1. 로그인                   ║
║  2. 회원가입                 ║
║  0. 종료                     ║
╚══════════════════════════════╝
```

---

## 5. 시스템 아키텍처

### 5-1. 전체 구성도

```
┌──────────────────────────────────────────────────────────┐
│                        SERVER                            │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Accept    │  │  Router      │  │  Broadcast       │ │
│  │  Thread    │→ │  (per client │→ │  Manager         │ │
│  │            │  │   thread)    │  │  (session array  │ │
│  └────────────┘  └──────────────┘  │   + mutex)       │ │
│                        │           └──────────────────┘ │
│  ┌─────────────────────▼──────────────────────────────┐ │
│  │           In-Memory Session Store                  │ │
│  │  ClientSession[MAX_CLIENTS] — 접속 중인 유저만     │ │
│  └─────────────────────┬──────────────────────────────┘ │
│                        │ SQL (Prepared Statement)        │
│  ┌─────────────────────▼──────────────────────────────┐ │
│  │                MySQL (chat_db)                     │ │
│  │  users | rooms | room_members | messages           │ │
│  │  friends | dm_reads | reactions | user_settings    │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
               ▲  TCP Socket  ▼
┌──────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│  ┌──────────────┐         ┌──────────────────────────┐  │
│  │  Input Loop  │         │  Receive Thread          │  │
│  │  (raw tty,   │         │  (socket → event queue)  │  │
│  │   char-read) │         │                          │  │
│  └──────────────┘         └──────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐    │
│  │  TUI Renderer — ANSI 색상, 박스 드로잉            │    │
│  │  Screen: LOGIN | MAIN | CHAT | MYPAGE | SETTINGS  │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 5-2. 서버 스레딩 모델

서버는 **Thread-per-client** 모델을 채택합니다. 최대 100 동시 접속(NFR-01)에서 충분히 가벼운 구조입니다.

```
Main Thread (listen + accept)
    │
    ├──pthread_create──▶ Handler Thread #1  ──▶ MySQL Connection #1
    ├──pthread_create──▶ Handler Thread #2  ──▶ MySQL Connection #2
    └──pthread_create──▶ Handler Thread #N  ──▶ MySQL Connection #N
                              │
                    ┌─────────▼──────────┐
                    │  g_sessions[]      │  (공유 상태)
                    │  g_sessions_mutex  │
                    └────────────────────┘
```

**핵심 규칙**
- 핸들러는 `pthread_detach`로 분리 — join하지 않음
- 각 핸들러는 전용 `MYSQL*`을 시작 시 `mysql_init + mysql_real_connect`로 획득, 종료 시 `mysql_close`
- **mutex 잠금 중 `send()` / DB 호출 금지** — 블로킹 시 전체 정지 위험
- 브로드캐스트: mutex 획득 → fd 목록 스냅샷 복사 → unlock → 스냅샷으로 send

### 5-3. 클라이언트 스레드 구조

| 스레드 | 역할 |
|--------|------|
| Main (UI) | 입력 읽기, 렌더, 화면 전환 |
| Recv | 소켓 → 이벤트 큐 수신 |

`send()`는 UI·Recv 양쪽에서 호출될 수 있으므로 `tx_mutex`로 보호합니다.

### 5-4. 시그널 처리

| 시그널 | 서버 | 클라이언트 |
|--------|------|-----------|
| `SIGPIPE` | `SIG_IGN` | `SIG_IGN` |
| `SIGINT` / `SIGTERM` | 플래그 set → accept 중단 → 모든 세션 close → exit | 소켓 close → raw-mode off → exit |
| `SIGWINCH` | — | 화면 크기 재조회 후 재렌더 |

---

## 6. 프로젝트 구조

```
C_ChatProgram/
├── server/
│   ├── main.c              # 서버 진입점, accept loop
│   ├── config.h            # DB 접속 정보, 포트, MAX_CLIENTS 상수
│   ├── globals.h / .c      # g_sessions[], g_sessions_mutex 선언·정의
│   ├── client_handler.c/h  # 클라이언트별 스레드
│   ├── router.c / router.h # 패킷 타입별 핸들러 라우팅
│   ├── db.c / db.h         # MySQL 연결 래퍼, 쿼리 헬퍼
│   ├── auth.c / auth.h     # 회원가입, 로그인
│   ├── user_store.c/h      # 유저·설정 CRUD
│   ├── friend.c / friend.h # 친구 요청/수락/차단
│   ├── room.c / room.h     # 채팅방 생성/참여/관리
│   ├── dm.c / dm.h         # 1:1 DM 처리
│   ├── message.c / .h      # 메시지 저장·삭제·수정·검색·리액션
│   ├── broadcast.c / .h    # 룸 브로드캐스트, 알림 전송
│   └── admin.c / admin.h   # 관리자 명령 처리
│
├── client/
│   ├── main.c              # 클라이언트 진입점, 화면 라우팅
│   ├── state.h / state.c   # 전역 클라이언트 상태 (소켓, 현재 화면, 설정)
│   ├── net.c / net.h       # 소켓 연결, recv 스레드, send 함수
│   ├── ui.c / ui.h         # ANSI 색상 매크로, 박스 드로잉 헬퍼
│   ├── console.h           # 플랫폼별 raw-mode / getch 추상화
│   ├── input.c / input.h   # 슬래시 커맨드 파서, char-by-char 입력 루프
│   ├── notify.c / notify.h # 알림 배너 큐, 출력 처리
│   ├── screen_login.c/h    # 로그인·회원가입 화면
│   ├── screen_main.c/h     # 메인(친구·채팅 목록) 화면
│   ├── screen_chat.c/h     # 채팅방 화면
│   ├── screen_mypage.c/h   # 마이페이지 화면
│   └── screen_settings.c/h # 설정 화면
│
├── common/
│   ├── protocol.h          # 패킷 타입 상수, 구분자, 응답 코드
│   ├── types.h             # 공통 구조체 (UserSettings 등 클라이언트용)
│   └── utils.c / utils.h   # 타임스탬프, 이모티콘 변환, 문자열 유틸
│
├── sql/
│   └── schema.sql          # DB 생성·테이블 DDL, 관리자 계정 초기 데이터
│
├── docs/                   # 설계 문서 (10개 섹션)
├── Makefile                # Linux · macOS · MinGW 통합 빌드
├── requirements.md         # 요구사항 명세 v2.0.0
└── README.md               # 이 문서
```

### 6-1. 레이어 역할

| 레이어 | 디렉터리 | 책임 | 의존 |
|--------|----------|------|------|
| 공통 | `common/` | 패킷 타입 상수 · 공용 구조체 · 유틸리티 · 플랫폼 소켓 호환 | 표준 C, 플랫폼 네트워크 헤더 |
| 서버 | `server/` | TCP listen · 멀티스레드 핸들러 · 기능 처리 · MySQL 접근 | `common/`, pthread, libmysqlclient |
| 클라이언트 | `client/` | 콘솔 TUI · send/recv 스레드 · 슬래시 커맨드 | `common/`, pthread |
| DB 스키마 | `sql/` | 초기화 SQL | (없음) |

---

## 7. 패킷 프로토콜

### 7-1. 기본 형식

```
<TYPE>|<PAYLOAD>\n
```

| 구성 요소 | 값 | 설명 |
|-----------|-----|------|
| 필드 구분자 | `\|` | TYPE과 PAYLOAD, PAYLOAD 내 필드 간 구분 |
| 다중값 구분자 | `:` | 단일 필드 내 복수 값 |
| 리스트 구분자 | `;` | 목록 항목 간 구분 |
| 종단 문자 | `\n` | 패킷 끝 |
| 최대 길이 | **2048 bytes** | 엄격 준수 |

### 7-2. 인증 패킷

```
# 로그인
C→S  LOGIN_REQ|<id>:<pass>
S→C  LOGIN_RES|<code>:<message>
     # code: 0=OK, 1=WRONG_ID, 2=WRONG_PW, 3=ALREADY_ONLINE

# 회원가입
C→S  REGISTER_REQ|<id>:<pass>:<nick>:<status>
S→C  REGISTER_RES|<code>
     # code: 0=OK, 1=DUPLICATE_ID

# 로그아웃
C→S  LOGOUT_REQ|
S→C  LOGOUT_RES|OK
```

### 7-3. 친구 패킷

```
C→S  FRIEND_ADD_REQ|<target_id>
S→C  FRIEND_ADD_RES|<code>        # 0=SENT, 1=NOT_FOUND, 2=BLOCKED, 3=ALREADY_FRIEND
S→C  FRIEND_REQUEST_NOTIFY|<from_id>:<from_nick>

C→S  FRIEND_ACCEPT|<from_id>
C→S  FRIEND_REJECT|<from_id>
C→S  FRIEND_DELETE|<target_id>
C→S  FRIEND_BLOCK|<target_id>

C→S  FRIEND_LIST_REQ|
S→C  FRIEND_LIST_RES|<id>:<nick>:<status>:<status_msg>;<id>:...

S→C  FRIEND_STATUS_CHANGE|<id>:<nick>:<status>   # 친구 접속/해제 실시간 알림

C→S  USER_SEARCH|<keyword>
S→C  USER_SEARCH_RES|<id>:<nick>:<status_msg>;<id>:...
```

### 7-4. DM 패킷

```
C→S  DM_SEND|<to_id>:<content>
S→C  DM_RECV|<from_id>:<from_nick>:<content>:<timestamp>:<msg_id>
S→C  DM_READ_NOTIFY|<from_id>
C→S  DM_HISTORY_REQ|<with_id>:<count>
S→C  DM_HISTORY_RES|<msg_id>:<from_id>:<content>:<timestamp>:<read>|...
```

### 7-5. 채팅방 패킷

```
C→S  ROOM_CREATE|<name>:<max_users>:<is_open>:<password>:<topic>
S→C  ROOM_CREATE_RES|<code>:<room_id>

C→S  ROOM_LIST_REQ|<type>               # type: group | open
S→C  ROOM_LIST_RES|<id>:<name>:<cur>:<max>:<topic>:<has_pw>;<id>:...

C→S  ROOM_JOIN|<room_id>:<password>
S→C  ROOM_JOIN_RES|<code>:<room_id>:<room_name>

C→S  ROOM_MSG|<room_id>:<content>
S→C  ROOM_MSG_RECV|<room_id>:<from_nick>:<content>:<timestamp>:<msg_id>:<reply_to_id>:<reply_preview>

C→S  ROOM_LEAVE|<room_id>
C→S  ROOM_INVITE|<room_id>:<target_id>
C→S  ROOM_KICK|<room_id>:<target_id>    # 방장/관리자 전용
C→S  ROOM_SET_NOTICE|<room_id>:<notice> # 방장/관리자 전용
C→S  ROOM_GRANT_ADMIN|<room_id>:<target_id>   # 방장 전용
C→S  ROOM_REVOKE_ADMIN|<room_id>:<target_id>  # 방장 전용
C→S  ROOM_MEMBERS_REQ|<room_id>
S→C  ROOM_MEMBERS_RES|<room_id>|<id>:<nick>:<is_admin>:<online>;<id>:...
```

### 7-6. 메시지 부가기능 패킷

```
C→S  WHISPER|<to_nick>:<content>
S→C  WHISPER_RECV|<from_nick>:<content>:<timestamp>

C→S  MSG_DELETE|<room_id>:<msg_id>
S→C  MSG_DELETED_NOTIFY|<room_id>:<msg_id>

C→S  MSG_EDIT|<room_id>:<msg_id>:<new_content>
S→C  MSG_EDITED_NOTIFY|<room_id>:<msg_id>:<new_content>

C→S  MSG_REPLY|<room_id>:<reply_to_id>:<content>

C→S  MSG_REACT|<room_id>:<msg_id>:<emoji>    # 이미 반응했으면 토글(취소)
S→C  MSG_REACT_NOTIFY|<room_id>:<msg_id>:<emoji>:<count>:<user_list>

C→S  MSG_SEARCH|<room_id>:<keyword>
S→C  MSG_SEARCH_RES|<msg_id>:<from_nick>:<content>:<timestamp>|...

C→S  MSG_PIN|<room_id>:<msg_id>              # 방장/관리자 전용
S→C  MSG_PIN_NOTIFY|<room_id>:<msg_id>:<from_nick>:<content_preview>
```

### 7-7. 알림 및 기타 패킷

```
# 알림 (서버 → 클라이언트)
S→C  NOTIFY|<type>:<content>
     # type: MENTION | FRIEND_REQ | SERVER | DM | REACTION

# 타이핑 인디케이터
C→S  TYPING_START|<room_id>
C→S  TYPING_STOP|<room_id>
S→C  TYPING_NOTIFY|<room_id>:<nick>:<is_typing>   # 0 or 1

# 관리자
C→S  ADMIN_CMD|<cmd>:<args>
     # cmd: broadcast, kick_user, server_stat, user_list, delete_room
S→C  ADMIN_RES|<code>:<data>

# 연결 유지
C→S  PING|
S→C  PONG|
```

---

## 8. 데이터베이스

### 8-1. ER 다이어그램

```
users ──────────────────────────── user_settings (1:1)
  │
  ├── friends (user_id / friend_id)
  ├── rooms (owner_id)
  ├── room_members ────── rooms
  ├── messages (from_id) ─────── rooms (group/open)
  │    ├── dm_reads ─────── users (reader_id)
  │    ├── reactions ─────── users
  │    └── messages (reply_to, self-reference)
  └── reactions
```

### 8-2. 테이블 스키마

**users** — 유저 기본 정보

```sql
CREATE TABLE users (
    id            VARCHAR(20)  PRIMARY KEY,
    password_hash VARCHAR(64)  NOT NULL,       -- SHA2(pass, 256)
    nickname      VARCHAR(20)  NOT NULL,
    status_msg    VARCHAR(100) DEFAULT '',
    online_status TINYINT      DEFAULT 0,      -- 0=offline, 1=online, 2=busy
    dnd           TINYINT      DEFAULT 0,
    is_admin      TINYINT      DEFAULT 0,
    last_seen     DATETIME     DEFAULT NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
);
```

**user_settings** — 커스터마이징 설정

```sql
CREATE TABLE user_settings (
    user_id   VARCHAR(20) PRIMARY KEY,
    msg_color VARCHAR(15) DEFAULT 'cyan',
    nick_color VARCHAR(15) DEFAULT 'yellow',
    theme     VARCHAR(10) DEFAULT 'dark',
    ts_format TINYINT     DEFAULT 0,           -- 0=HH:MM, 1=HH:MM:SS, 2=MM-DD HH:MM
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**friends** — 친구 관계

```sql
CREATE TABLE friends (
    id        INT         AUTO_INCREMENT PRIMARY KEY,
    user_id   VARCHAR(20) NOT NULL,
    friend_id VARCHAR(20) NOT NULL,
    status    TINYINT     DEFAULT 0,           -- 0=pending, 1=accepted, 2=blocked
    created_at DATETIME   DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_pair (user_id, friend_id),
    FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);
```

> 양방향 친구 관계는 accepted 시 `(A,B)`, `(B,A)` 두 레코드로 표현합니다.

**rooms** — 채팅방

```sql
CREATE TABLE rooms (
    id            INT          AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(30)  NOT NULL,
    topic         VARCHAR(100) DEFAULT '',
    password_hash VARCHAR(64)  DEFAULT '',     -- 빈 문자열 = 공개
    max_users     INT          DEFAULT 30,
    owner_id      VARCHAR(20)  NOT NULL,
    notice        VARCHAR(255) DEFAULT '',
    is_open       TINYINT      DEFAULT 0,      -- 0=그룹(초대), 1=오픈채팅
    pinned_msg_id INT          DEFAULT NULL,   -- 앱 레벨 정합성 관리
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**room_members** — 채팅방 멤버십

```sql
CREATE TABLE room_members (
    room_id   INT         NOT NULL,
    user_id   VARCHAR(20) NOT NULL,
    open_nick VARCHAR(20) DEFAULT '',          -- 오픈채팅 전용 닉네임
    is_admin  TINYINT     DEFAULT 0,
    is_muted  TINYINT     DEFAULT 0,           -- 방 알림 무음
    joined_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)   ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)   ON DELETE CASCADE
);
```

**messages** — 메시지

```sql
CREATE TABLE messages (
    id         INT         AUTO_INCREMENT PRIMARY KEY,
    room_id    INT         DEFAULT NULL,       -- NULL이면 DM
    from_id    VARCHAR(20) NOT NULL,
    to_id      VARCHAR(20) DEFAULT NULL,       -- DM 수신자
    content    VARCHAR(500) NOT NULL,
    reply_to   INT         DEFAULT NULL,       -- 답장 원본 msg_id
    msg_type   TINYINT     DEFAULT 0,          -- 0=normal, 1=system, 2=whisper, 3=me-action
    is_deleted TINYINT     DEFAULT 0,
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    edited_at  DATETIME    DEFAULT NULL,
    FOREIGN KEY (from_id)  REFERENCES users(id),
    FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL
);
```

**dm_reads** — DM 읽음 상태

```sql
CREATE TABLE dm_reads (
    msg_id    INT         NOT NULL,
    reader_id VARCHAR(20) NOT NULL,
    read_at   DATETIME    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (msg_id, reader_id),
    FOREIGN KEY (msg_id)    REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (reader_id) REFERENCES users(id)    ON DELETE CASCADE
);
```

**reactions** — 메시지 리액션

```sql
CREATE TABLE reactions (
    id         INT         AUTO_INCREMENT PRIMARY KEY,
    msg_id     INT         NOT NULL,
    user_id    VARCHAR(20) NOT NULL,
    emoji      VARCHAR(20) NOT NULL,
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_reaction (msg_id, user_id, emoji),
    FOREIGN KEY (msg_id)   REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)    ON DELETE CASCADE
);
```

### 8-3. 서버 인메모리 세션 구조체

```c
/* 접속 중인 클라이언트 세션 (DB에 저장하지 않음) */
typedef struct {
    int       fd;
    char      user_id[21];
    char      nickname[21];
    int       online_status;    /* 0=offline, 1=online, 2=busy */
    int       dnd;
    int       current_room_id;  /* 0 = 채팅방 밖 */
    int       muted_rooms[32];  /* 알림 무음 room_id 목록 */
    int       muted_count;
    int       is_admin;
    int       active;           /* 1 = 유효한 세션 */
    MYSQL    *db;               /* 스레드 전용 MySQL 연결 */
    pthread_t tid;
} ClientSession;

extern ClientSession  g_sessions[MAX_CLIENTS]; /* 전역, mutex 보호 */
extern pthread_mutex_t g_sessions_mutex;
```

---

## 9. TUI 화면 구성

### 9-1. 로그인 화면

```
╔══════════════════════════════╗
║     C Chat  v2.0             ║
╠══════════════════════════════╣
║  1. 로그인                   ║
║  2. 회원가입                 ║
║  0. 종료                     ║
╚══════════════════════════════╝
```

### 9-2. 메인 화면 (탭 구조)

```
╔══════════════════════════════════════════════╗
║  [친구목록] [채팅] [오픈채팅] [마이페이지]   ║
╠══════════════════════════════════════════════╣
║  친구 목록 (3/5 온라인)                      ║
║  ──────────────────────────────────          ║
║  [ON]  홍길동    — 오늘도 화이팅             ║
║  [ON]  김철수    — 점심 뭐 먹지              ║
║  [바쁨] 이영희   — 공부중                    ║
║  [OFF] 박민준   (마지막 접속: 2시간 전)      ║
╠══════════════════════════════════════════════╣
║  > 명령 입력 (/help 도움말)                  ║
╚══════════════════════════════════════════════╝
```

### 9-3. 채팅 화면

```
╔══════════════════════════════════════════════╗
║  # 컴공 스터디그룹  (12/30명)  [공지: 과제!] ║
║  📌 핀: "오늘 자정까지 제출"                ║
╠══════════════════════════════════════════════╣
║  [14:02] 홍길동: 과제 다들 했어?            ║
║  [14:03]  ↩ 홍길동에게: ㄴㄴ 지금 시작...   ║
║  [14:03] 시스템: 이영희 님이 입장했습니다.  ║
║  [14:04] 이영희: 안녕하세요!                ║
║          👍 2  ❤ 1                          ║
║  [14:05] @이영희 홍길동: 방금 입장했군요    ║
║  [14:06] 나(홍길동): 반가워요      [읽음]   ║
║  홍길동 님이 입력 중...                      ║
╠══════════════════════════════════════════════╣
║  > 메시지 입력 (/help 명령어 목록)           ║
╚══════════════════════════════════════════════╝
```

### 9-4. 마이페이지 화면

```
╔══════════════════════════════════════════════╗
║  ★ 마이페이지                               ║
╠══════════════════════════════════════════════╣
║  ID       : hong123                          ║
║  닉네임   : 홍길동                           ║
║  상태     : [ON] 오늘도 화이팅               ║
║  가입일   : 2026-01-15                       ║
║  마지막   : 방금 전                          ║
║  ──────────────────────────────────          ║
║  총 메시지: 1,243 개                         ║
║  참여 방  : 5 개                             ║
║  친구 수  : 12 명                            ║
╠══════════════════════════════════════════════╣
║  1. 프로필 수정   2. 비밀번호 변경           ║
║  3. 설정          0. 돌아가기                ║
╚══════════════════════════════════════════════╝
```

### 9-5. 설정 화면

```
╔══════════════════════════════════════════════╗
║  ⚙  설정                                    ║
╠══════════════════════════════════════════════╣
║  1. 내 메시지 색상  : [cyan   ] ▶            ║
║  2. 닉네임 색상     : [yellow ] ▶            ║
║  3. 테마            : [dark   ] ▶            ║
║  4. 타임스탬프 형식 : [HH:MM  ] ▶            ║
║  5. DND 모드        : [OFF    ] ▶            ║
║  0. 돌아가기                                 ║
╚══════════════════════════════════════════════╝
```

---

## 10. 슬래시 커맨드

모든 명령은 `/`로 시작하며 대소문자를 구분하지 않습니다.

### 10-1. 채팅방 내 명령어

| 명령어 | 권한 | 설명 |
|--------|------|------|
| `/help` | 모두 | 현재 화면 사용 가능 명령어 목록 출력 |
| `/w <닉네임> <내용>` | 멤버 | 귓속말 전송 |
| `/del <msg_id>` | 본인/관리자 | 메시지 삭제 (`삭제된 메시지` 표시) |
| `/edit <msg_id> <내용>` | 본인 | 메시지 수정 (5분 이내, `(수정됨)` 표시) |
| `/reply <msg_id> <내용>` | 멤버 | 특정 메시지에 답장 |
| `/react <msg_id> <이모지>` | 멤버 | 메시지 리액션 추가/취소 (토글) |
| `/pin <msg_id>` | 방장/방 관리자 | 방 상단에 메시지 고정 (`msg_id=0`으로 해제) |
| `/search <키워드>` | 멤버 | 현재 방 메시지 전문 검색 |
| `/invite <id>` | 멤버 | 현재 방에 친구 초대 |
| `/kick <닉네임>` | 방장/방 관리자 | 멤버 강퇴 |
| `/notice <내용>` | 방장/방 관리자 | 공지 등록 (빈 문자열로 해제) |
| `/grant <닉네임>` | 방장 | 공동 방장 권한 부여 |
| `/revoke <닉네임>` | 방장 | 공동 방장 권한 해제 |
| `/members` | 멤버 | 현재 방 멤버 목록 및 온라인 상태 조회 |
| `/mute` | 멤버 | 현재 방 알림 무음 토글 |
| `/leave` | 멤버 | 채팅방 나가기 |
| `/me <동작>` | 멤버 | 액션 메시지 전송 (예: `* 홍길동 손을 흔든다`) |
| `/open_nick <닉네임>` | 멤버 | 오픈채팅방 전용 닉네임 설정 |

### 10-2. 메인 화면 명령어

| 명령어 | 설명 |
|--------|------|
| `/friend add <id>` | 친구 추가 요청 |
| `/friend list` | 친구 목록 조회 |
| `/friend accept <id>` | 친구 요청 수락 |
| `/friend reject <id>` | 친구 요청 거절 |
| `/friend del <id>` | 친구 삭제 |
| `/friend block <id>` | 친구 차단 |
| `/find <keyword>` | 유저/닉네임 검색 |
| `/rooms [open\|group]` | 채팅방 목록 조회 |
| `/room create <name>` | 그룹 채팅방 생성 |
| `/open create <name>` | 오픈채팅방 생성 |
| `/room search <키워드>` | 채팅방 이름/주제 검색 |
| `/join <room_id> [pw]` | 채팅방 참여 |
| `/dm <id>` | 1:1 DM 시작 |

### 10-3. 전역 명령어

| 명령어 | 설명 |
|--------|------|
| `/status <online\|busy\|invisible>` | 내 온라인 상태 변경 |
| `/dnd` | DND 모드 토글 (멘션은 항상 수신) |
| `/mypage` | 마이페이지 화면으로 이동 |
| `/settings` | 설정 화면으로 이동 |
| `/profile <닉네임> <상태메시지>` | 프로필 수정 |
| `/admin <sub> <args>` | 관리자 명령 (`broadcast`/`kick`/`stat`/`users`/`delroom`) |
| `/quit` | 로그아웃 및 종료 |

---

## 11. 보안

### 11-1. 비밀번호 저장

- 알고리즘: **SHA-256** (`MySQL SHA2(pass, 256)`)
- 저장 컬럼: `users.password_hash VARCHAR(64)`
- 평문은 어디에도 저장되지 않으며 로그에도 기록하지 않음 (`***` 마스킹)
- v2.0 한계: salt 없음 (v2.1에서 per-user salt 도입 예정)

### 11-2. SQL Injection 방지

- **모든** DB 접근은 MySQL Prepared Statement 사용 — 직접 문자열 연결 금지

### 11-3. 권한 검사

- 모든 서버 핸들러는 페이로드의 `from_id`를 신뢰하지 않고 **세션의 `user_id`** 기준으로만 처리
- 방장/관리자 전용 기능은 세션 + DB 기준으로 권한 재검사

### 11-4. 알려진 제한사항 (공식 명시)

| 항목 | 현황 | 개선 계획 |
|------|------|-----------|
| 전송 암호화 | 평문 TCP (로컬/신뢰망 전용) | v2.1에서 TLS 도입 |
| 비밀번호 salt | 없음 (rainbow table 취약) | v2.1에서 per-user salt |
| IP 속도 제한 | 미구현 | P4 후보 |
| 로그인 시도 제한 | 5회 실패 시 소켓 close | - |

### 11-5. 배포 체크리스트

- [ ] 시드 `admin` 계정 비밀번호를 강한 것으로 즉시 변경
- [ ] MySQL root 계정 대신 전용 사용자(`chat_app@localhost`, 필요 권한만) 사용
- [ ] 방화벽에서 서버 포트(기본 8080) 외부 노출 제한
- [ ] `sql/schema.sql` 외 개발 덤프 유출 주의

---

## 12. 비기능 요구사항

| ID | 항목 | 목표 | 구현 전략 |
|----|------|------|-----------|
| NFR-01 | 동시 접속 | ≤100 | `MAX_CLIENTS=128` 정적 세션 배열, accept 초과 시 `SERVER_FULL` 응답 |
| NFR-02 | 응답 지연 | ≤50ms (로컬) | 브로드캐스트 → DB 저장 순서 유지, 논블로킹 `send` |
| NFR-03 | 안정성 | 크래시 없음 | `SIGPIPE` 무시, recv 0/에러 시 세션만 정리, 스레드 detach |
| NFR-04 | 보안 | SHA-256 해시 | MySQL `SHA2()`, 평문 전송은 로컬 환경 한정 |
| NFR-05 | 경량성 | 서버 ≤100MB | 정적 세션 배열, 메시지 히스토리는 DB에 위임 |
| NFR-06 | 이식성 | Linux · Windows · macOS | 플랫폼 분기를 `console.h`와 `net_compat.h`에 집중 |
| NFR-07 | 확장성 | GUI 레이어 교체 가능 | `net` 계층과 `ui` 계층 분리, `net`은 화면을 알지 못함 |
| NFR-08 | 영속성 | 재시작 후 데이터 유지 | 세션 외 모든 상태를 MySQL에 영속 저장 |
| NFR-09 | 스레드 안전 | mutex 보호 | 세션 배열 `g_sessions_mutex`, DB 연결 스레드 전용 |

---

## 13. 개발 로드맵

### P0 — 최소 동작 (MVP)

> **완료 기준**: 서버 실행 → 2 클라이언트 동시 접속 → 같은 방에서 메시지 교환

- 빌드 시스템 (Makefile, Linux/macOS/Windows)
- `common/` 레이어: `protocol.h`, `types.h`, `utils.c`
- 서버 accept + thread-per-client 뼈대
- 클라이언트 send/recv thread + 기본 TUI (raw 모드)
- DB 스키마 적용, `db_connect` / Prepared Statement 헬퍼
- **FR-A01, A02, A03** 회원가입·로그인·로그아웃
- **FR-G01, G03** 그룹방 생성·일반 메시지 전송
- `PING/PONG`, 기본 `SYSTEM_NOTIFY`

### P1 — 카카오톡급 기본

- **친구**: FR-F01~F04, F07 (추가·수락/거절·목록·검색)
- **DM**: FR-D01~D04 + `dm_reads` 읽음 처리
- **방 관리**: FR-G02, G05~G08 (멤버 초대·퇴장·강퇴·비밀번호)
- **메시지**: FR-M02 답장, FR-M03 수정, FR-M04 삭제, 히스토리
- **알림**: FR-N01~N03 (새 메시지·DM·친구 요청 배너)
- **설정**: FR-C01~C04 (테마·메시지/닉네임 색상·타임스탬프)
- **마이페이지**: FR-P01~P03

### P2 — 편의 기능

- **오픈채팅**: FR-O01~O05
- **귓속말·me 액션**: FR-M01, FR-M11
- **메시지 검색**: FR-M08
- **리액션**: FR-M05
- **방 공지·핀**: FR-G08, FR-M10
- **타이핑 인디케이터**: FR-N05

### P3 — 관리자 및 고급

- **관리자 기능**: FR-ADM01~ADM05
- **친구 차단/해제**: FR-F05, F06
- **온라인 상태 변경**: FR-C06 (online/busy/invisible)
- **DND 완전 적용**: TYPING/NOTIFY 필터링

### P4 — v2.1 후보 (Out-of-scope)

- BAN 테이블, rate-limit, FULLTEXT 검색
- 세션별 Prepared Statement 캐시
- DM 다중행 메시지
- GUI 클라이언트
- TLS 암호화 전송
- 자동 재접속 시 인증 복원 (토큰)

---

## 14. 설계 문서

`docs/` 디렉터리에 10개 섹션으로 구성된 상세 설계 문서가 있습니다.

| # | 섹션 | 내용 |
|---|------|------|
| 01 | [overview](./docs/01_overview/) | 프로젝트 목적, 타깃 플랫폼, NFR, 용어집 |
| 02 | [features](./docs/02_features/) | 기능 요구사항(FR) 상세 |
| 03 | [architecture](./docs/03_architecture/) | 시스템 구성, 스레딩, 데이터 흐름, 빌드 이식성 |
| 04 | [file_structure](./docs/04_file_structure/) | 소스 트리, 모듈 책임, 네이밍 규약 |
| 05 | [security](./docs/05_security/) | 인증, 검증, 권한, 위협 모델 (STRIDE) |
| 06 | [ui_ux](./docs/06_ui_ux/) | 화면·명령어·테마·렌더링 전략 |
| 07 | [database](./docs/07_database/) | 스키마, 쿼리 카탈로그, 연결 관리 |
| 08 | [api](./docs/08_api/) | 패킷 프로토콜 전체 명세, 시퀀스 다이어그램 |
| 09 | [exception](./docs/09_exception/) | 예외 분류·처리·엣지 케이스·로깅 |
| 10 | [todo_list](./docs/10_todo_list/) | 단계별 로드맵, 수용 기준, 리스크 |

**읽는 순서 추천**
- 처음 보는 사람: `01 → 02 → 03 → 06 → 07 → 08 → 05 → 09 → 04 → 10`
- 구현자: `04 → 08 → 07 → 03 → 09`
- 리뷰어: `01 → 10 → 02 → 05 → 09`

---

> **요구사항 기준**: [`requirements.md`](./requirements.md) v2.0.0  
> **설계 문서 기준**: [`docs/`](./docs/) v2.0.0-design.1
