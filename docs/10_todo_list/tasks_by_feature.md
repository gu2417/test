# 기능별 작업 항목

각 FR 당 **설계 / 서버 구현 / 클라이언트 구현 / DB / 테스트** 5가지 축으로 작업 정리.

## 계정 (FR-A)

| FR | 설계 | 서버 | 클라 | DB | 테스트 |
|----|------|------|------|----|--------|
| A01 회원가입 | ✅ `02_features/account.md` | `auth_handler.c` register | `screen_login.c` 분기 | `users`, `user_settings` INSERT (TX) | id/nick 중복, 길이 초과 |
| A02 로그인 | ✅ | register 와 동일 모듈 | login 입력 | SELECT + online_status UPDATE | 중복 로그인 차단 |
| A03 비밀번호 변경 | ✅ | `PASSWORD_CHANGE` 핸들러 | 설정 화면 | UPDATE | old 불일치 |
| A04 로그아웃 | ✅ | `LOGOUT` + 친구 offline notify | 메뉴 | UPDATE last_seen | 소켓 정상 close |
| A05 중복 로그인 차단 | ✅ | 세션 테이블 조회 | - | - | 2 세션 동시 시도 |
| A06 계정 삭제 | v2.1 | out-of-scope | - | - | - |

## 친구 (FR-F)

| FR | 작업 |
|----|------|
| F01 추가 | `friend_handler.c`: ADD, check duplicate/block, insert pending |
| F02 수락/거절 | ACCEPT(+양방향 insert) / REJECT(delete) |
| F03 삭제 | 양방향 DELETE |
| F04 목록 | SELECT + users JOIN |
| F05 차단 | INSERT ... ON DUPLICATE KEY UPDATE status=2 |
| F06 차단 해제 | DELETE row |
| F07 검색 | LIKE LIMIT 30 |

## DM (FR-D)

| FR | 작업 |
|----|------|
| D01 전송 | `dm_handler.c`: 차단 검사 → INSERT → 상대 online 이면 NOTIFY |
| D02 히스토리 | SELECT + dm_reads INSERT IGNORE, READ_NOTIFY 발송 |
| D03 안읽은 수 | DM_LIST 집계 쿼리 |
| D04 대화 상대 목록 | DISTINCT from+to 최근 메시지 |
| D05 읽음 실시간 | DM_READ_NOTIFY 구독 |

## 그룹방 (FR-G)

| FR | 작업 |
|----|------|
| G01 생성 | TX: rooms INSERT + room_members(owner,is_admin=1) INSERT |
| G02 정보 조회 | SELECT |
| G03 멤버 목록 | JOIN |
| G04 참여 | 비번 검사 + 정원 검사 + INSERT + broadcast |
| G05 초대 | 친구 전용, 대상에게 ROOM_INVITED_NOTIFY |
| G06 퇴장 | DELETE members + LEFT_NOTIFY |
| G07 강퇴 | 권한 검사 + LEAVE + KICKED_NOTIFY |
| G08 비번 설정 | UPDATE rooms.password_hash |
| G09 공지 | UPDATE notice + NOTICE_NOTIFY |
| G10 핀 | UPDATE pinned_msg_id + PIN_NOTIFY |

## 오픈방 (FR-O)

| FR | 작업 |
|----|------|
| O01 생성(is_open=1) | rooms INSERT |
| O02 목록 | ROOM_LIST 쿼리 |
| O03 참여 | ROOM_JOIN 동일 경로, friend 검사 생략 |
| O04 open_nick | room_members.open_nick UPDATE |
| O05 방장 위임/삭제 | TRANSFER / DELETE |

## 메시지 (FR-M)

| FR | 작업 |
|----|------|
| M01 일반 | CHAT → INSERT → fan-out |
| M02 답장 | reply_to 검증 + INSERT |
| M03 귓속말 | INSERT(msg_type=2, to_id) + 2명에게만 발송 |
| M04 수정 | 5분 내, 본인, 미삭제 UPDATE |
| M05 삭제 | is_deleted=1 UPDATE |
| M06 시스템 메시지 | 서버 내부 INSERT(from_id='system', msg_type=1) |
| M08 검색 | room_id+LIKE |
| M09 타임스탬프 표시 | 클라이언트 설정 반영 |
| M10 /me | ME → INSERT(msg_type=3) + NOTIFY |
| M11 히스토리 | 방 입장 시 100개 로딩 |

## 알림 (FR-N)

| FR | 작업 |
|----|------|
| N01 새 메시지 배너 | 현재 방 아니면 배너 |
| N02 DM 배너 | DM 화면 아니면 배너 |
| N03 친구 요청 배너 | 항상 |
| N04 타이핑 | TYPING/STOP |
| N05 DND | `users.dnd=1` 시 배너 억제(본인 측) |
| N06 소리 | 터미널 BEL 옵션(NFR) |

## 커스터마이징 (FR-C)

| FR | 작업 |
|----|------|
| C01 닉네임 변경 | PROFILE_UPDATE |
| C02 테마 | theme ='dark'\|'light' |
| C03 색상 | msg_color/nick_color |
| C04 ts 포맷 | 0/1/2 |
| C05 DND 토글 | users.dnd |
| C06 상태 메시지 | status_msg UPDATE |
| C07 open_nick | 방별 닉(FR-O04 와 겹침) |

## 마이페이지 (FR-P)

| FR | 작업 |
|----|------|
| P01 내 프로필 | MYPAGE 쿼리 |
| P02 통계 | msg_count/room_count/friend_count |
| P03 다른 유저 보기 | USER_VIEW |
| P04 상태 변경 | STATUS_UPDATE |
| P05 가입일/최근 접속 | MYPAGE 응답에 포함 |
| P06 비밀번호 변경 링크 | 설정 화면 이동 |

## 관리자 (FR-ADM) · Out-of-Scope

> 서버 관리자 기능(FR-ADM01~ADM05)은 이 프로젝트 구현 범위에 포함되지 않습니다.
