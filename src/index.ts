import "reflect-metadata";
import * as dotenv from "dotenv";
import { initializeDatabase, AppDataSource } from "./config/database";
import { ArbitrageScheduler } from "./scheduler/arbitrageScheduler";

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Initialize database
    await initializeDatabase();

    // Start scheduler
    const schedule = process.env.CRON_SCHEDULE || "*/5 * * * *";
    const scheduler = new ArbitrageScheduler(schedule);
    scheduler.start();

    // Graceful shutdown handling
    const shutdown = async () => {
      console.log("\nShutdown signal received...");
      scheduler.stop();
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log("Database connection closed");
      }
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

main();
