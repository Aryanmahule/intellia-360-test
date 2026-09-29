#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Intellia360 — EC2 server bootstrap
#
# Run this ONCE on a fresh Ubuntu 24.04 LTS instance via Session Manager.
# It installs every system dependency, sets up the app user and directory
# layout, configures swap, and prints the next manual steps.
#
# Usage (paste into the Session Manager terminal as root or with sudo -i):
#
#   curl -fsSL https://raw.githubusercontent.com/<YOUR_ORG>/intellia360/main/deploy/ec2-bootstrap.sh | sudo bash
#
#   — or copy-paste it directly after opening a session —
#
# After this script completes you still need to:
#   1. Add the printed public key to GitHub as a deploy key (read-only)
#   2. Edit /srv/intellia360/shared/.env with real production values
#   3. Run the first deploy: sudo -iu intellia bash /srv/intellia360/first-deploy.sh
#   4. Set up Nginx (this script installs and enables it; the origin secret
#      must be added by hand — see step 4 in the output below)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { printf "${GREEN}[bootstrap]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[bootstrap]${NC} %s\n" "$*"; }
step() { printf "\n${CYAN}━━━ %s ━━━${NC}\n" "$*"; }

# Must run as root
if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}Run as root: sudo bash ec2-bootstrap.sh${NC}"
  exit 1
fi

# ── Prompt for the GitHub repo ────────────────────────────────────────────────
# Accept as env var or prompt interactively
GITHUB_REPO="${GITHUB_REPO:-}"
if [[ -z "$GITHUB_REPO" ]]; then
  read -rp "GitHub repo (e.g. Intellia-SG/intellia360): " GITHUB_REPO
fi
if [[ -z "$GITHUB_REPO" ]]; then
  echo -e "${RED}GITHUB_REPO is required.${NC}"; exit 1
fi

APP_ROOT=/srv/intellia360
APP_USER=intellia

# ── 1. System packages ────────────────────────────────────────────────────────
step "System packages"
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get -y -q upgrade
DEBIAN_FRONTEND=noninteractive apt-get install -y -q nginx git curl jq openssl

# Node.js 22
log "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
apt-get install -y -q nodejs
log "Node.js $(node --version), npm $(npm --version)"

# PM2
log "Installing PM2..."
npm install -g pm2 --silent

# ── 2. Swap (2 GB) ────────────────────────────────────────────────────────────
step "Swap"
if swapon --show | grep -q /swapfile; then
  warn "Swap already configured — skipping"
else
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  log "2 GB swap enabled"
fi

# ── 3. App user ───────────────────────────────────────────────────────────────
step "App user: ${APP_USER}"
if id "$APP_USER" &>/dev/null; then
  warn "User ${APP_USER} already exists — skipping"
else
  useradd --create-home --shell /bin/bash "$APP_USER"
  log "Created user ${APP_USER}"
fi

# ── 4. Directory layout ───────────────────────────────────────────────────────
step "Directory layout"
mkdir -p "$APP_ROOT"/{releases,shared/backups}
chown -R "${APP_USER}:${APP_USER}" "$APP_ROOT"
log "Created $APP_ROOT/{releases,shared/backups}"

# ── 5. PM2 systemd startup ────────────────────────────────────────────────────
step "PM2 startup"
env PATH="$PATH:/usr/bin" pm2 startup systemd \
  -u "$APP_USER" --hp "/home/${APP_USER}" \
  --service-name "pm2-${APP_USER}" | tail -1 | bash || true
log "PM2 configured to start on boot"

# ── 6. GitHub deploy key ──────────────────────────────────────────────────────
step "GitHub deploy key"
DEPLOY_KEY="/home/${APP_USER}/.ssh/intellia360_deploy"

if [[ -f "${DEPLOY_KEY}.pub" ]]; then
  warn "Deploy key already exists at ${DEPLOY_KEY}"
else
  sudo -u "$APP_USER" bash -c "
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    ssh-keygen -t ed25519 -f '${DEPLOY_KEY}' -N '' -C 'intellia360-ec2'
    cat >> ~/.ssh/config <<'SSHEOF'
Host github.com
  IdentityFile ${DEPLOY_KEY}
  IdentitiesOnly yes
SSHEOF
    chmod 600 ~/.ssh/config
    ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
  "
  log "Deploy key created"
fi

PUBKEY=$(cat "${DEPLOY_KEY}.pub")

# ── 7. Clone the bare repo mirror ─────────────────────────────────────────────
step "Repository mirror"
REPO_DIR="$APP_ROOT/repo.git"

if [[ -d "$REPO_DIR/objects" ]]; then
  warn "Bare repo already exists at $REPO_DIR — skipping clone"
