# C Chat Application — GitHub Copilot 맞춤 지침

## 프로젝트 개요

**C11 + GTK4 GUI 기반 실시간 채팅 애플리케이션** — 카카오톡/Google Chat 스타일  
TCP Server-Client, thread-per-client, MySQL 영속 저장  
플랫폼: Linux (gcc 9+) / Windows MinGW (mingw-w64 gcc 8+) 듀얼 빌드

설계 문서 전체: `docs/01~10/` | 요구사항: `requirements.md` | 계획서: `개발계획서.md`

---

## 디렉터리 구조

```
chat_program/src/
├── common/      # 양쪽 공유: protocol.h, types.h, utils.c/h, net_compat.h
├── server/      # TCP listen, thread-per-client, MySQL, 기능 핸들러
│   └── css/     (해당 없음)
└── client/      # GTK4 GUI: GtkStack 화면 전환, recv 스레드 → g_idle_add UI
    └── css/     # theme-dark.css, theme-light.css, components.css (생성됨)

sql/schema.sql   # DB DDL + 시드 (mysql -u root -p < sql/schema.sql)
Makefile         # make / make server / make client / make clean
```

---

## 서버 모듈 (chat_program/src/server/)

| 파일 | 역할 |
|------|------|
| `main.c` | listen/accept loop, SIGPIPE IGN, pthread_create per client |
| `config.h` | 상수: DEFAULT_PORT 8080, MAX_CLIENTS 100, DB 접속 파라미터 |
| `globals.c/h` | g_sessions[], g_sessions_mutex, sessions_add/remove/find |
| `client_handler.c/h` | recv 루프, `\n` 기준 라인 프레이밍, router 호출 |
| `router.c/h` | TYPE → 핸들러 디스패치 테이블 |
| `db.c/h` | MYSQL* 래퍼, db_connect/db_prepare/db_exec/db_query_row |
| `auth.c/h` | handle_register, handle_login, handle_logout, handle_pass_change |
| `user_store.c/h` | user_exists, user_get_profile, settings_get/update, profile_update |
| `friend.c/h` | handle_friend_request/accept/reject/block/list, friend_is_blocked |
| `room.c/h` | handle_room_create/join/leave/invite/kick, 공지/권한 관리 |
| `dm.c/h` | handle_dm_send, handle_dm_history, mark_dm_read |
| `message.c/h` | handle_msg_delete/edit/reply/search, handle_whisper |
| `broadcast.c/h` | bcast_room, bcast_all, notify_user, send_packet_locked |

**의존성 방향**: main → handler → router → 기능핸들러 → broadcast/db/user_store

---

## 클라이언트 모듈 (chat_program/src/client/)

| 파일 | 역할 |
|------|------|
| `main.c` | GtkApplication 생성, g_application_run() |
| `app_window.c/h` | GtkApplicationWindow, GtkStack(LOGIN/MAIN/CHAT/MYPAGE/SETTINGS) |
| `net.c/h` | TCP 연결, tx_mutex 직렬화 send, recv 스레드 → g_idle_add() |
| `packet.c/h` | packet_build(), packet_parse(), packet_field() |
| `screen_login.c/h` | 로그인/회원가입 GtkEntry + GtkButton |
| `screen_main.c/h` | 메인화면 내부 GtkStack (FRIENDS/ROOMS/OPEN/MYPAGE 탭) |
| `screen_chat.c/h` | 채팅화면: GtkTextView + GtkEntry + 참여자 패널 GtkListBox |
| `screen_mypage.c/h` | 프로필 편집, 로그아웃 버튼 |
| `screen_settings.c/h` | GtkDropDown 테마, GtkSwitch DND/알림, GtkColorDialogButton |
| `friend_view.c/h` | 친구 목록 GtkListBox, 상태 아이콘, GtkPopoverMenu |
| `room_view.c/h` | 채팅방 목록 GtkListBox, 읽지않음 배지 GtkLabel |
| `notify.c/h` | GtkRevealer 배너, notify_show(), notify_set_badge() |

---

## 공용 모듈 (chat_program/src/common/)

