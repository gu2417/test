---
name: c-protocol
description: C Chat 패킷 프로토콜 스킬. 패킷 형식(TYPE|f1|f2\n), 전체 패킷 타입 목록, 파싱/직렬화 코드 패턴 제공. 패킷 관련 코드 작성 또는 새 기능 패킷 설계 시 사용.
---

# C Chat 패킷 프로토콜 가이드

## 기본 형식

```
TYPE|field1|field2|...\n
```

- 최대 크기: `2048` bytes
- 필드 구분: `|`
- 복합 값: `:` (예: `user_id:nickname`)
- 목록: `;` (예: `alice;bob;carol`)
- 종료: `\n`
- 인코딩: UTF-8

## 패킷 타입 전체 목록

### 인증 (Client → Server)
| TYPE | 필드 | 설명 |
|------|------|------|
| `REGISTER` | username\|password_hash\|nickname | 회원가입 |
| `LOGIN` | username\|password_hash | 로그인 |
| `LOGOUT` | user_id | 로그아웃 |
| `PASS_CHANGE` | user_id\|old_hash\|new_hash | 비밀번호 변경 |

### 인증 응답 (Server → Client)
| TYPE | 필드 | 설명 |
|------|------|------|
| `LOGIN_OK` | user_id\|nickname | 로그인 성공 |
| `REGISTER_OK` | user_id | 회원가입 성공 |
| `AUTH_FAIL` | reason | 인증 실패 |

### 채팅방 (Client → Server)
| TYPE | 필드 | 설명 |
|------|------|------|
| `ROOM_CREATE` | user_id\|room_name\|type | 방 생성 (type: group/open) |
| `ROOM_JOIN` | user_id\|room_id | 방 참가 |
| `ROOM_LEAVE` | user_id\|room_id | 방 나가기 |
| `ROOM_LIST` | user_id | 방 목록 요청 |
| `MSG` | room_id\|user_id\|content | 메시지 전송 |
| `MSG_DELETE` | msg_id\|user_id | 메시지 삭제 |

### 채팅방 응답/이벤트 (Server → Client)
| TYPE | 필드 | 설명 |
|------|------|------|
| `ROOM_OK` | room_id\|room_name | 방 생성/참가 성공 |
| `ROOM_LIST_DATA` | room_id:name:type;... | 방 목록 |
| `BROADCAST` | room_id\|sender_id\|nickname\|content | 메시지 브로드캐스트 |
| `ROOM_NOTICE` | room_id\|content | 방 공지 |

### DM (Client ↔ Server)
| TYPE | 필드 | 설명 |
|------|------|------|
| `DM` | from_id\|to_id\|content | DM 전송 |
| `DM_RECV` | from_id\|nickname\|content | DM 수신 |

### 친구 (Client → Server)
| TYPE | 필드 | 설명 |
|------|------|------|
| `FRIEND_ADD` | user_id\|target_username | 친구 요청 |
| `FRIEND_ACCEPT` | user_id\|requester_id | 친구 수락 |
| `FRIEND_BLOCK` | user_id\|target_id | 차단 |
| `FRIEND_LIST` | user_id | 친구 목록 요청 |

### 공통 에러 (Server → Client)
| TYPE | 필드 | 설명 |
|------|------|------|
| `ERROR` | code\|message | 서버 오류 |
| `SERVER_ERROR` | message | 서버 내부 오류 |

## 패킷 파싱 코드

```c
/* protocol.h 정의 */
#define MAX_PACKET_SIZE 2048
#define MAX_FIELDS      16
#define FIELD_SEP       '|'
#define LIST_SEP        ';'
#define KV_SEP          ':'
#define PKT_TERM        '\n'

typedef struct {
    char  type[32];
    char *fields[MAX_FIELDS];
    int   n;           // fields 개수 (type 제외)
    char  buf[MAX_PACKET_SIZE];  // 내부 버퍼 (fields가 여기 가리킴)
} Packet;

/* "LOGIN|alice|abc123\n" → type="LOGIN", fields=["alice","abc123"], n=2 */
int packet_parse(const char *line, Packet *pkt) {
    safe_strncpy(pkt->buf, line, sizeof(pkt->buf));
    // '\n' 제거
    char *nl = strchr(pkt->buf, '\n');
    if (nl) *nl = '\0';

    char *tok = strtok(pkt->buf, "|");
    if (!tok) return -1;
    safe_strncpy(pkt->type, tok, sizeof(pkt->type));

    pkt->n = 0;
    while ((tok = strtok(NULL, "|")) && pkt->n < MAX_FIELDS)
        pkt->fields[pkt->n++] = tok;
    return 0;
}
```

## 패킷 직렬화 코드

```c
/* 응답 패킷 전송 */
void send_packet(int fd, const char *fmt, ...) {
    char buf[MAX_PACKET_SIZE];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    // '\n' 보장
    size_t len = strlen(buf);
    if (len == 0 || buf[len-1] != '\n') {
        if (len < sizeof(buf)-1) buf[len++] = '\n';
    }
    send(fd, buf, len, 0);
}

// 사용 예:
send_packet(fd, "LOGIN_OK|%lld|%s\n", user_id, nickname);
send_packet(fd, "ERROR|AUTH_FAIL|아이디 또는 비밀번호 오류\n");
```

## 전체 패킷 명세

`docs/08_api/packet_format.md` 참고.
