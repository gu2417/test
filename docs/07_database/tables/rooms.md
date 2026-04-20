# rooms

## DDL

```sql
CREATE TABLE rooms (
    id            INT          AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(30)  NOT NULL,
    topic         VARCHAR(100) DEFAULT '',
    password_hash VARCHAR(64)  DEFAULT '',
    max_users     INT          DEFAULT 30,
    owner_id      VARCHAR(20)  NOT NULL,
    notice        VARCHAR(255) DEFAULT '',
    is_open       TINYINT      DEFAULT 0,     -- 0=group 1=open
    pinned_msg_id INT          DEFAULT NULL,  -- FK 미설정(순환 회피)
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_is_open (is_open),
    INDEX idx_name    (name),
    FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

## 컬럼

| 컬럼 | 설명 |
|------|------|
| `password_hash` | 빈 문자열이면 공개. 값 있으면 `SHA2(pw,256)`. |
| `max_users` | 1~100. 검증은 앱 레벨. |
| `is_open` | 0=초대형 그룹, 1=공개 오픈채팅. |
| `pinned_msg_id` | 핀 해제 시 NULL. 삭제 메시지를 핀으로 두지 않도록 앱 레벨 보정. |

## 생명주기

- 생성: `ROOM_CREATE` → `INSERT rooms` + `INSERT room_members(is_admin=1)`(방장 자동 가입).
- 삭제: 방장이 나갈 때 남은 관리자 자동 승계 / 관리자도 없으면 `DELETE rooms`(CASCADE 로 members 는 정리, messages 는 `is_deleted=1` 처리 후 삭제).

## 인덱스 근거

- `idx_is_open`: 오픈방 목록 조회.
- `idx_name`: 방 검색(ORDER BY / LIKE).
