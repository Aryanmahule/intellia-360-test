# Intellia360 — AWS Deployment Runbook

How Intellia360 runs on AWS, how to build the environment once, and how
deploys work. Replace these placeholders throughout:

| Placeholder | Example |
|---|---|
| `yourdomain.com` | the public domain (the frontend) |
| `api.yourdomain.com` | the API host; **must be a subdomain of the frontend's domain** (see 1.2) |
| `<REGION>` | `ap-south-1` |
| `<ACCOUNT_ID>` | 12-digit AWS account id |
| `<INSTANCE_ID>` | `i-0123456789abcdef0` |
| `<BUCKET>` | `intellia360-frontend-prod` |
| `<FRONTEND_DIST_ID>`, `<API_DIST_ID>` | CloudFront distribution ids |

---

## 1. Architecture

```
                              GitHub (Intellia-SG/intellia360)
                  ┌──────────────────────┴──────────────────────┐
     frontend-deploy.yml                                 backend-deploy.yml
     apps/frontend → next build (static export)          apps/backend → SSM → deploy/deploy.sh
                  │                                              │
                  ▼                                              ▼
   yourdomain.com ─ Route 53 ─▶ CloudFront ─▶ S3        api.yourdomain.com ─ Route 53 ─▶ CloudFront
                   (ACM cert, router function,                  (ACM cert, no caching)
                    security headers policy)                           │ HTTP + X-Origin-Verify
                                                                       ▼
            browser ── fetch(credentials: include) ──────────▶  EC2: Nginx :80 → PM2 → next start :4000
                                                                       │
                                                                       ▼
                                                              MongoDB Atlas (EC2 Elastic IP only)
```

| Piece | Where it runs | Source |
|---|---|---|
| Frontend: pages, UI, route guards | S3 + CloudFront (static files) | `apps/frontend` |
| Backend API: `/api/*`, auth, database, curriculum store, AI tutor | EC2 (Nginx + PM2) | `apps/backend` |
| Shared role rules and API types | compiled into both | `packages/shared` |

### 1.1 What moved to the browser or to CloudFront

A static site has no server. Before the split, the Next.js server did these
jobs; now they happen here:

| Before (one Next.js server) | Now |
|---|---|
| `proxy.ts` redirected signed-out visitors to `/login?next=…` and wrong roles to their dashboard | `RouteGuard` (`apps/frontend/src/components/auth/RouteGuard.tsx`) applies the same rules in the browser, from `/api/auth/me`. Every API route still authorizes each request itself. |
| `next.config.ts` sent the CSP, HSTS, X-Frame-Options, etc. | CloudFront response headers policy (`deploy/cloudfront/frontend-security-headers.json`). The API keeps its own headers. |
| `/api/...` on the same origin | `NEXT_PUBLIC_API_URL`, with the session cookie sent via `credentials: "include"` (`apps/frontend/src/lib/api.ts`) |
| Dynamic pages (`/student/lesson/[id]`, …) rendered per id | One exported shell per route. The CloudFront function (`deploy/cloudfront/frontend-router.js`) serves it for every id. |
| Same-origin requests only | The API sends CORS headers for `CORS_ORIGIN` and rejects state-changing requests from any other origin (`apps/backend/src/proxy.ts`) |

**Behavior differences**, everything else is identical:
- Protected pages' JavaScript is now a public static file. It contains no data;
  all data still comes from the API, which authorizes every request.
- Protected pages render after a session check, instead of arriving already
  redirected.

### 1.2 Domains: the login cookie needs a shared parent domain

The session cookie is `httpOnly; Secure; SameSite=Lax`. It is set by the API
and sent with the frontend's API calls. Browsers only allow this when both hosts
share the same registrable domain (**same-site**), e.g. `yourdomain.com` and
`api.yourdomain.com`.

Serving either one from a `*.cloudfront.net` name, or from a different domain,
makes the cookie third-party. Browsers then block it and sign-in stops working.

---

## 2. One-time AWS setup

### 2.1 MongoDB

Use MongoDB Atlas. Prisma's MongoDB connector needs a replica set, and every
Atlas tier is one.

- Create a database user with `readWrite` on the app database only.
- **Network Access:** allow only the EC2 Elastic IP (2.3). Never `0.0.0.0/0`.

### 2.2 IAM role for the instance

Create role `intellia360-ec2` (trusted entity: EC2) with these managed
policies:

