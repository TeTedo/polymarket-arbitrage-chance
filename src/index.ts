import "reflect-metadata";
import * as dotenv from "dotenv";
import { initializeDatabase, AppDataSource } from "./config/database";
import { ArbitrageScheduler } from "./scheduler/arbitrageScheduler";

// 환경 변수 로드
dotenv.config();

async function main() {
  try {
    // 데이터베이스 초기화
    await initializeDatabase();

    // 스케줄러 시작
    const schedule = process.env.CRON_SCHEDULE || "*/5 * * * *";
    const scheduler = new ArbitrageScheduler(schedule);
    scheduler.start();

    // Graceful shutdown 처리
    const shutdown = async () => {
      console.log("\n종료 신호 수신...");
      scheduler.stop();
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log("데이터베이스 연결 종료");
      }
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("애플리케이션 시작 실패:", error);
    process.exit(1);
  }
}

main();
