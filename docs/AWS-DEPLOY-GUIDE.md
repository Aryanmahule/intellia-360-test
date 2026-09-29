# Intellia360 — Step-by-Step AWS Deployment Guide

This guide walks you through deploying Intellia360 on AWS from scratch. It is
written against the actual files in this repository and supersedes the
architecture overview in `docs/DEPLOYMENT-AWS.md` (which remains the canonical
reference for the "why").

**Time estimate:** 3–4 hours for a first deployment.

---

## Before you start — what you need

| Requirement | Notes |
|---|---|
| AWS account | Academy Learner Lab or personal. See the Learner Lab caveats below. |
| Domain name | Required for the session cookie to work. See §0. |
| MongoDB Atlas account | Free tier (M0) is fine for development. |
| GitHub repository | Fork/push the repo so GitHub Actions can deploy it. |
| Node.js ≥ 22 on your local machine | `node --version` |
| npm ≥ 10 on your local machine | `npm --version` |

### AWS Academy Learner Lab caveats

Learner Labs restrict some services. Check these before continuing:

- Can you create IAM roles and OIDC identity providers? (needed for §7)
- Can you allocate an Elastic IP? (needed for §3)
- Can you create a CloudFront distribution? (needed for §5 and §6)
- Can you request an ACM certificate in `us-east-1`? (needed for §4)
- Can you create a Route 53 hosted zone? (needed for §8)

If IAM / OIDC is unavailable, see the **Learner Lab fallback** note in §7.

---

## §0 — Domain name (mandatory)

The session cookie is `httpOnly; Secure; SameSite=Lax`. It is set by the API
(`api.yourdomain.com`) and read by the frontend (`yourdomain.com`). Browsers
allow this **only** when both hosts share the same registrable domain.

Using default AWS hostnames (`*.cloudfront.net`, `ec2-….compute.amazonaws.com`)
puts the frontend and API on **different** domains — the cookie is blocked and
login never works.

**Minimum DNS setup required:**

| Record | Points to |
|---|---|
| `yourdomain.com` | Frontend CloudFront distribution |
| `www.yourdomain.com` | Same distribution |
| `api.yourdomain.com` | API CloudFront distribution |

If you do not yet own a domain, register one (Route 53 domains, Namecheap,
Google Domains, etc.) before continuing.

---

## §1 — Local setup and verification

Run from the repository root in PowerShell.

```powershell
# Check prerequisites
node --version   # must be v22.x or later
npm --version    # must be 10.x or later

# Install all workspace dependencies
npm install

# Copy environment templates
Copy-Item apps/backend/.env.example  apps/backend/.env
Copy-Item apps/frontend/.env.example apps/frontend/.env.local
```

Open `apps/backend/.env` and set the minimum values needed for a local build:

```ini
DATABASE_URL=mongodb://root:example@localhost:27017/intellia360?authSource=admin
AUTH_JWT_SECRET=<64-random-chars>   # generate below
NEXT_PUBLIC_APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

Generate a JWT secret (run in PowerShell):

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

Open `apps/frontend/.env.local` and set:

```ini
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Optional: start local MongoDB via Docker

```powershell
docker compose up -d
```

### Verify the build

```powershell
npm run prisma:generate
npm run build
```

Both apps must build without errors before you touch AWS. Fix any errors now —
they will be harder to diagnose on EC2.

---

## §2 — MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Create a project**.
2. Build a cluster. **M0 (free)** is sufficient for development; use M10+ for
   production.
3. **Database Access** → Add database user:
   - Username: `intellia360`
   - Password: generate a strong random password and save it
   - Role: `readWrite` on database `intellia360` only
4. **Network Access** → for now add `0.0.0.0/0` so you can connect while
   setting up. You will restrict this to the Elastic IP in §3.5.
5. **Connect** → Drivers → copy the connection string. It looks like:
   ```
   mongodb+srv://intellia360:<password>@cluster0.xxxxx.mongodb.net/intellia360
   ```
