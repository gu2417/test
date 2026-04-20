# 용어집

| 용어 | 정의 |
|------|------|
| **Session (세션)** | 접속 중인 클라이언트 하나에 대한 서버측 인메모리 상태. `ClientSession` 구조체로 표현. DB 에 저장되지 않음. |
| **Room (채팅방)** | 여러 사용자가 메시지를 주고받는 단위. 유형은 `group`(초대형) / `open`(공개형) 두 가지. |
| **DM** | Direct Message. 1:1 대화. `messages.room_id = NULL` 로 저장. |
| **Whisper (귓속말)** | 방 안에서 특정 사용자에게만 전달되는 메시지. `/w` 명령. DB 저장은 `msg_type=2`. |
| **Broadcast** | 서버가 방 멤버 전체(혹은 서버 전체)에게 동일 패킷을 fan-out 하는 행위. |
| **Router** | 수신된 패킷의 `TYPE` 필드를 기준으로 기능별 핸들러로 디스패치하는 서버 계층. |
| **Handler Thread** | 클라이언트 한 명당 하나씩 생성되는 서버 스레드. 소켓 read 루프 담당. |
| **Send / Recv Thread** | 클라이언트의 송신·수신 분리 스레드 쌍. stdin↔소켓↔화면을 비동기로 연결. |
| **Screen** | 클라이언트 TUI 의 화면 상태(LOGIN / MAIN / CHAT / MYPAGE / SETTINGS). |
| **Slash Command** | `/`로 시작하는 사용자 명령어. 예: `/w`, `/del`, `/pin`. |
| **Pin (핀 메시지)** | 방 상단에 고정되는 중요 메시지. `rooms.pinned_msg_id` 로 참조. |
| **Notice (공지)** | 방 입장 시 상단에 표시되는 관리자 공지 문자열. `rooms.notice`. |
| **DND** | Do Not Disturb. 멘션을 제외한 알림을 무음 처리하는 상태. |
| **Open Nick** | 오픈채팅방 내에서만 노출되는 별칭. `room_members.open_nick`. |
| **Prepared Statement** | 플레이스홀더 기반 SQL 실행. 본 프로젝트의 모든 SQL 은 이를 사용(injection 방지). |
| **TUI** | Text User Interface. ANSI 이스케이프 + 박스 드로잉으로 구성된 콘솔 UI. |
| **Raw Mode** | 터미널을 줄 단위가 아닌 **문자 단위**로 읽도록 설정한 모드(plat. 별 추상화 필요). |
| **Thread-local DB Connection** | 각 핸들러 스레드 전용 MYSQL* 연결. pool 미사용. |
| **FR / NFR** | Functional / Non-Functional Requirement. ID 는 `requirements.md` 기준. |
