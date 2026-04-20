# 06 · UI / UX

Google Workspace(Chat, Gmail) · Material 3 · KakaoTalk PC(2025) 레퍼런스 기반의 **모던 TUI 디자인**.
핵심 원칙: **여백 중심 · 카드형 리스트 · 대비 낮은 중립 톤 + 1색 액센트 · 사이드바 레이아웃**.

---

## 문서 맵

| 문서 | 내용 |
|------|------|
| [design_tokens.md](./design_tokens.md) | 색·간격·타이포·아이콘·Z레이어·타이밍·폭 규칙 |
| [components.md](./components.md) | 재사용 컴포넌트 22종 (아바타·뱃지·카드·오버레이·자동완성 등) |
| [screen_flow.md](./screen_flow.md) | 화면 상태 전이도 + 13개 서브 플로우 상세 |
| [interaction_patterns.md](./interaction_patterns.md) | 로딩·빈 상태·오류·재연결·자동완성·친구요청 패턴 |
| [screens/login.md](./screens/login.md) | 로그인 · 회원가입 |
| [screens/main.md](./screens/main.md) | 메인 (사이드바 + 탭 리스트 + 방 생성 위저드) |
| [screens/chat.md](./screens/chat.md) | 채팅 (말풍선 · 오버레이 · 귓속말 · me액션 · DM모드) |
| [screens/open_chat.md](./screens/open_chat.md) | 오픈채팅 탐색 · 참여 · 비밀번호 방 · 방 생성 |
| [screens/mypage.md](./screens/mypage.md) | 마이페이지 (프로필 카드 · 인라인 편집) |
| [screens/settings.md](./screens/settings.md) | 설정 (세그먼트 컨트롤 · 색상 스와치 · 토글) |
| [screens/admin.md](./screens/admin.md) | 관리자 패널 (서버 현황 · 유저 관리 · 공지) |
| [commands.md](./commands.md) | 슬래시 커맨드 전체 (권한·패킷 매핑) |
| [low_spec_rendering.md](./low_spec_rendering.md) | 저사양 · 8색 fallback · 부분 갱신 전략 |

---

## 화면 구성 요약

```
LOGIN ──→ MAIN ──→ CHAT (그룹방 / DM / 오픈채팅)
            │
            ├──→ OPEN_CHAT (탐색 · 참여)
            ├──→ MYPAGE
            ├──→ SETTINGS
            └──→ ADMIN (admin 전용)
```

---

## 컴포넌트 목록

| # | 이름 | 용도 |
|---|------|------|
| 1 | Avatar | 이니셜 원형 아바타 |
| 2 | StatusDot | 온라인 상태 점 |
| 3 | Badge | 미읽음 카운트 뱃지 |
| 4 | Chip/Tag | 주제·멘션·방 참조 태그 |
| 5 | Card | 친구·방·DM 목록 아이템 |
| 6 | Tabs | 사이드바 탭 트리 |
| 7 | TopBar | 화면 헤더 (제목·핀·액션) |
| 8 | Banner | 상단 알림 오버레이 |
| 9 | Composer | 메시지/커맨드 입력창 |
| 10 | TypingIndicator | 입력 중 표시 |
| 11 | MessageRow | 좌/우 정렬 메시지 행 |
| 12 | 메시지 장식 변형 | 귓속말·me·답장·삭제 |
| 13 | ReactionStrip | 이모지 리액션 집계 |
| 14 | Modal | 확인 대화상자 |
| 15 | Toast | 하단 스낵바 피드백 |
| 16 | MembersPanel | 멤버 목록 사이드 패널 |
| 17 | SearchOverlay | 메시지 검색 오버레이 |
| 18 | CommandSuggestion | 슬래시 커맨드 자동완성 |
| 19 | EmptyState | 빈 상태 안내 |
| 20 | RoomCard | 오픈채팅 방 목록 아이템 |
| 21 | InlineConfirm | 인라인 경량 확인 |
| 22 | PinNoticeBar | 핀/공지 표시 바 |

---

## 레퍼런스

- **Google Chat**: 좌측 내비 + 우측 대화 · 헤더 얇음 · 메시지 그룹화(동일 발신 3분 이내)
- **Gmail (Material 3)**: 중립 배경, 액센트 1색, pill-shape 뱃지, 여백과 정렬로 위계 표현
- **KakaoTalk PC**: 내 메시지 우측 정렬, 상대방 좌측 + 아바타, 시간/읽음 메시지 아래, 미읽음 수 카운터
- **공통**: 선 대신 여백으로 섹션 분리, 장식 최소, 색은 상태 전달용(성공/경고/오류/정보)