| 파일 | 역할 |
|------|------|
| `protocol.h` | PKT_* 상수, 구분자 상수, MAX_PACKET_SIZE 2048 |
| `types.h` | User, ChatRoom, Message, FriendEntry, Notification 구조체 |
| `utils.c/h` | format_timestamp(), time_ago(), fnv1a_hash(), trim_whitespace(), safe_strncpy() |
| `net_compat.h` | 플랫폼 소켓 호환 레이어 (#ifdef _WIN32 분기) |

---

## 패킷 프로토콜

**형식**: `<TYPE>|<field1>|<field2>|...|<content>\n`  
**최대**: 2048 byte (초과 시 연결 drop)  
**구분자**: `|` 필드구분, `:` 다중값, `;` 리스트 반복  
**문자셋**: UTF-8. 식별자 필드는 ASCII만, content는 UTF-8 전체

```c
/* 빌드 */
packet_build(buf, sizeof(buf), "LOGIN_RES", "0", session->id, session->nickname, NULL);
// → "LOGIN_RES|0|alice|앨리스\n"

/* 파싱 */
char type[32]; char fields[16][256];
int n = packet_parse(line, type, fields, 16);
```

### 주요 패킷

| TYPE | 방향 | 형식 |
|------|------|------|
| `REGISTER` | C→S | `REGISTER\|id\|password\|nickname` |
| `REGISTER_RES` | S→C | `REGISTER_RES\|code` (0=OK, 1=ID중복) |
| `LOGIN` | C→S | `LOGIN\|id\|password` |
| `LOGIN_RES` | S→C | `LOGIN_RES\|code\|id\|nickname` (0=OK, 1=ID불일치, 2=PW불일치, 3=중복접속) |
| `LOGOUT` | C→S | `LOGOUT` |
| `CHAT` | C→S | `CHAT\|room_id\|content` |
| `CHAT_NOTIFY` | S→C | `CHAT_NOTIFY\|room_id\|from_id\|nickname\|msg_id\|content` |
| `ROOM_CREATE` | C→S | `ROOM_CREATE\|name\|is_open\|max_users\|password` |
| `ROOM_CREATE_RES` | S→C | `ROOM_CREATE_RES\|code\|room_id` |
| `ROOM_JOIN` | C→S | `ROOM_JOIN\|room_id\|password` |
| `ROOM_JOIN_RES` | S→C | `ROOM_JOIN_RES\|code\|room_id\|room_name` |
| `ROOM_LEAVE` | C→S | `ROOM_LEAVE\|room_id` |
| `ROOM_LIST_REQ` | C→S | `ROOM_LIST_REQ\|type` (group/open) |
| `ROOM_LIST_RES` | S→C | `ROOM_LIST_RES\|code\|id:name:cur:max:has_pw;...` |
| `DM_SEND` | C→S | `DM_SEND\|to_id\|content` |
| `DM_RECV` | S→C | `DM_RECV\|from_id\|nickname\|msg_id\|content\|timestamp` |
| `FRIEND_REQUEST` | C→S | `FRIEND_REQUEST\|target_id` |
| `FRIEND_REQUEST_RES` | S→C | `FRIEND_REQUEST_RES\|code` (0=전송됨, 1=없는ID, 2=차단됨, 3=이미친구) |
| `FRIEND_LIST` | C→S | `FRIEND_LIST` |
| `FRIEND_LIST_RES` | S→C | `FRIEND_LIST_RES\|code\|id:nick:online;...` |
| `NOTIFY` | S→C | `NOTIFY\|type\|content` |
| `PING` | C→S | `PING` |
| `PONG` | S→C | `PONG` |

---

## MySQL 스키마 (chat_db)

```sql
-- 초기화: mysql -u root -p < sql/schema.sql
-- DB: chat_db, charset: utf8mb4

users         (id VARCHAR(20) PK, password_hash VARCHAR(64), nickname VARCHAR(20) UNIQUE,
               status_msg VARCHAR(100), online_status TINYINT, last_seen DATETIME, created_at DATETIME)
user_settings (user_id VARCHAR(20) PK FK→users, msg_color, nick_color, theme VARCHAR(10),
               ts_format TINYINT, dnd TINYINT)
friends       (id INT PK, user_id FK, friend_id FK, status TINYINT 0=pending/1=accepted/2=blocked)
rooms         (id INT PK, name VARCHAR(30), topic VARCHAR(100), password_hash VARCHAR(64),
               max_users INT, owner_id FK, notice VARCHAR(255), is_open TINYINT, pinned_msg_id INT)
room_members  (room_id PK FK, user_id PK FK, open_nick VARCHAR(20), is_admin TINYINT, is_muted TINYINT)
messages      (id INT PK, room_id INT NULL=DM, from_id FK, to_id VARCHAR(20), content VARCHAR(500),
               reply_to INT, msg_type TINYINT 0=normal/1=system/2=whisper/3=me,
               is_deleted TINYINT, created_at DATETIME, edited_at DATETIME)
dm_reads      (msg_id PK FK, reader_id PK FK, read_at DATETIME)
room_invites  (id INT PK, room_id FK, inviter_id FK, invitee_id FK, status TINYINT, created_at DATETIME)
```

**앱 계정**: `chat_app@localhost` — SELECT/INSERT/UPDATE/DELETE만 (GRANT 최소화)  
**예약 계정**: `system` (시스템 메시지), `admin` (관리자)

---

## 빌드 명령

```bash
make              # 서버+클라이언트 전체 빌드
make server       # 서버만
make client       # 클라이언트만
make clean        # 빌드 산출물 삭제

# 실행
./chat_program/src/server/chat_server [port]        # 기본 8080
./chat_program/src/client/chat_client [host] [port]  # 기본 127.0.0.1 8080

# DB 초기화
mysql -u root -p < sql/schema.sql
```

**의존성**: `gtk4 (4.6+)`, `pthread`, `libmysqlclient`, `gcc -std=c11`

---

## 코딩 컨벤션

- **C11** 표준, `snake_case` 네이밍, 탭 대신 공백 4칸
- 헤더: 자신의 `.h`를 첫 번째로 include. 플랫폼 헤더는 `net_compat.h` 경유
- 파일당 길이 제한: 500줄 이하 권장 (초과 시 모듈 분리 검토)
- 함수 길이: 50줄 이하 권장
- `/* 주석 */` C 스타일, 자명한 코드에 불필요한 주석 금지
- 반환값 항상 검사 (socket recv/send, mysql_stmt_execute 등)

---

## GTK4 스레드 안전성 규칙 (필수)

```c
// ❌ 금지: recv 스레드에서 GTK API 직접 호출
gtk_label_set_text(label, msg);    // WRONG

// ✅ 올바름: g_idle_add()로 메인 루프에 예약
typedef struct { GtkLabel *label; char *text; } UpdateData;
static gboolean update_cb(gpointer d) {
    UpdateData *u = d;
    gtk_label_set_text(u->label, u->text);
    g_free(u->text); g_free(u);
    return G_SOURCE_REMOVE;
}
UpdateData *u = g_new(UpdateData, 1);
u->label = label; u->text = g_strdup(msg);
g_idle_add(update_cb, u);          // CORRECT
```

**send 스레드 안전성**: `tx_mutex` 잠금 필수

```c
pthread_mutex_lock(&tx_mutex);
net_send(sock_fd, packet);
pthread_mutex_unlock(&tx_mutex);
```

---

## 보안 규칙 (필수)

1. **비밀번호**: `SHA2(plain, 256)` 단방향 해시만 저장 — 평문 보관 금지
2. **SQL Injection**: 모든 쿼리는 Prepared Statement (`?` 플레이스홀더). `sprintf`로 SQL 구성 금지
3. **입력 검증**: ID ≤20자 ASCII, PW ≤30자, 닉네임 ≤20자, 메시지 ≤500자 서버에서 재검증
4. **Mutex 규칙**: `g_sessions_mutex` 보유 중 `send()` / DB 호출 금지 (데드락 방지)
5. **SIGPIPE**: 서버 시작 시 `signal(SIGPIPE, SIG_IGN)` 설정
6. **버퍼 오버플로**: `strncpy` 대신 `safe_strncpy()`, `snprintf` 사용

---

## 구현 우선순위

- **Phase 0**: Makefile, schema.sql, common 모듈, 서버/클라이언트 뼈대
- **P0**: 회원가입/로그인, 그룹방/오픈채팅 생성·참여·메시지, GTK4 기본 UI
- **P1**: 1:1 DM, 친구 관리, 프로필 수정, 마이페이지
- **P2**: 메시지 삭제/수정/답장, 알림, 방 공지, 멤버 관리
- **P3**: 검색, 이모티콘, 타이핑 표시, keepalive

**구현 TODO 상세**: `docs/10_todo_list/` 폴더 참조
