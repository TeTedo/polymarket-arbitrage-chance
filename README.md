# Polymarket Arbitrage Opportunity Detection System

An automated scheduling system that detects and stores arbitrage opportunities using fullsets in the Polymarket prediction market.

## Features

- Periodically collects market and orderbook data from Polymarket API
- Calculates fullset prices for Yes/No token pairs
- Detects arbitrage opportunities:
  - When immediate buy price (asks sum) is below 100
  - When immediate sell price (bids sum) is above 100
- Stores detected opportunities in MySQL database

## Tech Stack

- Node.js
- TypeScript
- TypeORM
- MySQL
- node-cron (Scheduling)
- axios (API calls)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file and configure the following variables:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=polymarket_arbitrage

# Polymarket API Configuration
POLYMARKET_API_BASE_URL=https://gamma-api.polymarket.com

# Scheduler Configuration
CRON_SCHEDULE=*/5 * * * *  # Run every 5 minutes

# Environment
NODE_ENV=development
```

## Database Setup

Create a MySQL database:

```sql
CREATE DATABASE polymarket_arbitrage;
```

TypeORM will automatically create tables (with `synchronize: true` in development environment).

## Running

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── api/
│   └── polymarketClient.ts      # Polymarket API client
├── config/
│   └── database.ts               # TypeORM data source configuration
├── entities/
│   └── ArbitrageOpportunity.ts  # Arbitrage opportunity entity
├── scheduler/
│   └── arbitrageScheduler.ts    # Scheduler
├── services/
│   └── arbitrageService.ts      # Arbitrage logic service
├── types/
│   └── polymarket.ts            # TypeScript type definitions
└── index.ts                     # Main entry point
```

## Schedule Configuration

You can configure the execution interval using cron expressions:

- `*/5 * * * *` - Every 5 minutes
- `*/1 * * * *` - Every minute
- `0 * * * *` - Every hour

## How It Works

1. **Market Discovery**: Fetches active markets from Polymarket API
2. **Price Calculation**: For each market, calculates:
   - Buy price: Sum of Yes and No token ask prices
   - Sell price: Sum of Yes and No token bid prices
3. **Arbitrage Detection**:
   - **Buy Opportunity**: When buy price < 100 (can buy fullset for less than 100)
   - **Sell Opportunity**: When sell price > 100 (can sell fullset for more than 100)
4. **Data Storage**: Saves detected opportunities to the database

## License

ISC