- `AmazonSSMManagedInstanceCore`: Session Manager and SSM Run Command
- `CloudWatchAgentServerPolicy`: logs and metrics, including deploy output

### 2.3 EC2 instance (API)

| Setting | Value |
|---|---|
| AMI | Ubuntu Server 24.04 LTS (x86_64) |
| Type | `t3.small` (2 GB) + the 2 GB swap below, or `t3.medium` |
| Storage | 20 GB gp3 |
| IAM instance profile | `intellia360-ec2` |
| Key pair | none, shell access is through Session Manager |
| Elastic IP | allocate and associate. Atlas allowlists it, and the API distribution uses its public DNS name. |

**Security group `intellia360-api`:**

| Direction | Port | Source |
|---|---|---|
| Inbound | 80/tcp | managed prefix list `com.amazonaws.global.cloudfront.origin-facing` |
| Inbound | 22/tcp | **none.** Use Session Manager. If you must use SSH, allow only your office IP /32. |
| Outbound | all | default (npm, GitHub, Atlas, Resend, Groq, Google Drive) |

### 2.4 Server bootstrap

Open **Systems Manager → Session Manager → Start session**, then:

```bash
sudo -i
apt-get update && apt-get -y upgrade
apt-get install -y nginx git curl jq
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pm2

# Swap (next build needs more than 2 GB on a t3.small)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

useradd --create-home --shell /bin/bash intellia
mkdir -p /srv/intellia360/{releases,shared/backups}
chown -R intellia:intellia /srv/intellia360
env PATH=$PATH:/usr/bin pm2 startup systemd -u intellia --hp /home/intellia
```

**Read-only GitHub deploy key.** Run as the app user:

```bash
sudo -iu intellia
ssh-keygen -t ed25519 -f ~/.ssh/intellia360_deploy -N "" -C "intellia360-ec2"
cat ~/.ssh/intellia360_deploy.pub
#  → GitHub repo → Settings → Deploy keys → Add (leave "Allow write access" OFF)
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/intellia360_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh-keyscan github.com >> ~/.ssh/known_hosts
git clone --mirror git@github.com:Intellia-SG/intellia360.git /srv/intellia360/repo.git
```

**API environment file.** This is the only place API secrets live; see
section 4 for the values.

```bash
sudo -iu intellia
git -C /srv/intellia360/repo.git show main:apps/backend/.env.example > /srv/intellia360/shared/.env
chmod 600 /srv/intellia360/shared/.env
nano /srv/intellia360/shared/.env
```

**PM2 log rotation:**

```bash
sudo -iu intellia pm2 install pm2-logrotate
sudo -iu intellia pm2 set pm2-logrotate:max_size 20M
sudo -iu intellia pm2 set pm2-logrotate:retain 14
```

### 2.5 First API deploy, indexes, admin account

```bash
sudo -iu intellia
cd /srv/intellia360
git -C repo.git show main:deploy/deploy.sh | bash -s -- main
```

This builds `apps/backend` and starts it under PM2 on `127.0.0.1:4000`. The
deploy's health check is `GET /api/health`, which also pings MongoDB. Then,
once only:

```bash
cd /srv/intellia360/current
npm run db:indexes                               # prisma db push: collections + indexes
npm run db:restore-curriculum -- --seed-mirror   # import shipped curriculum into the DB mirror
```

**Create the platform admin before the API is public.** Set `ADMIN_EMAIL`,
`ADMIN_NAME` and `ADMIN_PASSWORD` in `shared/.env` first. Until an admin exists,
`/api/admin/seed-admin` needs no login, so run it from the server itself:

```bash
curl -s -X POST http://127.0.0.1:4000/api/admin/seed-admin
```

Do **not** run `npm run seed` in production: it also creates demo accounts that
share the password `Password123!`.

### 2.6 Nginx

