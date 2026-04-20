# admin 패킷

`users.is_admin=1` 인 세션만 사용 가능. 그 외는 `FORBIDDEN`(5).

## 요청·응답

```
ADMIN_STATUS
ADMIN_STATUS_RES|0|<total_users>|<online_users>|<total_rooms>|<total_messages>|<uptime_sec>

ADMIN_USERS
ADMIN_USERS_RES|0|<id>:<nick>:<online_status>;...

ADMIN_KICK|<user_id>                 # 강제 로그아웃
ADMIN_KICK_RES|<code>

ADMIN_BAN|<user_id>                  # 계정 차단(로그인 불가) - v2.1
ADMIN_BAN_RES|<code>

ADMIN_BROADCAST|<content>            # 전체 공지
ADMIN_BROADCAST_RES|0
```

## 부가 동작

- `ADMIN_KICK` 성공 시 대상 세션에 `SYSTEM_NOTIFY|2|관리자에 의해 연결이 종료되었습니다.` 발송 후 서버가 소켓 close.
- `ADMIN_BROADCAST` 는 자동으로 `SYSTEM_NOTIFY|1|<content>` 로 모든 세션에 fan-out.

## 관련 문서

- 권한: [../../05_security/authorization.md](../../05_security/authorization.md)
- 기능: [../../02_features/admin.md](../../02_features/admin.md)