6. Test the connection from your local machine:
   ```powershell
   # Replace the URL with yours
   $env:DATABASE_URL="mongodb+srv://intellia360:PASSWORD@cluster0.xxxxx.mongodb.net/intellia360"
   npm run prisma:push
   ```
   A successful push prints `All Prisma schema changes are applied.`

---

## §3 — EC2 instance (API server)

### 3.1 Launch the instance

In the AWS console → EC2 → **Launch instance**:

| Setting | Value |
|---|---|
| Name | `intellia360-api` |
| AMI | Ubuntu Server 24.04 LTS (x86_64) |
| Instance type | `t3.small` (minimum — needs 2 GB swap added in §3.4) |
| Key pair | **Proceed without a key pair** — you will use Session Manager |
| Storage | 20 GiB gp3 |

### 3.2 Security group

Create a new security group named `intellia360-api`:

| Direction | Type | Port | Source |
|---|---|---|---|
| Inbound | Custom TCP | 80 | Managed prefix list `com.amazonaws.global.cloudfront.origin-facing` |
| Inbound | SSH | 22 | **None** — Session Manager only. If you must SSH, add your IP /32. |
| Outbound | All traffic | All | `0.0.0.0/0` (npm, GitHub, Atlas, Resend, Groq) |

To find the CloudFront prefix list ID in your region:
```
AWS Console → VPC → Managed Prefix Lists → search "cloudfront.origin-facing"
```
Copy the prefix list ID (e.g. `pl-0123456789abcdef0`) and use it as the source.

### 3.3 IAM instance profile

Before launching, attach an IAM role so Session Manager and CloudWatch work.

1. IAM → Roles → **Create role**
2. Trusted entity: **AWS service → EC2**
3. Attach policies:
   - `AmazonSSMManagedInstanceCore`
   - `CloudWatchAgentServerPolicy`
4. Name the role `intellia360-ec2`
5. Back in EC2 Launch wizard → **Advanced details → IAM instance profile** →
   select `intellia360-ec2`

Launch the instance and wait for the status check to pass (2–3 minutes).

### 3.4 Allocate and associate an Elastic IP

EC2 → Elastic IPs → **Allocate Elastic IP address** → Allocate.
Then **Actions → Associate Elastic IP address** → select your instance.

**Write down this IP** — you need it for:
- MongoDB Atlas network access whitelist (§2 step 4)
- The API CloudFront origin domain name (§6)

Now go back to MongoDB Atlas → Network Access → edit the `0.0.0.0/0` entry →
replace it with `<your-elastic-ip>/32`.

### 3.5 Bootstrap the server

Open **Systems Manager → Session Manager → Start session** → select your
instance → **Start session**.

A browser terminal opens. Run the following as root:

```bash
sudo -i

# System updates and dependencies
apt-get update && apt-get -y upgrade
apt-get install -y nginx git curl jq

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# PM2 (process manager)
npm install -g pm2

# 2 GB swap (next build needs it on t3.small)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# App user and directory structure
useradd --create-home --shell /bin/bash intellia
mkdir -p /srv/intellia360/{releases,shared/backups}
chown -R intellia:intellia /srv/intellia360

# Configure PM2 to start on boot as the intellia user
env PATH=$PATH:/usr/bin pm2 startup systemd -u intellia --hp /home/intellia
```

### 3.6 GitHub deploy key (read-only)

Still in the Session Manager terminal, switch to the app user:

```bash
sudo -iu intellia

# Generate a deploy key
ssh-keygen -t ed25519 -f ~/.ssh/intellia360_deploy -N "" -C "intellia360-ec2"

# Print the public key — copy this
cat ~/.ssh/intellia360_deploy.pub
```

Go to **GitHub repo → Settings → Deploy keys → Add deploy key**:
- Title: `intellia360-ec2`
- Key: paste the public key
- Leave "Allow write access" **unchecked**

Back in the terminal:

```bash
# Configure SSH to use this key for GitHub
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/intellia360_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

# Trust GitHub's host key
ssh-keyscan github.com >> ~/.ssh/known_hosts

# Clone a bare mirror of the repo
# Replace Intellia-SG/intellia360 with YOUR GitHub username/repo
git clone --mirror git@github.com:Intellia-SG/intellia360.git /srv/intellia360/repo.git
```

Test the clone worked: `ls /srv/intellia360/repo.git` should show `HEAD`,
`config`, `objects`, etc.

### 3.7 Environment file

```bash
sudo -iu intellia

# Start from the template
git -C /srv/intellia360/repo.git show main:apps/backend/.env.example \
  > /srv/intellia360/shared/.env
chmod 600 /srv/intellia360/shared/.env

# Edit with real production values
nano /srv/intellia360/shared/.env
```

Fill in every value. Use the table in §ENV below as a reference. At minimum
these must be set before the first deploy:

- `DATABASE_URL` — your Atlas connection string
- `AUTH_JWT_SECRET` — 64+ random chars (generate with the node command above)
- `NEXT_PUBLIC_APP_URL` and `FRONTEND_URL` — `https://yourdomain.com`
- `CORS_ORIGIN` — `https://yourdomain.com,https://www.yourdomain.com`
- `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` — your platform admin account

### 3.8 PM2 log rotation

```bash
sudo -iu intellia
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
```

---

## §4 — ACM certificate

> CloudFront only accepts certificates from **us-east-1**. Create it there even
> if your EC2 is in a different region.

1. Switch your AWS console region to **US East (N. Virginia)**.
2. AWS Certificate Manager → **Request** → Public certificate.
3. Add domain names:
   - `yourdomain.com`
   - `www.yourdomain.com`
   - `api.yourdomain.com`
4. Validation method: **DNS validation**.
5. Click **Request**, then **Create records in Route 53** (if your zone is in
   Route 53) — or copy the CNAME records and add them manually to your DNS
   provider.
6. Wait until the certificate status shows **Issued** (2–5 minutes with Route
   53, up to 30 minutes with an external DNS provider).

---

## §5 — S3 bucket (frontend static files)

1. S3 → **Create bucket**.
   - Name: `intellia360-frontend-prod` (must be globally unique, adjust as needed)
   - Region: choose one close to your users
   - **Block all public access: ON** (CloudFront reads it via OAC, not public)
2. Versioning: optional but recommended (lets you roll back a bad upload).
3. Leave everything else default and create the bucket.

---

## §6 — CloudFront distributions

You need two distributions: one for the frontend (S3), one for the API (EC2).

### 6a — Frontend distribution

**Step 1: Create the router function**

CloudFront → Functions → **Create function**:
- Name: `intellia360-frontend-router`
- Runtime: `cloudfront-js-2.0`
- Paste the contents of `deploy/cloudfront/frontend-router.js`
- Save changes → **Publish**

**Step 2: Create the response headers policy**

This applies CSP, HSTS, and other security headers. First update the file
to use your real API domain:

In `deploy/cloudfront/frontend-security-headers.json`, replace every
occurrence of `https://api.yourdomain.com` with your actual API URL
(e.g. `https://api.learn.example.com`).

Then run from your local machine (requires AWS CLI configured):

```powershell
aws cloudfront create-response-headers-policy `
  --response-headers-policy-config file://deploy/cloudfront/frontend-security-headers.json `
  --region us-east-1
