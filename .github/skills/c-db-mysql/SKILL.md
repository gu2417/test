---
name: c-db-mysql
description: chat_db MySQL 스키마 및 C 코드에서의 Prepared Statement 사용 가이드 스킬. 테이블 구조, 쿼리 예시, db.c 래퍼 함수 패턴 제공. DB 관련 코드 작성 시 사용.
---

# chat_db MySQL 개발 가이드

## 테이블 구조 요약

```sql
-- 사용자
users (
    id           BIGINT AUTO_INCREMENT PK,
    username     VARCHAR(20) UNIQUE NOT NULL,
    password_hash CHAR(64) NOT NULL,        -- SHA-256 hex, plaintext 절대 금지
    nickname     VARCHAR(20) NOT NULL,
    is_deleted   TINYINT(1) DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 채팅방
chat_rooms (
    id      BIGINT AUTO_INCREMENT PK,
    name    VARCHAR(50) NOT NULL,
    type    ENUM('group','open') NOT NULL,
    owner_id BIGINT NOT NULL,
    is_deleted TINYINT(1) DEFAULT 0
);

-- 방 멤버
room_members (room_id BIGINT, user_id BIGINT, joined_at DATETIME, PK(room_id,user_id));

-- 메시지
messages (
    id         BIGINT AUTO_INCREMENT PK,
    room_id    BIGINT NOT NULL,
    sender_id  BIGINT NOT NULL,
    content    TEXT NOT NULL,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 1:1 DM
direct_messages (
    id          BIGINT AUTO_INCREMENT PK,
    sender_id   BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    content     TEXT NOT NULL,
    is_read     TINYINT(1) DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 친구 관계
friendships (
    requester_id BIGINT NOT NULL,
    addressee_id BIGINT NOT NULL,
    status       ENUM('pending','accepted','blocked') NOT NULL,
    PK(requester_id, addressee_id)
);
```

## C 코드에서의 DB 사용 패턴

### db.c/h 인터페이스

```c
/* db.h */
typedef struct { MYSQL *conn; } DBConn;

DBConn     *db_connect(const char *host, const char *user, const char *pass, const char *db);
void        db_disconnect(DBConn *dbc);
MYSQL_STMT *db_prepare(DBConn *dbc, const char *sql);
void        db_bind_str(MYSQL_BIND *b, int idx, const char *val, unsigned long len);
void        db_bind_int(MYSQL_BIND *b, int idx, long long val);
int         db_execute(MYSQL_STMT *stmt, MYSQL_BIND *in_binds);
int         db_fetch_row(MYSQL_STMT *stmt, MYSQL_BIND *out_binds);
void        db_stmt_close(MYSQL_STMT *stmt);
const char *db_last_error(DBConn *dbc);
```

### 로그인 쿼리 예시

```c
int auth_login(DBConn *dbc, const char *username, const char *pw_hash,
               long long *out_user_id, char *out_nickname) {
    MYSQL_STMT *stmt = db_prepare(dbc,
        "SELECT id, nickname FROM users WHERE username=? AND password_hash=? AND is_deleted=0");
    
    MYSQL_BIND in[2] = {0};
    db_bind_str(in, 0, username, strlen(username));
    db_bind_str(in, 1, pw_hash,  strlen(pw_hash));
    
    if (db_execute(stmt, in) != 0) { db_stmt_close(stmt); return -1; }
    
    long long   id_val = 0;
    char        nick[21] = {0};
    unsigned long nick_len = sizeof(nick) - 1;
    MYSQL_BIND out[2] = {0};
    db_bind_int(out, 0, id_val);          // 결과 바인드
    db_bind_str(out, 1, nick, nick_len);
    
    int found = db_fetch_row(stmt, out);
    if (found == 0) { *out_user_id = id_val; safe_strncpy(out_nickname, nick, 21); }
    db_stmt_close(stmt);
    return found;  // 0 = 성공, 1 = 미일치, -1 = 오류
}
```

### 메시지 저장 예시

```c
int msg_save(DBConn *dbc, long long room_id, long long sender_id, const char *content) {
    MYSQL_STMT *stmt = db_prepare(dbc,
        "INSERT INTO messages (room_id, sender_id, content) VALUES (?,?,?)");
    MYSQL_BIND in[3] = {0};
    db_bind_int(in, 0, room_id);
    db_bind_int(in, 1, sender_id);
    db_bind_str(in, 2, content, strlen(content));
    int r = db_execute(stmt, in);
    db_stmt_close(stmt);
    return r;
}
```

## 자주 쓰는 쿼리

```sql
-- 방 멤버 목록
SELECT u.id, u.nickname FROM room_members rm
JOIN users u ON rm.user_id = u.id
WHERE rm.room_id = ?;

-- 읽지 않은 DM 수
SELECT COUNT(*) FROM direct_messages
WHERE receiver_id = ? AND is_read = 0;

-- 소프트 삭제 (메시지 삭제)
UPDATE messages SET is_deleted = 1 WHERE id = ? AND sender_id = ?;
```

## 스키마 파일

전체 DDL: `sql/schema.sql`
실행: `mysql -u root -p chat_db < sql/schema.sql`
