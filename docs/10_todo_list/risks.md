# 리스크 및 완화

| # | 리스크 | 영향 | 발생가능성 | 완화책 |
|---|--------|------|-----------|--------|
| R1 | Windows/MinGW 의 `libmysqlclient` 링크 문제 | 빌드 실패 → P0 지연 | 중 | MariaDB Connector/C 정적 라이브러리 사용, 별도 `client/Makefile.mingw` 준비, 초기 단계에 스모크 빌드 |
| R2 | Winsock 과 BSD 소켓 차이 (non-blocking 플래그, send flags) | 플랫폼 한쪽만 깨짐 | 중 | `common/net_compat.{h,c}` 에 wrapper. CI 에 MSYS2 빌드 추가(수동이라도). |
| R3 | TUI 동시 입출력(입력 중 메시지 도착 시 깨짐) | UX 치명 | 중 | DECSTBM 스크롤 영역 분리 + 입력 라인 재그리기 전략. 초기부터 POC. |
| R4 | UTF-8 폭 계산 오류(한글·이모지) | 레이아웃 깨짐 | 중 | wcwidth 수준의 미니 테이블(BMP 위주). 이모지는 폭 2 가정. v2.1 에 grapheme 라이브러리 고려. |
| R5 | 브로드캐스트 도중 fd 재사용 경합 | 간헐적 segfault | 저 | 세션 mutex 아래 fd 스냅샷 복사 → unlock 후 send. 테스트로 강제 race 재현(병렬 접속/종료). |
| R6 | MySQL deadlock 빈발 (친구 양방향 insert 등) | 요청 실패 | 저 | 트랜잭션 최소화, `ER_LOCK_DEADLOCK` 1회 재시도. 대부분은 `ON DUPLICATE KEY UPDATE` 로 회피. |
| R7 | 저사양 터미널에서 재그리기 지연 | UX 저하 | 중 | 부분 재그리기 원칙. ANSI sequence 최소화. 120fps 금지, 이벤트 driven 만. |
| R8 | 메모리 예산(100MB) 초과 | NFR 위반 | 저 | 세션/룸 배열 정적 할당, 히스토리는 페이지네이션, content 복사 최소화 |
| R9 | 한국어 입력(IME) 콘솔 편집 불편 | 유저 피드백 | 중 | v2.0 는 단순 line 편집(backspace/Enter)만. IME 완성형 입력은 터미널·OS 책임으로 명시. |
| R10 | 비밀번호 평문 전송 | 보안 취약 | 고(정책) | v2.0 은 TLS 미도입 — README 와 `05_security` 에 **명시적 경고**. v2.1 에서 TLS 검토. |
| R11 | SHA-256 에 salt 없음 | 레인보우 테이블 공격 | 중 | 현재 인정된 한계. v2.1 에 bcrypt/argon2 도입. 시드 admin 비번은 운영 시 변경 강제. |
| R12 | schema 변경 시 마이그레이션 누락 | 데이터 손상 | 저 | `sql/migrations/` 관례 수립, 운영 체크리스트 유지 |
| R13 | 서버 프로세스 fd 고갈 | 신규 접속 실패 | 저 | `ulimit -n` 가이드 문서화, 기본 MAX_CLIENTS=128 에 여유 fd 포함 |

## 모니터링 지표

- 활성 세션 수, 평균 패킷 처리 시간, DB 응답 시간, 메모리 사용량. `ADMIN_STATUS` 로 1차 가시화, v2.1 에서 별도 메트릭 수집.