else
  log "Cloning git@github.com:${GITHUB_REPO}.git ..."
  log "NOTE: This will fail until you add the deploy key to GitHub (step 1 below)"
  sudo -u "$APP_USER" \
    git clone --mirror "git@github.com:${GITHUB_REPO}.git" "$REPO_DIR" 2>&1 || {
      warn "Clone failed — add the deploy key to GitHub first, then run:"
      warn "  sudo -iu ${APP_USER} git clone --mirror git@github.com:${GITHUB_REPO}.git ${REPO_DIR}"
    }
fi

# ── 8. Environment file ───────────────────────────────────────────────────────
step "Environment file"
ENV_FILE="$APP_ROOT/shared/.env"

if [[ -f "$ENV_FILE" ]]; then
  warn "$ENV_FILE already exists — not overwriting"
else
  # Try to extract template from the cloned repo; fall back to a minimal stub
  if [[ -d "$REPO_DIR/objects" ]]; then
    sudo -u "$APP_USER" \
      git -C "$REPO_DIR" show main:apps/backend/.env.example > "$ENV_FILE" 2>/dev/null || \
      git -C "$REPO_DIR" show HEAD:apps/backend/.env.example > "$ENV_FILE" 2>/dev/null || true
  fi

  if [[ ! -s "$ENV_FILE" ]]; then
    # Minimal stub if repo not yet cloned
    cat > "$ENV_FILE" <<'ENVEOF'
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/intellia360
AUTH_JWT_SECRET=CHANGE_ME_run_node_-e_console.log(require('crypto').randomBytes(64).toString('base64'))
AUTH_JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_NAME=Platform Admin
ADMIN_PASSWORD=CHANGE_ME
NEXT_PUBLIC_APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
GROQ_API_KEY=gsk_CHANGE_ME
RESEND_API_KEY=re_CHANGE_ME
RESEND_FROM=Intellia360 <onboarding@resend.dev>
AUTH_REQUIRE_EMAIL_VERIFICATION=false
GOOGLE_CLIENT_ID=CHANGE_ME.apps.googleusercontent.com
BACKUP_DIR=/srv/intellia360/shared/backups
ENVEOF
  fi

  chmod 600 "$ENV_FILE"
  chown "${APP_USER}:${APP_USER}" "$ENV_FILE"
  log "Created $ENV_FILE — MUST be edited before the first deploy"
fi

# ── 9. PM2 log rotation ───────────────────────────────────────────────────────
step "PM2 log rotation"
sudo -u "$APP_USER" pm2 install pm2-logrotate --silent 2>/dev/null || true
sudo -u "$APP_USER" pm2 set pm2-logrotate:max_size 20M 2>/dev/null || true
sudo -u "$APP_USER" pm2 set pm2-logrotate:retain 14   2>/dev/null || true
log "PM2 log rotation configured (20 MB / 14 files)"

# ── 10. Nginx — base configuration ───────────────────────────────────────────
step "Nginx"
# Create the snippets directory
mkdir -p /etc/nginx/snippets

# Generate an origin verify secret and save it
ORIGIN_SECRET_FILE=/etc/nginx/snippets/intellia360-origin-verify.conf
if [[ -f "$ORIGIN_SECRET_FILE" ]]; then
  warn "$ORIGIN_SECRET_FILE already exists — not overwriting"
  ORIGIN_SECRET="<already set — check ${ORIGIN_SECRET_FILE}>"
else
  ORIGIN_SECRET=$(openssl rand -hex 32)
  cat > "$ORIGIN_SECRET_FILE" <<EOF
if (\$http_x_origin_verify != "${ORIGIN_SECRET}") { return 403; }
EOF
  chmod 640 "$ORIGIN_SECRET_FILE"
  log "Origin verify secret written to $ORIGIN_SECRET_FILE"
fi

# Install the Nginx site config from the repo (if available)
NGINX_CONF_SRC="$APP_ROOT/repo.git"
NGINX_DEST=/etc/nginx/sites-available/intellia360

if [[ -d "${NGINX_CONF_SRC}/objects" ]]; then
  git -C "$NGINX_CONF_SRC" show main:deploy/nginx/intellia360.conf > "$NGINX_DEST" 2>/dev/null || \
    git -C "$NGINX_CONF_SRC" show HEAD:deploy/nginx/intellia360.conf  > "$NGINX_DEST" 2>/dev/null || true
fi