```bash
sudo -i
ORIGIN_SECRET=$(openssl rand -hex 32); echo "Save for the API CloudFront origin: $ORIGIN_SECRET"
cat > /etc/nginx/snippets/intellia360-origin-verify.conf <<EOF
if (\$http_x_origin_verify != "$ORIGIN_SECRET") { return 403; }
EOF
chmod 640 /etc/nginx/snippets/intellia360-origin-verify.conf
cp /srv/intellia360/current/deploy/nginx/intellia360.conf /etc/nginx/sites-available/intellia360
ln -sf /etc/nginx/sites-available/intellia360 /etc/nginx/sites-enabled/intellia360
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

If a later release changes `deploy/nginx/intellia360.conf`, copy it again and
reload Nginx. Deploys don't touch `/etc/nginx`.

### 2.7 ACM certificate

Request it in **us-east-1**; CloudFront only uses certificates from that region.

- Request one public certificate for `yourdomain.com`, `www.yourdomain.com` and
  `api.yourdomain.com`.
- Choose DNS validation, then **Create records in Route 53**.

### 2.8 S3 bucket (frontend)

- Create bucket `<BUCKET>` in `<REGION>`.
- **Block all public access: on.** Only CloudFront reads it, through Origin
  Access Control (2.9).
- Versioning is optional; it lets you roll back a bad upload.

### 2.9 CloudFront: frontend distribution (`yourdomain.com`)

**a. Router function.** Go to CloudFront → Functions → Create:

- Name: `intellia360-frontend-router`
- Runtime: `cloudfront-js-2.0`
- Code: `deploy/cloudfront/frontend-router.js`
- Then **Publish**.

It maps `/login` to `login.html` and serves each dynamic route's shell for any
id. Later deploys republish it automatically (`FRONTEND_ROUTER_FUNCTION_NAME`
variable).

**b. Response headers policy:**

```bash
# replace https://api.yourdomain.com in the file first
aws cloudfront create-response-headers-policy \
  --response-headers-policy-config file://deploy/cloudfront/frontend-security-headers.json
```

**c. Distribution**

| Setting | Value |
|---|---|
| Origin | the S3 bucket (REST endpoint, not the website endpoint), with **Origin access control**. Accept the prompt to update the bucket policy. |
| Viewer protocol | Redirect HTTP to HTTPS |
| Allowed methods | GET, HEAD |
| Cache policy | `CachingOptimized` |
| Function association | viewer request → `intellia360-frontend-router` |
| Response headers policy | `intellia360-frontend-security-headers` |
| Compression | on |
| Alternate domain names | `yourdomain.com`, `www.yourdomain.com` |
| Certificate | the ACM certificate from 2.7; security policy TLSv1.2_2021 |
| Default root object | `index.html` |
| Custom error responses | 403 → `/404.html`, response code 404; 404 → `/404.html`, response code 404 |

### 2.10 CloudFront: API distribution (`api.yourdomain.com`)

**Origin**

| Setting | Value |
|---|---|
| Domain | the Elastic IP's public DNS (`ec2-…<REGION>.compute.amazonaws.com`) |
| Protocol | HTTP only, port 80 |
| Custom header | `X-Origin-Verify` = the secret from 2.6 |
| Response timeout | 60 s (AI tutor calls) |

**Default behavior**

| Setting | Value |
|---|---|
| Viewer protocol | Redirect HTTP to HTTPS |
| Allowed methods | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE |
| Cache policy | `CachingDisabled` |
| Origin request policy | `AllViewerAndCloudFrontHeaders-2022-06` |
| Response headers policy | none |

The origin request policy forwards `Origin` for CORS, the cookie, `Host`, and
`CloudFront-Viewer-Address` (Nginx uses it as the real client IP for rate
limiting).

**Distribution settings:** alternate domain name `api.yourdomain.com`, the same
certificate, TLSv1.2_2021.

### 2.11 Route 53

In the `yourdomain.com` hosted zone:

| Name | Records | Alias target |
|---|---|---|
| `yourdomain.com`, `www.yourdomain.com` | A + AAAA | the frontend distribution |
| `api.yourdomain.com` | A + AAAA | the API distribution |

Outside AWS:

- **Google Cloud console** (OAuth client): add `https://yourdomain.com` (and
  `www`) to *Authorised JavaScript origins*.
- **Resend:** verify `yourdomain.com` if `RESEND_FROM` uses it.

### 2.12 GitHub Actions → AWS (OIDC, no stored keys)

