# 슬래시 커맨드

`requirements.md` §8 의 커맨드 전체를 화면·권한·응답 기준으로 정리.

## 공통 규약

- `/` 로 시작. 토큰 구분은 공백. 따옴표 처리 없음 — content 포함 커맨드는 첫 N 토큰 파싱 후 나머지를 content 로 연결.
- 대소문자 무시(예: `/HELP` = `/help`).
- 알 수 없는 커맨드 → 하단 에러 표시. 서버에 전송하지 않음.

## 전체 표

| 커맨드 | 동작 화면 | 권한 | 대응 패킷 | 메모 |
|--------|-----------|------|-----------|------|
| `/help` | ALL | - | (로컬) | 현재 화면 사용 가능 커맨드 출력 |
| `/quit` | ALL | - | LOGOUT_REQ + close | |
| `/w <nick> <content>` | CHAT | 멤버 | `WHISPER` | |
| `/del <msg_id>` | CHAT | 본인/admin | `MSG_DELETE` | |
| `/edit <msg_id> <content>` | CHAT | 본인 | `MSG_EDIT` | 5분 내 |
| `/reply <msg_id> <content>` | CHAT | 멤버 | `MSG_REPLY` | |
| `/react <msg_id> <emoji>` | CHAT | 멤버 | `MSG_REACT` | 토글 |
| `/pin <msg_id>` | CHAT | 방장/방 관리자 | `MSG_PIN` | `msg_id=0` 해제 |
| `/search <keyword>` | CHAT | 멤버 | `MSG_SEARCH` | |
| `/invite <id>` | CHAT | 멤버 | `ROOM_INVITE` | |
| `/kick <nick>` | CHAT | 방장/방 관리자 | `ROOM_KICK` | |
| `/notice <content>` | CHAT | 방장/방 관리자 | `ROOM_SET_NOTICE` | 빈 문자열로 해제 |
| `/grant <nick>` | CHAT | 방장 | `ROOM_GRANT_ADMIN` | |
| `/revoke <nick>` | CHAT | 방장 | `ROOM_REVOKE_ADMIN` | |
| `/members` | CHAT | 멤버 | `ROOM_MEMBERS_REQ` | |
| `/mute` | CHAT | 멤버 | SETTINGS_UPDATE 확장 | 방 알림 토글 |
| `/leave` | CHAT | 멤버 | `ROOM_LEAVE` | MAIN 복귀 |
| `/me <action>` | CHAT | 멤버 | `ROOM_MSG`(msg_type=3) | |
| `/open_nick <nick>` | CHAT(open) | 멤버 | `ROOM_SET_OPEN_NICK` | |
| `/friend add <id>` | MAIN | - | `FRIEND_ADD_REQ` | |
| `/friend list` | MAIN | - | `FRIEND_LIST_REQ` | |
| `/friend block <id>` | MAIN | - | `FRIEND_BLOCK` | |
| `/friend del <id>` | MAIN | - | `FRIEND_DELETE` | |
| `/friend accept <id>` | MAIN | - | `FRIEND_ACCEPT` | |
| `/friend reject <id>` | MAIN | - | `FRIEND_REJECT` | |
| `/find <keyword>` | MAIN | - | `USER_SEARCH` | |
| `/rooms [open\|group]` | MAIN | - | `ROOM_LIST_REQ` | |
| `/room create <name>` | MAIN | - | `ROOM_CREATE`(is_open=0) | |
| `/open create <name>` | MAIN | - | `ROOM_CREATE`(is_open=1) | |
| `/room search <kw>` | MAIN | - | `ROOM_SEARCH` | |
| `/join <room_id> [pw]` | MAIN | - | `ROOM_JOIN` | |
| `/dm <id>` | MAIN | - | 로컬 + DM_HISTORY_REQ | |
| `/status <st>` | ALL | - | `STATUS_CHANGE` | online/busy/invisible |
| `/profile <nick> <status_msg>` | MYPAGE | - | `PROFILE_UPDATE` | |
| `/dnd` | ALL | - | `STATUS_CHANGE` 또는 로컬→SETTINGS_UPDATE | 토글 |
| `/mypage` | ALL | - | (로컬 전환) | |
| `/settings` | ALL | - | (로컬 전환) | |
| `/admin <sub> <args>` | ALL | admin | `ADMIN_CMD` | sub: broadcast/kick/stat/users/delroom |