if [[ -f "$NGINX_DEST" ]]; then
  ln -sf "$NGINX_DEST" /etc/nginx/sites-enabled/intellia360
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx && log "Nginx configured and reloaded"
else
  warn "deploy/nginx/intellia360.conf not available yet — install it after the first deploy:"
  warn "  git -C $REPO_DIR show main:deploy/nginx/intellia360.conf > $NGINX_DEST"
  warn "  ln -sf $NGINX_DEST /etc/nginx/sites-enabled/intellia360"
  warn "  rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx"
fi

# ── 11. First-deploy helper script ───────────────────────────────────────────
step "First-deploy helper"
FIRST_DEPLOY="$APP_ROOT/first-deploy.sh"
cat > "$FIRST_DEPLOY" <<FDEOF
#!/usr/bin/env bash
# Run as the app user AFTER editing shared/.env:
#   sudo -iu ${APP_USER} bash ${FIRST_DEPLOY}
set -euo pipefail
cd "$APP_ROOT"

echo "[first-deploy] Fetching latest code..."
git -C repo.git fetch -q origin '+refs/heads/*:refs/heads/*'

echo "[first-deploy] Running deploy.sh..."
git -C repo.git show main:deploy/deploy.sh | bash -s -- main

echo "[first-deploy] Creating DB indexes..."
cd "$APP_ROOT/current"
npm run db:indexes

echo "[first-deploy] Seeding curriculum mirror..."
npm run db:restore-curriculum -- --seed-mirror

echo "[first-deploy] Creating platform admin..."
curl -s -X POST http://127.0.0.1:4000/api/admin/seed-admin | tee /tmp/seed-admin.json
echo ""

echo "[first-deploy] Done. Check /tmp/seed-admin.json for the result."
echo "[first-deploy] API health: \$(curl -sf http://127.0.0.1:4000/api/health || echo FAILED)"
FDEOF
chmod +x "$FIRST_DEPLOY"
chown "${APP_USER}:${APP_USER}" "$FIRST_DEPLOY"
log "Wrote $FIRST_DEPLOY"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Bootstrap complete. Follow these steps in order:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Step 1 — Add the deploy key to GitHub (read-only):${NC}"
echo ""
echo "  GitHub → https://github.com/${GITHUB_REPO}/settings/keys → Add deploy key"
echo ""
echo "  Public key to paste:"
echo ""
echo "  $PUBKEY"
echo ""
echo -e "${CYAN}Step 2 — Clone the repo mirror (if step 1 failed earlier):${NC}"
echo ""
echo "  sudo -iu ${APP_USER} git clone --mirror git@github.com:${GITHUB_REPO}.git ${APP_ROOT}/repo.git"
echo ""
echo -e "${CYAN}Step 3 — Edit the environment file:${NC}"
echo ""
echo "  sudo -iu ${APP_USER} nano ${APP_ROOT}/shared/.env"
echo ""
echo "  Required values before first deploy:"
echo "    DATABASE_URL        — MongoDB Atlas connection string"
echo "    AUTH_JWT_SECRET     — 64+ random chars (run: node -e \"console.log(require('crypto').randomBytes(64).toString('base64'))\")"
echo "    NEXT_PUBLIC_APP_URL — https://yourdomain.com"
echo "    FRONTEND_URL        — https://yourdomain.com"
echo "    CORS_ORIGIN         — https://yourdomain.com,https://www.yourdomain.com"
echo "    ADMIN_EMAIL         — your admin email"
echo "    ADMIN_PASSWORD      — strong password"
echo ""
echo -e "${CYAN}Step 4 — Add the CloudFront origin secret to Nginx:${NC}"
echo ""
if [[ "$ORIGIN_SECRET" != "<already set"* ]]; then
  echo "  Secret: ${YELLOW}${ORIGIN_SECRET}${NC}"
  echo ""
  echo "  Add this exact value as the X-Origin-Verify custom header on the"
  echo "  API CloudFront distribution (§6b of docs/AWS-DEPLOY-GUIDE.md)."
  echo "  It is already saved to ${ORIGIN_SECRET_FILE}."
else
  echo "  Check $ORIGIN_SECRET_FILE for the existing secret."
fi
echo ""
echo -e "${CYAN}Step 5 — Run the first deploy:${NC}"
echo ""
echo "  sudo -iu ${APP_USER} bash ${FIRST_DEPLOY}"
echo ""
echo -e "${CYAN}Step 6 — Install CloudWatch agent (optional but recommended):${NC}"
echo ""
echo "  curl -fsSLo /tmp/cwagent.deb https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb"
echo "  dpkg -i /tmp/cwagent.deb"
echo "  /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s \\"
echo "    -c file:${APP_ROOT}/current/deploy/cloudwatch-agent.json"
echo ""
echo -e "${GREEN}Full deployment guide: docs/AWS-DEPLOY-GUIDE.md${NC}"
echo ""
