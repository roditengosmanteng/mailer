module.exports = {
  apps: [
    {
      name: "mailer",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: "file:./prisma/dev.db"
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: "file:./prisma/dev.db"
      }
    }
  ]
};
