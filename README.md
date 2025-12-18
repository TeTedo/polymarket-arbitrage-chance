# Polymarket 아비트라지 기회 포착 시스템

Polymarket 예측시장에서 fullset을 이용한 아비트라지 기회를 자동으로 포착하고 데이터베이스에 저장하는 스케줄링 시스템입니다.

## 기능

- Polymarket API에서 마켓 및 오더북 데이터 주기적으로 수집
- Yes/No 토큰 페어의 fullset 가격 계산
- 아비트라지 기회 감지:
  - 즉시 구매 가격이 100 미만인 경우
  - 즉시 판매 가격이 100 초과인 경우
- 발견된 기회를 MySQL 데이터베이스에 저장

## 기술 스택

- Node.js
- TypeScript
- TypeORM
- MySQL
- node-cron (스케줄링)
- axios (API 호출)

## 설치

```bash
npm install
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=polymarket_arbitrage

# Polymarket API Configuration
POLYMARKET_API_BASE_URL=https://clob.polymarket.com
POLYMARKET_API_KEY=YOUR_API_KEY

# Scheduler Configuration
CRON_SCHEDULE=*/5 * * * *  # 5분마다 실행

# Environment
NODE_ENV=development
```

## 데이터베이스 설정

MySQL 데이터베이스를 생성하세요:

```sql
CREATE DATABASE polymarket_arbitrage;
```

TypeORM이 자동으로 테이블을 생성합니다 (개발 환경에서 `synchronize: true` 설정).

## 실행

### 개발 모드

```bash
npm run dev
```

### 프로덕션 모드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
src/
├── api/
│   └── polymarketClient.ts      # Polymarket API 클라이언트
├── config/
│   └── database.ts               # TypeORM 데이터소스 설정
├── entities/
│   └── ArbitrageOpportunity.ts  # 아비트라지 기회 엔티티
├── scheduler/
│   └── arbitrageScheduler.ts    # 스케줄러
├── services/
│   └── arbitrageService.ts      # 아비트라지 로직 서비스
├── types/
│   └── polymarket.ts            # TypeScript 타입 정의
└── index.ts                     # 메인 진입점
```

## 스케줄 설정

Cron 표현식을 사용하여 실행 주기를 설정할 수 있습니다:

- `*/5 * * * *` - 5분마다
- `*/1 * * * *` - 1분마다
- `0 * * * *` - 매시간

## 라이선스

ISC