1. **IAM → Identity providers → Add provider:** OpenID Connect,
   `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
2. **Create role `intellia360-github-deploy`** with this trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:Intellia-SG/intellia360:environment:production"
      }
    }
  }]
}
```

   And this inline permissions policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BackendDeployViaSsm",
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ec2:<REGION>:<ACCOUNT_ID>:instance/<INSTANCE_ID>",
        "arn:aws:ssm:<REGION>::document/AWS-RunShellScript"
      ]
    },
    { "Sid": "BackendDeployStatus", "Effect": "Allow", "Action": "ssm:GetCommandInvocation", "Resource": "*" },
    {
      "Sid": "FrontendUpload",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::<BUCKET>", "arn:aws:s3:::<BUCKET>/*"]
    },
    {
      "Sid": "FrontendInvalidate",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<FRONTEND_DIST_ID>"
    },
    {
      "Sid": "FrontendRouterFunction",
      "Effect": "Allow",
      "Action": ["cloudfront:DescribeFunction", "cloudfront:UpdateFunction", "cloudfront:PublishFunction"],
      "Resource": "arn:aws:cloudfront::<ACCOUNT_ID>:function/intellia360-frontend-router"
    }
  ]
}
```

3. **GitHub repo → Settings:**
   - **Environments:** create `production`. Adding required reviewers there
     gates every deploy on approval.
   - **Secrets and variables → Actions → Secrets:** `AWS_DEPLOY_ROLE_ARN`.
   - **Variables:**

| Variable | Value |
|---|---|
| `AWS_REGION` | `<REGION>` |
| `EC2_INSTANCE_ID` | `<INSTANCE_ID>` |
| `FRONTEND_S3_BUCKET` | `<BUCKET>` |
| `FRONTEND_CLOUDFRONT_DISTRIBUTION_ID` | `<FRONTEND_DIST_ID>` |
| `FRONTEND_ROUTER_FUNCTION_NAME` | `intellia360-frontend-router` |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | the OAuth client id |

### 2.13 CloudWatch

```bash
sudo -i
curl -fsSLo /tmp/cwagent.deb https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i /tmp/cwagent.deb
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s \
  -c file:/srv/intellia360/current/deploy/cloudwatch-agent.json
```

This creates:

- log groups `/intellia360/app` (PM2), `/intellia360/nginx` and
  `/intellia360/deploy` (deploy output);
- metrics `Intellia360/mem_used_percent`, `used_percent` and
  `swap_used_percent`.

Alarms to create, with an SNS email topic:

| Alarm | Condition |
|---|---|
| EC2 `StatusCheckFailed` | ≥ 1 for 2 min, plus the *Recover instance* action |
| EC2 `CPUUtilization` | > 80 % for 15 min |
| `mem_used_percent` | > 90 % for 10 min |
| disk `used_percent` | > 85 % |
| CloudFront `5xxErrorRate` | > 5 % for 5 min, on both distributions (metrics live in us-east-1) |

Optionally add a Route 53 health check on `https://api.yourdomain.com/api/health`.

---

## 3. Deploying

| Push to `main` touching… | Runs | Result |
|---|---|---|
| `apps/frontend/**`, `packages/shared/**`, `apps/backend/src/data/grades/*/curriculum.json`, `deploy/cloudfront/**` | `frontend-deploy.yml` | build → `check:routes` → S3 sync → publish router → invalidate |
| `apps/backend/**`, `packages/shared/**`, `deploy/deploy.sh`, `deploy/ecosystem.config.js` | `backend-deploy.yml` | type-check + build → SSM → `deploy/deploy.sh` on EC2 |

Pull requests run the build and check jobs only. Each workflow can also be run
by hand from **Actions → Run workflow**.

**Backend deploy** (`deploy/deploy.sh`):

1. Extracts the commit into `releases/<stamp>-<sha>` and links `shared/.env`
   into it.
2. Runs `npm ci`, then `prisma generate`, then `db:restore-curriculum`, then
   the backend build.
3. Switches `current` to the new release and restarts PM2 (a few seconds of
   502s).
4. Health-checks `/api/health`, and rolls back automatically on failure.
5. Keeps the newest 5 releases.

**Frontend deploy:**

- Content-hashed `/_next/static/*` files are cached for a year. Old ones are
  kept, so open tabs keep working.
- Pages are cached at the edge until the invalidation, and browsers revalidate
  them on every load.

**Manual rollback:**

- **Frontend:** re-run an earlier successful *Frontend* workflow (Actions → the
  run → Re-run jobs), or restore object versions if the bucket is versioned.
- **API:**

```bash
sudo -iu intellia
ls -1dt /srv/intellia360/releases/*/          # newest first
ln -sfn /srv/intellia360/releases/<previous> /srv/intellia360/current
pm2 delete intellia360-api; pm2 start /srv/intellia360/current/deploy/ecosystem.config.js; pm2 save
```

**Schema changes:** deploys never run `prisma db push`. After a release that
changes `prisma/schema.prisma`, run `npm run db:indexes` from
`/srv/intellia360/current`.

**Curriculum edits in the editor** are saved by the API. The student UI bundles
each grade's `curriculum.json` at frontend build time (the same as before the
split), so a curriculum change reaches students on the next frontend build,
which a commit of that file triggers.

**Backups** keep running from `.github/workflows/database-backup.yml`; see
[DATABASE-BACKUP-RECOVERY.md](DATABASE-BACKUP-RECOVERY.md).

---

## 4. Environment

### 4.1 API: `/srv/intellia360/shared/.env` (template `apps/backend/.env.example`)

| Variable | Production value |
|---|---|
| `DATABASE_URL` | Atlas connection string |
| `AUTH_JWT_SECRET` | new random value, ≥ 64 chars: `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"` |
| `AUTH_JWT_EXPIRES_IN` | `7d` |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | platform admin (2.5) |
| `NEXT_PUBLIC_APP_URL`, `FRONTEND_URL` | `https://yourdomain.com`, the **frontend**, used in email links |
| `CORS_ORIGIN` | `https://yourdomain.com,https://www.yourdomain.com` |
| `RESEND_API_KEY`, `RESEND_FROM` | Resend key, sender on the verified domain |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `true` once `RESEND_FROM` is verified |
| `GOOGLE_CLIENT_ID` | OAuth client id |
| `GROQ_API_KEY` (and optionally `GROQ_MODEL`) | AI tutor |
| `BACKUP_DIR` | `/srv/intellia360/shared/backups` |

### 4.2 Frontend: GitHub repository variables (template `apps/frontend/.env.example`)

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (2.12). They are
compiled into the static files, so changing one requires a frontend redeploy.
They are not secrets.

---

## 5. Security checklist

- [ ] **No committed secrets:** `.gitignore` blocks every `.env*` file except
      the `.env.example` templates. Check with `git ls-files | grep -i '\.env'`.
- [ ] **Where secrets live:** API secrets only in `/srv/intellia360/shared/.env`
      (mode 600); GitHub holds only `AWS_DEPLOY_ROLE_ARN`. There are no AWS
      access keys anywhere: GitHub uses OIDC and EC2 its instance role.
- [ ] **S3 is private:** Block Public Access is on and only CloudFront (OAC)
      can read the bucket.
- [ ] **EC2 is closed off:** port 80 only from the CloudFront prefix list, no
      SSH (Session Manager instead).
- [ ] **Nginx checks the origin secret:** it rejects requests without
      `X-Origin-Verify`, and Next.js listens on `127.0.0.1:4000` only.
- [ ] **CORS is exact:** `CORS_ORIGIN` lists only the frontend origins.
      - `curl -X POST -H "Origin: https://evil.example" https://api.yourdomain.com/api/auth/login`
        returns 403.
      - A preflight from an unlisted origin returns 403 with no
        `Access-Control-Allow-*` headers.
- [ ] **HTTPS everywhere:** both distributions redirect HTTP, use TLS 1.2+ with
      ACM, and send HSTS (the frontend via its headers policy, the API via
      `next.config.ts`).
- [ ] **Security headers:** the frontend CSP's `connect-src` names only the real
      API origin.
- [ ] **Database access:** Atlas network access is limited to the Elastic IP,
      and the database user has least privilege.
- [ ] **Admin bootstrap:** the admin was created via `seed-admin` before going
      public (it now returns 410), and the demo seed was not run.
- [ ] **Error responses:** spot-check that failing API calls return a generic
      message, with stack traces only in `/intellia360/app`.

**Notes**

- **HSTS covers subdomains.** Both HSTS headers include
  `includeSubDomains; preload`, so every subdomain of `yourdomain.com` must
  serve HTTPS.
- **Known issue, pre-existing and not fixed here.**
  `apps/backend/scripts/restore-curriculum.mjs` filters with `deletedAt: null`,
  which in Prisma's MongoDB connector skips documents where the field was never
  written (normal editor saves). So the post-deploy restore currently restores
  nothing, and **editor changes made on the server are lost at the next backend
  deploy.** They remain in `curriculum_documents` and can be recovered once the
  filter uses the app's `notDeleted()` pattern:
  `OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }]`.
