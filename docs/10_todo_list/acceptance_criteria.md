# 완료 기준 (Acceptance Criteria)

체크리스트로, FR 단위 "끝났다" 를 정의.

## 공통 AC

- [ ] 모든 서버 쿼리는 **prepared statement** (grep `mysql_real_query` 로 남은 잔재 0건)
- [ ] 모든 패킷은 `08_api/packet_format.md` 규칙 통과 (길이/문자 검증)
- [ ] `NDEBUG` 빌드에서 메모리 100MB 이하 (`ps -o rss`) · CPU idle < 5%
- [ ] Linux / macOS / Windows(MinGW) 3개 플랫폼에서 서버·클라 빌드 성공
- [ ] `valgrind --leak-check=full` 에서 definitely lost = 0 (Linux)

## 기능별 AC 발췌

### 계정
- [ ] FR-A01 회원가입: 중복 id → `REGISTER_RES|3`; 규칙 위반 → `|1`; 성공 시 `user_settings` 도 같은 TX 로 생성
- [ ] FR-A02 로그인 성공 시 친구들에게 `FRIEND_ONLINE_NOTIFY` 도달
- [ ] FR-A05 동일 id 두 번째 로그인 → `LOGIN_RES|6`, 기존 세션 영향 없음

### 방
- [ ] FR-G01 생성 후 방장이 자동으로 `room_members` 에 존재
- [ ] FR-G04 정원 초과 → `ROOM_JOIN_RES|6`
- [ ] FR-G10 핀 메시지가 삭제되어도 방은 crash 없이 표시(내용 "(삭제된 메시지)")

### 메시지
- [ ] FR-M01 CHAT 은 같은 방 모든 멤버(온라인)에게 `CHAT_NOTIFY` 도달, 평균 지연 < 100ms (NFR-03)
- [ ] FR-M04 EDIT: 본인 아님 → `|5`, 5분 초과 → `|6`, 삭제됨 → `|6`
- [ ] FR-M07 REACT 토글: 같은 emoji 재호출 시 제거됨
- [ ] FR-M08 검색: 삭제된 메시지 제외

### DM
- [ ] FR-D01 차단 관계면 `|7`
- [ ] FR-D02 히스토리 응답 직후 상대에게 `DM_READ_NOTIFY` 1회 도달
- [ ] FR-D03 안읽은 수 = `messages` - `dm_reads` 차

### 친구
- [ ] FR-F01 자기 자신 추가 → `|1`
- [ ] FR-F02 수락 후 양쪽 `FRIEND_LIST` 에 서로 나타남

### 관리자
- [ ] FR-ADM05 일반 유저가 `ADMIN_*` 호출 → `|5`
- [ ] FR-ADM04 ADMIN_BROADCAST → 모든 세션에 `SYSTEM_NOTIFY|1|...`

### 보안
- [ ] SQL 문자열 concat 0건 (grep `"SELECT"`, `"INSERT"` 주변에 `%s` 로 user input 결합 없음)
- [ ] password 는 로그/DM content 어디에도 평문 없음
- [ ] 2048B 초과 패킷 → 서버가 **drop + 세션 close**

### UI/UX
- [ ] 80×24 터미널에서 채팅 화면이 자르지 않고 배치
- [ ] 메시지 1개 수신 시 전체 화면 재그리기 없이 메시지 영역만 갱신
- [ ] `SIGWINCH` 처리로 리사이즈 후 깨짐 없음

### 안정성
- [ ] 한 클라이언트가 비정상 종료(kill -9) → 다른 세션은 영향 없이 계속
- [ ] DB 일시 단절 → 30초 내 자동 복구 시도, 실패 시 세션만 종료
- [ ] 서버 24시간 연속 실행 시 메모리 누수 증가 < 5% (NFR-06)