```

Note the `Id` in the output — you need it in the next step.

**Step 3: Create the distribution**

CloudFront → Distributions → **Create distribution**:

| Setting | Value |
|---|---|
| Origin domain | Select your S3 bucket (`intellia360-frontend-prod.s3.<region>.amazonaws.com`) |
| Origin access | **Origin access control (OAC)** → Create new OAC → Create |
| Accept the prompt | "Update S3 bucket policy" → copy and apply the policy to the bucket |
| Viewer protocol | Redirect HTTP to HTTPS |
| Allowed methods | GET, HEAD |
| Cache policy | `CachingOptimized` |
| Function association — viewer request | `intellia360-frontend-router` |
| Response headers policy | `intellia360-frontend-security-headers` (the ID from above) |
| Compression | On |
| Alternate domain names | `yourdomain.com`, `www.yourdomain.com` |
| Custom SSL certificate | select the ACM cert from §4 |
| Security policy | TLSv1.2_2021 |
| Default root object | `index.html` |

After creating, go to **Error pages** → create two rules:
- HTTP error code 403 → response page `/404.html`, response code 404
- HTTP error code 404 → response page `/404.html`, response code 404

Note the **Distribution domain name** (e.g. `d1234abcd.cloudfront.net`) and
the **Distribution ID** — you need both.

### 6b — API distribution

CloudFront → Distributions → **Create distribution**:

**Origin settings:**

| Setting | Value |
|---|---|
| Origin domain | The Elastic IP's public DNS name — find it in EC2 console, looks like `ec2-<ip>.<region>.compute.amazonaws.com` |
| Protocol | HTTP only |
| HTTP port | 80 |
| Custom headers | Add one: `X-Origin-Verify` = `<a secret string you generate now>` |
| Response timeout | 60 seconds (AI tutor calls can be slow) |

Generate the origin secret now:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save this secret.** You will paste it into Nginx in §3-nginx below.

**Default behavior settings:**

| Setting | Value |
|---|---|
| Viewer protocol | Redirect HTTP to HTTPS |
| Allowed methods | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE |
| Cache policy | `CachingDisabled` |
| Origin request policy | `AllViewerAndCloudFrontHeaders-2022-06` |
| Response headers policy | none |

**Distribution settings:**
- Alternate domain names: `api.yourdomain.com`
- Custom SSL certificate: same ACM cert from §4
- Security policy: TLSv1.2_2021

Note the **API distribution ID** — you need it for §7.

---

## §7 — GitHub Actions → AWS (OIDC)

This lets GitHub Actions deploy without storing any AWS access keys.

### 7.1 OIDC identity provider

IAM → Identity providers → **Add provider**:
- Provider type: OpenID Connect
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

### 7.2 IAM deploy role

IAM → Roles → **Create role**:
- Trusted entity: **Web identity**
- Identity provider: `token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

After creating, edit the trust policy to this (replace placeholders):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:<YOUR_GITHUB_USERNAME>/intellia360:environment:production"
      }
    }
  }]
}
```

Add an inline permissions policy (replace every placeholder):

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
    {
      "Sid": "BackendDeployStatus",
      "Effect": "Allow",
      "Action": "ssm:GetCommandInvocation",
      "Resource": "*"
    },
    {
      "Sid": "FrontendUpload",
      "Effect": "Allow",
      "Action": ["s3:ListBucket","s3:GetObject","s3:PutObject","s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::intellia360-frontend-prod",
        "arn:aws:s3:::intellia360-frontend-prod/*"
      ]
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
      "Action": [
        "cloudfront:DescribeFunction",
        "cloudfront:UpdateFunction",
        "cloudfront:PublishFunction"
      ],
      "Resource": "arn:aws:cloudfront::<ACCOUNT_ID>:function/intellia360-frontend-router"
    }
  ]
}
```

Name the role `intellia360-github-deploy`. Copy its ARN.

### 7.3 GitHub repository configuration

**GitHub → your repo → Settings → Environments → New environment**: `production`
(optionally add required reviewers to gate every deploy).

**Settings → Secrets and variables → Actions → Secrets**:

| Secret name | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | the role ARN from §7.2 |

**Settings → Secrets and variables → Actions → Variables**:

| Variable name | Value |
|---|---|
| `AWS_REGION` | your EC2 region, e.g. `ap-south-1` |
| `EC2_INSTANCE_ID` | e.g. `i-0123456789abcdef0` |
| `FRONTEND_S3_BUCKET` | `intellia360-frontend-prod` |
| `FRONTEND_CLOUDFRONT_DISTRIBUTION_ID` | the frontend distribution ID from §6a |
| `FRONTEND_ROUTER_FUNCTION_NAME` | `intellia360-frontend-router` |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | your Google OAuth client ID (or leave blank) |

