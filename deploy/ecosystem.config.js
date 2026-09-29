/**
 * PM2 process file for the Intellia360 backend API (apps/backend) on EC2.
 *
 *   pm2 start deploy/ecosystem.config.js      (deploy.sh does this on each release)
 *
 * The API must run with apps/backend as its working directory: the curriculum
 * store and several routes resolve `src/data/...` from process.cwd().
 *
 * Environment variables are NOT defined here. `next start` loads them from
 * apps/backend/.env, which deploy.sh symlinks to the server's shared env file
 * (see docs/DEPLOYMENT-AWS.md). Never put secrets in this file.
 */
const path = require("path");

const appDir = path.resolve(__dirname, "../apps/backend");
// With npm workspaces `next` is hoisted to the repository root's node_modules.
const nextBin = require.resolve("next/dist/bin/next", { paths: [appDir] });

module.exports = {
  apps: [
    {
      name: "intellia360-api",
      cwd: appDir,
      script: nextBin,
      // Bound to localhost: only Nginx on the same host may reach the API.
      args: "start --port 4000 --hostname 127.0.0.1",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "1G",
      kill_timeout: 10000,
      time: true,
      merge_logs: true,
    },
  ],
};
