---
applyTo: "chat_program/src/server/**/*.c,chat_program/src/server/**/*.h"
---

# 서버 코드 작성 지침

## 모듈별 책임 (한 파일 = 한 책임)

| 파일 | 역할 |
|------|------|
| `main.c` | listen/accept loop, SIGPIPE IGN, pthread_create |
| `globals.c/h` | g_sessions[], g_sessions_mutex 전역 상태만 |
| `client_handler.c` | recv 루프, `\n` 기준 라인 프레임 |
| `router.c` | 패킷 TYPE → 핸들러 디스패치만 (로직 없음) |
| `db.c/h` | MySQL 래퍼 — 다른 모듈이 직접 mysql_* 호출 금지 |
| `auth.c/h` | 인증 로직만 (register, login, logout, passwd) |
| `broadcast.c/h` | 팬아웃 전송만 (비즈니스 로직 없음) |

## 스레드 & Mutex 규칙

```c
// ✅ 올바른 패턴: lock → 데이터 읽기 → unlock → send
pthread_mutex_lock(&g_sessions_mutex);
int fd = sessions_find_fd(user_id);
pthread_mutex_unlock(&g_sessions_mutex);
if (fd > 0) send(fd, buf, len, 0);  // mutex 해제 후 send

// ❌ 금지: lock 보유 중 send 또는 DB 호출
pthread_mutex_lock(&g_sessions_mutex);
send(fd, buf, len, 0);  // 데드락 위험!
```

## 패킷 수신 처리 순서

1. `packet_parse()` 로 TYPE과 필드 배열 추출
2. 필드 수 검증 (`n < MIN_FIELDS` → SERVER_ERROR 반환)
3. 각 필드 길이/NULL 검증
4. 비즈니스 로직 수행
5. 응답 패킷 전송

## DB 사용 패턴

```c
// 반드시 이 패턴만 사용
MYSQL_STMT *stmt = db_prepare(conn, "SELECT id FROM users WHERE username=?");
db_bind_str(bind, 0, username, strlen(username));
db_execute(stmt, bind);
```

## 에러 처리

- 모든 `malloc` 반환값 NULL 검사
- 소켓 오류: `errno` 확인 후 연결 종료
- DB 오류: `db_last_error()` 로그 후 SERVER_ERROR 패킷 반환
- 스레드 종료 시 반드시 세션 제거 + 소켓 close
