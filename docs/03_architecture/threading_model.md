# 스레딩 모델

## 1. 서버

```mermaid
flowchart TB
    Main[main thread\nlisten + accept]
    Main -->|pthread_create| H1[handler #1]
    Main -->|pthread_create| H2[handler #2]
    Main -->|pthread_create| HN[handler #N]
    subgraph Shared["공유 상태"]
        GS[(g_sessions[] + mutex)]
    end
    H1 <--> GS
    H2 <--> GS
    HN <--> GS
```

### 규칙

1. **Thread-per-client** (NFR-01 ≤100 에서 충분히 가벼움).
2. 핸들러는 `pthread_detach` 로 분리 — join 하지 않는다.
3. 각 핸들러는 **전용 MYSQL\*** 을 시작 시 `mysql_init + mysql_real_connect` 로 획득하고 종료 시 `mysql_close`.
4. 공유 쓰기 자원:
   - `g_sessions[]`, `g_sessions_mutex` — 세션 배열 추가/삭제/스캔.
   - `SIGPIPE` 는 프로세스 수준에서 `SIG_IGN`.
5. 공유 읽기 자원 없음(DB 는 각 커넥션으로 접근).

### Mutex 범위 가이드

| 작업 | lock 범위 |
|------|-----------|
| 세션 등록 | 배열 빈칸 탐색 + 세팅 1개 단위 — **짧게** |
| 브로드캐스트 | mutex 획득 → fd 목록 스냅샷 복사 → unlock → 스냅샷에 send |
| 세션 제거 | set `active=0` 후 close, unlock |

**절대 금지**: mutex 를 잡은 채 `send()` / DB 호출 하지 않기(블로킹 시 전체 정지).

## 2. 클라이언트

| 스레드 | 역할 |
|--------|------|
| Main (UI) | 입력 읽기, 렌더, 화면 전환 |
| Recv | 소켓 → 이벤트 큐 |

`send()` 는 UI·Recv 양쪽에서 호출될 수 있으므로 `tx_mutex` 로 보호.

## 3. 시그널

| 시그널 | 서버 | 클라이언트 |
|--------|------|-----------|
| SIGPIPE | IGN | IGN |
| SIGINT / SIGTERM | 플래그 set → accept 중단 → 모든 세션 close → exit | 소켓 close → raw-mode off → exit |
| SIGWINCH | - | 화면 크기 재조회 후 재렌더 |

## 4. DB 연결 원칙 (NFR-09)

- 스레드 간 MYSQL\* 공유 금지.
- 연결 실패 시 3회 재시도(지수 백오프 100ms→200ms→400ms). 이후 세션 종료.
- prepared statement 핸들은 **함수 로컬** 로만 사용(호출마다 생성·해제). 성능이 부족할 경우 세션 수명 동안 캐시로 전환(v2.1 검토).
