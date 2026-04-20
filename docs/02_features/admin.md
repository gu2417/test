# 관리자 기능 (FR-ADM01 ~ ADM05)

관리자 자격: `users.is_admin=1`. 관리자 여부는 **로그인 시점** 에 세션에 캐시(`ClientSession.is_admin`). 모든 admin 패킷은 세션 플래그를 서버에서 먼저 검사.

## FR-ADM01 전체 공지 · P4

| 패킷 | `ADMIN_CMD|broadcast:<content>` |
| 로직 | 접속 중 모든 세션에 `NOTIFY(type=SERVER, content)` fan-out |

## FR-ADM02 유저 강제 로그아웃 · P4

| 패킷 | `ADMIN_CMD|kick_user:<id>` |
| 로직 | 세션 배열에서 `user_id` 검색 → 해당 소켓에 `NOTIFY(type=SERVER, 강제 로그아웃)` 후 close → 세션 정리 |

## FR-ADM03 서버 상태 조회 · P4

| 패킷 | `ADMIN_CMD|server_stat:` / `ADMIN_RES|0:접속=..;방=..;메시지=..` |
| 지표 | 현재 세션 수, `rooms` 총계, `messages` 총계, 프로세스 RSS(optional) |

## FR-ADM04 유저 목록 조회 · P4

| 패킷 | `ADMIN_CMD|user_list:` / `ADMIN_RES|0:<id>:<nick>:<online>;...` |
| 쿼리 | `SELECT id, nickname, online_status FROM users ORDER BY id LIMIT 100` |

## FR-ADM05 채팅방 강제 삭제 · P4

| 패킷 | `ADMIN_CMD|delete_room:<room_id>` |
| 로직 | 방 멤버에게 시스템 메시지 후 `DELETE FROM rooms WHERE id=?` (CASCADE 로 members/messages 정리됨 — 단 messages 는 CASCADE 없음: 명시적 `UPDATE messages SET is_deleted=1 WHERE room_id=?` 후 `DELETE rooms`) |

## 초기 관리자

`sql/schema.sql` 에 시드:
```sql
INSERT INTO users (id, password_hash, nickname, is_admin)
VALUES ('admin', SHA2('admin',256), '관리자', 1);
```

## 관련 문서

- 패킷: [`08_api/packets/admin.md`](../08_api/packets/admin.md)
- 보안 권한 매트릭스: [`05_security/authorization.md`](../05_security/authorization.md)
