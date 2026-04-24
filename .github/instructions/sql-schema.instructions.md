---
applyTo: "sql/**/*.sql"
---

# SQL / 스키마 작성 지침

## DB: `chat_db` (MySQL 8.0+)

## 테이블 명명 규칙

- snake_case 복수형: `users`, `chat_rooms`, `messages`, `friendships`
- PK: `id BIGINT AUTO_INCREMENT PRIMARY KEY`
- 타임스탬프: `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`

## 필수 보안 규칙

- **애플리케이션에서 raw mysql_query 사용 금지** — Prepared Statement만
- 비밀번호 컬럼: `password_hash CHAR(64)` (SHA-256 hex, plaintext 금지)
- 소프트 삭제: `is_deleted TINYINT(1) DEFAULT 0` (실제 DELETE 금지)

## 인덱스 규칙

```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_messages_room_created ON messages(room_id, created_at);
CREATE INDEX idx_friendships_user ON friendships(requester_id, addressee_id);
```

## 주요 테이블

| 테이블 | 핵심 컬럼 |
|--------|----------|
| `users` | id, username, password_hash, nickname, is_deleted |
| `chat_rooms` | id, name, type(group/open), owner_id |
| `room_members` | room_id, user_id, joined_at |
| `messages` | id, room_id, sender_id, content, is_deleted |
| `friendships` | requester_id, addressee_id, status |
| `direct_messages` | id, sender_id, receiver_id, content, is_read |

전체 DDL: `sql/schema.sql` 참고.
