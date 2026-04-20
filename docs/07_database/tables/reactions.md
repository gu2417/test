# reactions

## DDL

```sql
CREATE TABLE reactions (
    id         INT          AUTO_INCREMENT PRIMARY KEY,
    msg_id     INT          NOT NULL,
    user_id    VARCHAR(20)  NOT NULL,
    emoji      VARCHAR(20)  NOT NULL,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_reaction (msg_id, user_id, emoji),
    INDEX idx_msg (msg_id),
    FOREIGN KEY (msg_id)   REFERENCES messages(id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)     ON DELETE CASCADE
);
```

## 동작

- 토글: `INSERT ... ON DUPLICATE KEY` 대신 — **존재 확인 후 INSERT 또는 DELETE**.
  ```sql
  SELECT id FROM reactions WHERE msg_id=? AND user_id=? AND emoji=?;
  -- 있으면 DELETE, 없으면 INSERT
  ```
- 집계:
  ```sql
  SELECT emoji, COUNT(*) AS cnt
  FROM reactions WHERE msg_id=?
  GROUP BY emoji ORDER BY cnt DESC;
  ```

## 상한

- 메시지당 이모지 종류 ≤ 20 (앱 레벨).
- `emoji` 는 텍스트(`:+1:`, `:heart:`). 유니코드 이모지도 저장 가능(VARCHAR(20) utf8mb4).
