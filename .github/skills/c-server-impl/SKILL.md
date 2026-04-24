---
name: c-server-impl
description: C Chat 서버 구현 가이드 스킬. thread-per-client 서버 패턴, Mutex 사용법, 패킷 라우팅, MySQL Prepared Statement 패턴을 제공한다. 서버 코드 작성/수정 시 사용.
---

# C Chat 서버 구현 가이드

## 서버 아키텍처

```
main() → socket/bind/listen → accept loop
    └─ pthread_create(client_handler, fd) 
            └─ client_handler() → recv loop → packet_parse() → router()
                    └─ router() → auth_handler / room_handler / dm_handler / ...
```

## 핵심 파일 역할

| 파일 | 함수 | 책임 |
|------|------|------|
| `main.c` | `main()` | listen loop, SIGPIPE 무시, thread 생성 |
| `globals.c` | `sessions_add/remove/find` | g_sessions[] + mutex 관리 |
| `client_handler.c` | `client_handler()` | recv → `\n` 프레임 분리 → router 호출 |
| `router.c` | `route_packet()` | TYPE string → 핸들러 함수 포인터 테이블 |
| `db.c` | `db_prepare/bind/execute` | MySQL 래퍼 (다른 파일이 mysql_* 직접 사용 금지) |

## 스레드 & Mutex 패턴

```c
/* globals.h */
extern Session g_sessions[MAX_CLIENTS];
extern pthread_mutex_t g_sessions_mutex;

/* ✅ 올바른 패턴 */
pthread_mutex_lock(&g_sessions_mutex);
int fd = sessions_find_fd(user_id);       // 읽기만
pthread_mutex_unlock(&g_sessions_mutex);
if (fd > 0) send(fd, msg, len, 0);        // mutex 해제 후 send

/* ❌ 금지 패턴: mutex 보유 중 send/DB */
pthread_mutex_lock(&g_sessions_mutex);
send(fd, msg, len, 0);   // 다른 스레드 데드락 위험!
```

## 패킷 파싱 & 라우팅

```c
/* packet_parse: "LOGIN|alice|hash\n" → type="LOGIN", fields=["alice","hash"], n=2 */
typedef struct {
    char type[32];
    char *fields[16];
    int   n;
} Packet;

int packet_parse(const char *line, Packet *pkt);

/* router.c 패턴 */
typedef void (*HandlerFn)(int fd, Packet *pkt);
static const struct { const char *type; HandlerFn fn; } ROUTES[] = {
    { "LOGIN",    handle_login    },
    { "REGISTER", handle_register },
    { "MSG",      handle_msg      },
    { NULL, NULL }
};
void route_packet(int fd, Packet *pkt) {
    for (int i = 0; ROUTES[i].type; i++)
        if (strcmp(pkt->type, ROUTES[i].type) == 0) { ROUTES[i].fn(fd, pkt); return; }
    send_error(fd, "UNKNOWN_PACKET");
}
```

## DB Prepared Statement 패턴

```c
/* db.h 인터페이스 */
MYSQL_STMT *db_prepare(MYSQL *conn, const char *sql);
void        db_bind_str(MYSQL_BIND *b, int idx, const char *val, size_t len);
void        db_bind_int(MYSQL_BIND *b, int idx, int val);
int         db_execute(MYSQL_STMT *stmt, MYSQL_BIND *binds);
void        db_stmt_close(MYSQL_STMT *stmt);

/* 사용 예: 로그인 검증 */
MYSQL_STMT *stmt = db_prepare(conn, "SELECT id FROM users WHERE username=? AND password_hash=?");
MYSQL_BIND  bind[2] = {0};
db_bind_str(bind, 0, username, strlen(username));
db_bind_str(bind, 1, pw_hash,  strlen(pw_hash));
db_execute(stmt, bind);
db_stmt_close(stmt);
```

## 응답 패킷 전송 헬퍼

```c
/* packet.h */
void send_ok(int fd, const char *type, const char *payload);
void send_error(int fd, const char *msg);

// 예: send_ok(fd, "LOGIN_OK", "alice|서울팀A");
// 전송: "LOGIN_OK|alice|서울팀A\n"
```

## 설계 문서

- 서버 모듈 명세: `docs/04_file_structure/server_modules.md`
- 스레딩 모델: `docs/03_architecture/threading_model.md`
- 데이터 흐름: `docs/03_architecture/data_flow.md`
