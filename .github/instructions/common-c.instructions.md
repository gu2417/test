---
applyTo: "chat_program/src/common/**/*.c,chat_program/src/common/**/*.h"
---

# 공통 모듈 코드 작성 지침

## 파일별 역할 엄수

| 파일 | 허용 내용 | 금지 |
|------|----------|------|
| `protocol.h` | 패킷 TYPE 상수, 구분자 매크로, 크기 상수 | 함수 정의, 구조체 |
| `types.h` | 공유 구조체 (User, ChatRoom, Message) | 로직, 전역 변수 |
| `utils.c/h` | timestamp, 문자열 헬퍼, safe_strncpy | 네트워크, DB |
| `net_compat.h` | 플랫폼 소켓 헤더 ifdef | 로직 |

## protocol.h 패킷 상수 명명 규칙

```c
// PKT_C_* = Client → Server, PKT_S_* = Server → Client
#define PKT_C_LOGIN      "LOGIN"
#define PKT_S_LOGIN_OK   "LOGIN_OK"
#define PKT_S_ERROR      "ERROR"
#define MAX_PACKET_SIZE  2048
#define FIELD_SEP        '|'
#define LIST_SEP         ';'
```

## types.h 구조체 규칙

```c
// 문자열 필드는 고정 크기 배열만 (동적 할당 금지)
typedef struct {
    char id[21];          // 최대 20자 + NUL
    char pass_hash[65];   // SHA-256 hex 64자 + NUL
    char nickname[21];
    int  socket_fd;       // -1 = 오프라인
    int  dnd;
} User;
```

## safe_strncpy 규칙

`strcpy`/`strncpy` 대신 반드시 `safe_strncpy(dest, src, dest_size)` 사용 (NUL 종료 보장).

## 헤더 가드

```c
#ifndef CHAT_COMMON_PROTOCOL_H
#define CHAT_COMMON_PROTOCOL_H
// ...
#endif /* CHAT_COMMON_PROTOCOL_H */
```

형식: `CHAT_<SUBDIR>_<FILENAME>_H`
