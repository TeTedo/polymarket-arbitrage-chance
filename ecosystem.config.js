require("dotenv").config();

module.exports = {
  apps: [
    {
      name: "polymarket-arbitrage",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        POLYMARKET_API_BASE_URL: process.env.POLYMARKET_API_BASE_URL,
        CRON_SCHEDULE: process.env.CRON_SCHEDULE,
      },
      env_development: {
        NODE_ENV: process.env.NODE_ENV || "development",
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        POLYMARKET_API_BASE_URL: process.env.POLYMARKET_API_BASE_URL,
        CRON_SCHEDULE: process.env.CRON_SCHEDULE,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
