import * as cron from "node-cron";
import { ArbitrageService } from "../services/arbitrageService";
import { PolymarketClient } from "../api/polymarketClient";

export class ArbitrageScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private service: ArbitrageService;
  private schedule: string;

  constructor(schedule: string = "*/5 * * * *") {
    // Default: run every 5 minutes
    this.schedule = schedule;
    const client = new PolymarketClient(
      process.env.POLYMARKET_API_BASE_URL || "https://gamma-api.polymarket.com"
    );
    this.service = new ArbitrageService(client);
  }

  /**
   * Start scheduler
   */
  start(): void {
    if (this.cronJob) {
      console.log("Scheduler is already running.");
      return;
    }

    console.log(`Starting scheduler: ${this.schedule}`);

    // Run immediately once
    this.runTask();

    // Run periodically according to schedule
    this.cronJob = cron.schedule(this.schedule, () => {
      this.runTask();
    });

    console.log("Scheduler started.");
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("Scheduler stopped.");
    }
  }

  /**
   * Execute actual task
   */
  private async runTask(): Promise<void> {
    const startTime = Date.now();
    console.log(`\n[${new Date().toISOString()}] Starting arbitrage scan...`);

    try {
      await this.service.scanAndSaveOpportunities();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `[${new Date().toISOString()}] Scan completed (duration: ${duration}s)`
      );
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error during scan:`, error);
    }
  }
}
