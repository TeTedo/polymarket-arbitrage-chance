import * as cron from "node-cron";
import { ArbitrageService } from "../services/arbitrageService";
import { PolymarketClient } from "../api/polymarketClient";

export class ArbitrageScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private service: ArbitrageService;
  private schedule: string;

  constructor(schedule: string = "*/5 * * * *") {
    // 기본값: 5분마다 실행
    this.schedule = schedule;
    const client = new PolymarketClient(
      process.env.POLYMARKET_API_BASE_URL || "https://gamma-api.polymarket.com"
    );
    this.service = new ArbitrageService(client);
  }

  /**
   * 스케줄러 시작
   */
  start(): void {
    if (this.cronJob) {
      console.log("스케줄러가 이미 실행 중입니다.");
      return;
    }

    console.log(`스케줄러 시작: ${this.schedule}`);

    // 즉시 한 번 실행
    this.runTask();

    // 스케줄에 따라 주기적으로 실행
    this.cronJob = cron.schedule(this.schedule, () => {
      this.runTask();
    });

    console.log("스케줄러가 시작되었습니다.");
  }

  /**
   * 스케줄러 중지
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("스케줄러가 중지되었습니다.");
    }
  }

  /**
   * 실제 작업 실행
   */
  private async runTask(): Promise<void> {
    const startTime = Date.now();
    console.log(`\n[${new Date().toISOString()}] 아비트라지 스캔 시작...`);

    try {
      await this.service.scanAndSaveOpportunities();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `[${new Date().toISOString()}] 스캔 완료 (소요 시간: ${duration}초)`
      );
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 스캔 중 오류 발생:`, error);
    }
  }
}
