#!/usr/bin/env bash
# Deploys one commit of the Intellia360 backend API (apps/backend) on the EC2
# host. The frontend is deployed separately, to S3 (frontend-deploy.yml).
# Run as the app user, always using the copy of this script from the commit
# being deployed:
#
#   cd /srv/intellia360
#   git -C repo.git fetch -q origin '+refs/heads/*:refs/heads/*'
#   git -C repo.git show <sha|branch>:deploy/deploy.sh | bash -s -- <sha|branch>
#
# GitHub Actions runs exactly that through SSM (.github/workflows/backend-deploy.yml).
# Layout it expects (created once, see docs/DEPLOYMENT-AWS.md):
#
#   /srv/intellia360/
#     repo.git/          bare mirror of the GitHub repo (read-only deploy key)
#     shared/.env        production environment (never in git)
#     releases/<stamp>/  one directory per deploy
#     current ->         symlink to the live release
#
# Each release is built in its own directory before going live, so a failed
# install or build never touches the running app. If the new release fails its
# health check the previous one is restored.
#
# The API runs as a single PM2 fork process, so switching releases restarts it
# (a few seconds of 502s through CloudFront). The process is deleted and started
# rather than reloaded because PM2 keeps a process's original cwd on reload.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/intellia360}"
REF="${1:-main}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/api/health}"

log() { printf '[deploy] %s\n' "$*"; }

start_app() {
  pm2 delete intellia360-api >/dev/null 2>&1 || true
  pm2 start "$APP_ROOT/current/deploy/ecosystem.config.js"
  pm2 save
}

cd "$APP_ROOT"

log "fetching $REF"
git -C repo.git fetch --prune origin '+refs/heads/*:refs/heads/*'
SHA="$(git -C repo.git rev-parse --verify "${REF}^{commit}")"
RELEASE="$APP_ROOT/releases/$(date -u +%Y%m%d%H%M%S)-${SHA:0:7}"
PREVIOUS="$(readlink -f "$APP_ROOT/current" || true)"

log "building ${SHA} in ${RELEASE}"
mkdir -p "$RELEASE"
git -C repo.git archive "$SHA" | tar -x -C "$RELEASE"
echo "$SHA" > "$RELEASE/REVISION"

# Next.js, Prisma and the db:* scripts all read apps/backend/.env, so link it
# before anything runs.
ln -sfn "$APP_ROOT/shared/.env" "$RELEASE/apps/backend/.env"

cd "$RELEASE"
npm ci --no-audit --no-fund
npm run prisma:generate

# Editor saves are written into the live release's apps/backend/src/data/grades
# and mirrored to MongoDB. A fresh release only has the files from git, so
# rehydrate the editor's work from the mirror before building
# (see docs/DATABASE-BACKUP-RECOVERY.md).
npm run db:restore-curriculum

npm run build:backend

log "switching current -> ${RELEASE}"
ln -sfn "$RELEASE" "$APP_ROOT/current.tmp"
mv -Tf "$APP_ROOT/current.tmp" "$APP_ROOT/current"

start_app

healthy=false
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "$HEALTH_URL"; then healthy=true; break; fi
  sleep 2
done

if [[ "$healthy" != true ]]; then
  log "health check failed: $HEALTH_URL"
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    log "rolling back to $PREVIOUS"
    ln -sfn "$PREVIOUS" "$APP_ROOT/current.tmp"
    mv -Tf "$APP_ROOT/current.tmp" "$APP_ROOT/current"
    start_app
  fi
  exit 1
fi

# Catch editor saves made on the old release while this one was building.
(cd "$APP_ROOT/current" && npm run db:restore-curriculum) || log "warning: post-switch curriculum restore failed"

log "pruning old releases (keeping ${KEEP_RELEASES})"
ls -1dt "$APP_ROOT"/releases/*/ | tail -n +"$((KEEP_RELEASES + 1))" | xargs -r rm -rf

log "deployed ${SHA}"