> **Learner Lab fallback:** if OIDC is unavailable, create an IAM user with
> the same inline policy, generate access keys, store them as GitHub secrets
> `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, and replace the OIDC
> `configure-aws-credentials` step in both workflow files with the key-based
> version. This is less secure but functional.

---

## §8 — Route 53 DNS

Route 53 → Hosted zones → select `yourdomain.com` → **Create records**:

| Record name | Type | Alias | Alias target |
|---|---|---|---|
| (blank / @) | A | Yes | Frontend CloudFront distribution |
| (blank / @) | AAAA | Yes | Same distribution |
| `www` | A | Yes | Same distribution |
| `www` | AAAA | Yes | Same distribution |
| `api` | A | Yes | API CloudFront distribution |
| `api` | AAAA | Yes | Same distribution |

If your domain is registered outside AWS, update your registrar's nameservers
to the four Route 53 nameservers shown in the hosted zone.

DNS propagation can take a few minutes to 48 hours depending on your provider.

---

## §9 — Nginx on the EC2 instance

Back in Session Manager, run as root:

```bash
sudo -i

# Create the origin-verify snippet (paste your secret from §6b here)
ORIGIN_SECRET="<the hex string you generated in §6b>"
cat > /etc/nginx/snippets/intellia360-origin-verify.conf <<EOF
if (\$http_x_origin_verify != "$ORIGIN_SECRET") { return 403; }
EOF
chmod 640 /etc/nginx/snippets/intellia360-origin-verify.conf

# Install the Nginx site config from the repo
cp /srv/intellia360/repo.git/$(git -C /srv/intellia360/repo.git rev-parse HEAD):deploy/nginx/intellia360.conf \
  /etc/nginx/sites-available/intellia360
```

Actually it is easier to read it out directly:

```bash
sudo -i
git -C /srv/intellia360/repo.git show main:deploy/nginx/intellia360.conf \
  > /etc/nginx/sites-available/intellia360

ln -sf /etc/nginx/sites-available/intellia360 /etc/nginx/sites-enabled/intellia360
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
```

---

## §10 — First backend deploy

```bash
sudo -iu intellia
cd /srv/intellia360
git -C repo.git show main:deploy/deploy.sh | bash -s -- main
```

This will:
1. Extract the `main` branch into `releases/<timestamp>-<sha>/`
2. Link `shared/.env` into the release
3. Run `npm ci`, `prisma generate`, `db:restore-curriculum`, then `next build`
4. Switch the `current` symlink and restart PM2
5. Health-check `/api/health` — rolls back automatically on failure

The first build takes 5–10 minutes on a t3.small.

### 10.1 Database indexes and admin account

Run these **once only**, after the first successful deploy:

```bash
sudo -iu intellia
cd /srv/intellia360/current

# Push Prisma schema — creates collections and indexes
npm run db:indexes

# Seed curriculum data into the MongoDB mirror
npm run db:restore-curriculum -- --seed-mirror

# Create the platform admin (no auth needed for this one call)
curl -s -X POST http://127.0.0.1:4000/api/admin/seed-admin | jq .
```

The response should be `{"message":"Admin account created"}` or similar.

> **Do NOT run `npm run seed`** — it creates demo accounts with a shared
> password. Use `seed-admin` only.

---

## §11 — CloudWatch agent (monitoring)

```bash
sudo -i

# Download and install
curl -fsSLo /tmp/cwagent.deb \
  https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i /tmp/cwagent.deb

