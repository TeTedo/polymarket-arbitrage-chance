import "reflect-metadata";
import { DataSource } from "typeorm";
import { ArbitrageOpportunity } from "../entities/ArbitrageOpportunity";
import * as dotenv from "dotenv";
dotenv.config();
export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "opinion_arbitrage",
  synchronize: process.env.NODE_ENV !== "production", // 개발 환경에서만 자동 동기화
  logging: process.env.NODE_ENV === "development",
  entities: [ArbitrageOpportunity],
  migrations: ["src/migrations/**/*.ts"],
  subscribers: ["src/subscribers/**/*.ts"],
});

// 데이터소스 초기화
export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("데이터베이스 연결 성공");
  } catch (error) {
    console.error("데이터베이스 연결 실패:", error);
    throw error;
  }
}
