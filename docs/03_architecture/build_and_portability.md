# 빌드 및 이식성

## 1. Makefile 구조

최상위 `Makefile` 하나로 세 플랫폼을 모두 처리. 플랫폼 감지는 `uname -s` (Windows 는 MSYS/MinGW 쉘 기준).

```make
UNAME := $(shell uname -s 2>/dev/null || echo Windows)

CC       ?= gcc
CSTD     := -std=c11 -Wall -Wextra -Wpedantic
OPT      := -O2
INCLUDES := -Icommon
SRV_SRC  := $(wildcard server/*.c) $(wildcard common/*.c)
CLI_SRC  := $(wildcard client/*.c) $(wildcard common/*.c)

ifeq ($(UNAME),Linux)
    LDFLAGS_SRV := -lpthread -lmysqlclient
    LDFLAGS_CLI := -lpthread
endif
ifeq ($(UNAME),Darwin)
    BREW_PREFIX := $(shell brew --prefix 2>/dev/null)
    INCLUDES    += -I$(BREW_PREFIX)/opt/mysql-client/include
    LDFLAGS_SRV := -L$(BREW_PREFIX)/opt/mysql-client/lib -lpthread -lmysqlclient
    LDFLAGS_CLI := -lpthread
endif
ifneq (,$(findstring MINGW,$(UNAME))$(findstring Windows,$(UNAME)))
    LDFLAGS_SRV := -lpthread -lmysql -lws2_32
    LDFLAGS_CLI := -lpthread -lws2_32
    EXE         := .exe
endif

all: server/chat_server$(EXE) client/chat_client$(EXE)
```

## 2. 플랫폼 분기 규칙

분기는 다음 파일들로 **국한**한다:

| 위치 | 목적 |
|------|------|
| `client/console.h` + `console_posix.c` / `console_win.c` | raw-mode, getch, 콘솔 크기 |
| `common/net_compat.h` + `net_posix.c` / `net_win.c` | `socket`/`close`/`WSAStartup` 차이 |

기능 코드(auth/room/message 등)에는 `#ifdef` 가 없어야 한다.

## 3. 외부 라이브러리

| OS | 설치 명령 |
|----|-----------|
| Ubuntu/Debian | `apt install build-essential libmysqlclient-dev` |
| macOS | `brew install mysql-client` |
| Windows (MSYS2) | `pacman -S mingw-w64-x86_64-gcc mingw-w64-x86_64-mysql-connector-c` |

## 4. 산출물

| 타깃 | 경로 |
|------|------|
| 서버 | `server/chat_server` (Win: `.exe`) |
| 클라이언트 | `client/chat_client` (Win: `.exe`) |

## 5. 디버그 빌드

```bash
make DEBUG=1    # -O0 -g -fsanitize=address,undefined
```

Windows(MinGW)는 ASan 미지원 — `DEBUG=1` 시 `-O0 -g` 만 적용.

## 6. 컴파일러 경고 정책

`-Wall -Wextra -Wpedantic` 는 모든 환경에서 **경고 0개** 유지가 목표.
`-Werror` 는 CI(P4) 도입 시 활성화.