# Configure from the repo's config file
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/srv/intellia360/current/deploy/cloudwatch-agent.json
```

This sends PM2 logs and Nginx logs to CloudWatch, plus memory/disk/swap metrics
under the `Intellia360` namespace.

**Recommended alarms** (CloudWatch → Alarms → Create alarm):

| Alarm | Metric | Threshold |
|---|---|---|
| Instance failure | EC2 `StatusCheckFailed` | ≥ 1 for 2 min — add "Recover instance" action |
| High CPU | EC2 `CPUUtilization` | > 80% for 15 min |
| High memory | `Intellia360/mem_used_percent` | > 90% for 10 min |
| Low disk | `Intellia360/disk/used_percent` | > 85% |
| API errors | CloudFront `5xxErrorRate` (api distribution, us-east-1) | > 5% for 5 min |
| Frontend errors | CloudFront `5xxErrorRate` (frontend distribution, us-east-1) | > 5% for 5 min |

---

## §12 — Automated database backups

The `database-backup.yml` workflow runs every night at 02:15 UTC via GitHub
Actions (not dependent on the EC2 host). To enable it, add these **secrets**
to GitHub (not variables — these are credentials):

| Secret | Value |
|---|---|
| `DATABASE_URL` | same Atlas connection string as `shared/.env` |
| `BACKUP_S3_BUCKET` | an S3 bucket name (can be the same region bucket or a separate one) |
| `BACKUP_S3_ACCESS_KEY_ID` | write-only IAM key scoped to that bucket |
| `BACKUP_S3_SECRET_ACCESS_KEY` | the corresponding secret |

The backup archive is also kept as a GitHub Actions artifact for 30 days as a
second independent copy.

---

## §13 — First frontend deploy

Once DNS has propagated and the backend is healthy, trigger the frontend deploy:

1. Push any change to `apps/frontend/` or run the workflow manually:
   **GitHub → Actions → "Frontend — build & deploy to S3 + CloudFront" →
   Run workflow**.

The workflow will:
1. Build the static export with your `NEXT_PUBLIC_API_URL`
2. Verify CloudFront routing against the export
3. Upload to S3 with correct cache headers
4. Republish `intellia360-frontend-router`
5. Invalidate the CloudFront distribution

---

## §14 — Verification checklist

Go through this after both deploys have succeeded.

### API health

```powershell
# Replace with your actual API URL
Invoke-WebRequest -Uri "https://api.yourdomain.com/api/health" | Select-Object StatusCode, Content
```

Expected: `{"status":"ok","database":"connected",...}`

### Security headers

```powershell
Invoke-WebRequest -Uri "https://api.yourdomain.com/api/health" | Select-Object -ExpandProperty Headers
```

Check for `Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy`.

### CORS lockdown

```powershell
# This must return 403
Invoke-WebRequest -Uri "https://api.yourdomain.com/api/auth/login" `
  -Method POST `
  -Headers @{"Origin"="https://evil.example"} `
  -ContentType "application/json" `
  -Body '{"email":"x","password":"y"}'
```

### Authentication flow

1. Open `https://yourdomain.com` in a browser.
2. Register a new account.
3. Log in — you should land on the student dashboard.
4. Log out — you should be redirected to `/login`.
5. Repeat for teacher and admin roles.

### Direct EC2 access blocked

Open `http://<elastic-ip>` in a browser — it must return 403, not the app.

---

## §ENV — Backend environment variable reference

Full template is at `apps/backend/.env.example`. Production values for
`/srv/intellia360/shared/.env`:

