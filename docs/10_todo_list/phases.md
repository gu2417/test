# 단계별 마일스톤

## P0 — 최소 동작

- 빌드 시스템 (Makefile, Linux/Windows) 완료
- `common/` 의 `protocol.h`, `types.h`, `utils.c` 작성
- 서버 accept + thread-per-client 뼈대
- 클라이언트 send/recv thread + GTK4 GtkApplicationWindow 표시
- DB 스키마 적용, `db_connect` / 프리페어드 헬퍼
- **FR-A01, A02, A04** 회원가입·로그인·로그아웃
- **FR-G01, G04, FR-M01** 그룹방 생성·참여·일반 메시지
- `PING/PONG`, 기본 `SYSTEM_NOTIFY`

완료 기준: 서버 실행 → 2 클라이언트 동시 접속 → 같은 방에서 메시지 교환.

## P1 — 카톡급 기본

- **친구**: FR-F01~F04, F07 (추가, 수락/거절, 목록, 검색)
- **DM**: FR-D01~D04 + `dm_reads` 읽음 처리
- **방 관리**: FR-G02,G03,G05~G08 (정보/멤버/초대/퇴장/강퇴/비번)
- **메시지**: FR-M02(REPLY), M04(EDIT), M05(DELETE), M11(HISTORY)
- **알림**: FR-N01~N03 (새 메시지/DM/친구요청 배너)
- **설정**: FR-C02(테마), C03(msg/nick 색), C04(ts), C05(dnd)
- **마이페이지**: FR-P01~P03
- 클라이언트 부분 재그리기(NFR-05 충족)

## P2 — 편의

- **오픈채팅**: FR-O01~O05
- **귓속말·me**: FR-M03, M10
- **검색**: FR-M08 (방 내 메시지)
- **방 공지/핀**: FR-G09, G10
- **타이핑 인디케이터**: FR-N04
- **테마 경량화 옵션** (light/dark) 마무리

## P3 — 고급 기능

- **친구 차단/해제**: FR-F05, F06
- **상태 변경**: FR-P04(online/busy/invisible)
- **DND 완전 적용**: TYPING/NOTIFY 필터링
- **에러 로그 레벨 조정 옵션** (`-v`)

## P4 — v2.1 후보 (out-of-scope)

- BAN 테이블, rate-limit, FULLTEXT 검색
- 세션별 prepared stmt 캐시
- 방 멤버수 비정규화 컬럼
- DM 다중행 메시지
- 자동 재접속 시 인증 복원(토큰)
