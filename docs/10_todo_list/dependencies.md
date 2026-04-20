# 의존 그래프

## 구현 순서

```mermaid
graph TD
    A[빌드 시스템] --> B[common/*.h/.c]
    B --> C[서버 accept 루프]
    B --> D[클라 recv/send thread]
    C --> E[DB connect 레이어]
    E --> F[인증 auth]
    F --> G[방 room_create/join]
    F --> H[DM send/history]
    G --> I[메시지 CHAT + fan-out]
    I --> J[REPLY/EDIT/DELETE]
    I --> K[WHISPER]
    H --> L[dm_reads 읽음]
    F --> M[친구 add/accept]
    M --> N[친구 차단]
    G --> O[ROOM notice/pin]
    G --> P[ROOM invite/kick/transfer]
    F --> Q[마이페이지]
    F --> R[설정 SETTINGS]
    I --> S[리액션]
    I --> T[검색]
    I --> U[타이핑]
    F --> V[관리자]
    D --> W[TUI 부분재그리기]
    W --> X[테마/색상 적용]

    classDef p0 fill:#3b82f6,color:#fff
    classDef p1 fill:#22c55e,color:#fff
    classDef p2 fill:#eab308,color:#000
    classDef p3 fill:#ef4444,color:#fff
    class A,B,C,D,E,F,G,I,W p0
    class H,J,L,M,O,P,Q,R p1
    class K,S,T,U,N,X p2
    class V p3
```

## 크로스컷 의존

- 모든 DB 작업 → `07_database/connection_pooling.md` 의 MYSQL* 수명 규칙 준수
- 모든 패킷 파싱 → `08_api/packet_format.md` 검증 선행
- 모든 fan-out → `03_architecture/threading_model.md` 의 mutex 규약 준수
- 모든 권한 작업 → `05_security/authorization.md` 매트릭스 따르기

## 외부 요소

- MySQL 서버 설치 및 `schema.sql` 적용 → P0 의 `DB connect 레이어` 이전 필수.
- Windows MinGW 환경에서는 `libmysqlclient.a` 또는 `mariadb-connector-c` 정적 빌드 사전 준비 필요.
