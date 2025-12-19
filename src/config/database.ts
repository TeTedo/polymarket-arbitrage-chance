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
  synchronize: process.env.NODE_ENV !== "production", // Auto-sync only in development
  logging: process.env.NODE_ENV === "development",
  entities: [ArbitrageOpportunity],
  migrations: ["src/migrations/**/*.ts"],
  subscribers: ["src/subscribers/**/*.ts"],
});

// Initialize data source
export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}