| Variable | Production value |
|---|---|
| `DATABASE_URL` | `mongodb+srv://intellia360:<password>@cluster.mongodb.net/intellia360` |
| `AUTH_JWT_SECRET` | 64+ random chars |
| `AUTH_JWT_EXPIRES_IN` | `7d` |
| `ADMIN_EMAIL` | your admin email |
| `ADMIN_NAME` | your name |
| `ADMIN_PASSWORD` | strong password |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` |
| `FRONTEND_URL` | `https://yourdomain.com` |
| `CORS_ORIGIN` | `https://yourdomain.com,https://www.yourdomain.com` |
| `GROQ_API_KEY` | from [console.groq.com](https://console.groq.com) |
| `RESEND_API_KEY` | from [resend.com](https://resend.com) |
| `RESEND_FROM` | `Intellia360 <noreply@yourdomain.com>` |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `true` once `RESEND_FROM` domain is verified |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console OAuth credentials |
| `BACKUP_DIR` | `/srv/intellia360/shared/backups` |
| `BACKUP_S3_BUCKET` | your backup bucket name |
| `BACKUP_S3_ACCESS_KEY_ID` | write-only key |
| `BACKUP_S3_SECRET_ACCESS_KEY` | corresponding secret |
| `BACKUP_S3_REGION` | e.g. `ap-south-1` |

---

## §OPT — Optional: Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → Create project.
2. APIs & Services → Credentials → **Create credentials → OAuth 2.0 Client ID**.
3. Application type: **Web application**.
4. Authorised JavaScript origins:
   - `https://yourdomain.com`
   - `https://www.yourdomain.com`
5. Copy the **Client ID** (no client secret needed for the ID-token flow).
6. Set `GOOGLE_CLIENT_ID` in `shared/.env` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   in GitHub repository variables (triggers a frontend redeploy).

---

## §OPT — Optional: email with Resend

1. Sign up at [resend.com](https://resend.com) → API Keys → create a key.
2. Domains → Add your domain → follow DNS verification instructions.
3. Once verified, set:
   ```ini
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM=Intellia360 <noreply@yourdomain.com>
   AUTH_REQUIRE_EMAIL_VERIFICATION=true
   ```
4. Restart the API: `sudo -iu intellia pm2 restart intellia360-api`

Until the domain is verified, leave `RESEND_FROM=Intellia360 <onboarding@resend.dev>`
and `AUTH_REQUIRE_EMAIL_VERIFICATION=false`.

---

## Ongoing operations

### Deploy backend changes
Push to `main` with changes inside `apps/backend/`. The `backend-deploy.yml`
workflow triggers automatically. Watch progress under **GitHub → Actions**.

### Deploy frontend changes
Push to `main` with changes inside `apps/frontend/`. The `frontend-deploy.yml`
workflow triggers automatically.

### Manual rollback — backend
```bash
sudo -iu intellia
ls -1dt /srv/intellia360/releases/*/   # newest first
ln -sfn /srv/intellia360/releases/<previous-release> /srv/intellia360/current
pm2 delete intellia360-api
pm2 start /srv/intellia360/current/deploy/ecosystem.config.js
pm2 save
```

### Manual rollback — frontend
Re-run an earlier successful *Frontend* workflow in GitHub Actions, or restore
object versions in the S3 bucket if versioning is enabled.

### Check API logs
```bash
sudo -iu intellia pm2 logs intellia360-api --lines 100
```
Or via CloudWatch → Log groups → `/intellia360/app`.

### Update Nginx config
If `deploy/nginx/intellia360.conf` changes in a new release:
```bash
sudo -i
cp /srv/intellia360/current/deploy/nginx/intellia360.conf \
   /etc/nginx/sites-available/intellia360
nginx -t && systemctl reload nginx
```

### Schema changes
After merging a PR that edits `prisma/schema.prisma`, SSH into the server and
run:
```bash
sudo -iu intellia
cd /srv/intellia360/current
npm run db:indexes
```
Deploys do not run `prisma db push` automatically.

---

## Known issue — curriculum restore after deploy

`scripts/restore-curriculum.mjs` currently filters with `deletedAt: null`,
which in Prisma's MongoDB connector skips documents where the field was never
set. This means **editor changes made on the server are not restored after a
backend deploy** (they remain in `curriculum_documents` and are not lost).

Workaround: after any backend deploy where editor curriculum was changed,
manually run:
```bash
sudo -iu intellia
cd /srv/intellia360/current
npm run db:restore-curriculum
```

The fix is to change the filter in `restore-curriculum.mjs` to:
```js
OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }]
```
