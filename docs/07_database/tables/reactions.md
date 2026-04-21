# room_invites 테이블

> 주의: 이 파일은 reactions.md를 대체합니다. reactions 테이블은 구현 범위 외입니다.

---

## DDL

```sql
CREATE TABLE room_invites (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    room_id    INT          NOT NULL,
    inviter_id VARCHAR(20)  NOT NULL,
    invitee_id VARCHAR(20)  NOT NULL,
    status     TINYINT      NOT NULL DEFAULT 0,  -- 0=pending, 1=accepted, 2=rejected
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_invite (room_id, invitee_id),
    INDEX idx_invitee (invitee_id),
    CONSTRAINT fk_ri_room    FOREIGN KEY (room_id)    REFERENCES rooms(id)  ON DELETE CASCADE,
    CONSTRAINT fk_ri_inviter FOREIGN KEY (inviter_id) REFERENCES users(id)  ON DELETE CASCADE,
    CONSTRAINT fk_ri_invitee FOREIGN KEY (invitee_id) REFERENCES users(id)  ON DELETE CASCADE
);
```

---

## 컬럼 설명

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT AUTO_INCREMENT | 초대 레코드 고유 식별자 |
| `room_id` | INT | 초대 대상 채팅방 ID (`rooms.id` 참조) |
| `inviter_id` | VARCHAR(20) | 초대를 보낸 유저 ID (`users.id` 참조) |
| `invitee_id` | VARCHAR(20) | 초대를 받은 유저 ID (`users.id` 참조) |
| `status` | TINYINT | 초대 상태: `0`=pending, `1`=accepted, `2`=rejected |
| `created_at` | DATETIME | 초대 생성 시각 (UTC) |

**인덱스**:
- `uq_invite (room_id, invitee_id)`: 동일 방에 같은 유저를 중복 초대 방지
- `idx_invitee (invitee_id)`: 로그인 시 미처리 초대 조회 성능

---

## 동작 설명

1. **초대 전송**  
   방장이 `ROOM_INVITE` 패킷 전송 →  
   - 대상이 **온라인**이면: `ROOM_INVITED_NOTIFY` 즉시 발송  
   - 대상이 **오프라인**이면: `room_invites`에 `status=0` (pending) 으로 저장

2. **오프라인 초대 복원**  
   대상 유저 로그인 시:
   ```sql
   SELECT * FROM room_invites WHERE invitee_id = ? AND status = 0;
   ```
   조회된 레코드마다 `ROOM_INVITED_NOTIFY` 재전송.

3. **초대 수락**  
   `ROOM_INVITE_ACCEPT` 수신 →  
   - `status = 1` 업데이트  
   - 해당 유저를 `room_members`에 추가  
   - 채팅방 전원에게 `ROOM_MEMBER_JOINED_NOTIFY` 브로드캐스트

4. **초대 거절**  
   `ROOM_INVITE_REJECT` 수신 → `status = 2` 업데이트

5. **중복 초대 방지**  
   `UNIQUE KEY (room_id, invitee_id)` 위반 시 서버가 에러 코드 `3` 반환.  
   이미 pending 상태인 초대가 존재하면 새 초대를 삽입하지 않음.

---

## 관련 패킷

| 패킷 타입 | 방향 | 설명 |
|-----------|------|------|
| `ROOM_INVITE` | C → S | 방장이 특정 유저를 채팅방에 초대 |
| `ROOM_INVITED_NOTIFY` | S → C | 초대 대상에게 초대 알림 전송 |
| `ROOM_INVITE_ACCEPT` | C → S | 초대 수락 |
| `ROOM_INVITE_REJECT` | C → S | 초대 거절 |

관련 패킷 파일: [`../../08_api/packets/room.md`](../../08_api/packets/room.md)
