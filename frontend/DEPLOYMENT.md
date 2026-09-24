# Deployment & Hosting Guide

`blindarea Production` is designed to be hosted with near-zero monthly cost and high availability using **Vercel** + **MongoDB Atlas (Free/Serverless M0)**.

---

## 1. Deploying to Vercel (Recommended)

### Step 1: Push Repository to GitHub
```bash
git add .
git commit -m "feat: complete blindarea production management system"
git push origin main
```

### Step 2: Import Project on Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** $\to$ **Project**.
3. Select your GitHub repository.
4. Framework Preset will auto-detect as **Next.js**.

### Step 3: Configure Environment Variables in Vercel
Under the **Environment Variables** section, configure:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster0.wu4kcx5.mongodb.net/attendance_db` | Your MongoDB Atlas connection URI |
| `JWT_SECRET` | `replace_with_a_64_character_random_secure_hex_key` | Secret key for signing session tokens |
| `NEXT_PUBLIC_APP_NAME` | `blindarea Production` | Application brand name |
| `NEXT_PUBLIC_COMPANY_NAME`| `blindarea Production` | Company name |
| `NODE_ENV` | `production` | Production environment flag |

### Step 4: Deploy & Seed
1. Click **Deploy**. Vercel will run `npm run build` and provision serverless edge nodes.
2. Once deployed, run the initial seed from your local machine targeting your production Atlas URI:
```bash
MONGODB_URI="mongodb+srv://..." npx tsx scripts/seed-production.ts
```

---

## 2. Docker / Self-Hosted Node.js (Alternative)

If you prefer self-hosting on a single VPS (e.g. Hetzner, DigitalOcean, AWS EC2):

```dockerfile
# Dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

Run container:
```bash
docker build -t blindarea-production .
docker run -p 3000:3000 --env-file .env.production blindarea-production
```

---

## 3. Post-Deployment Verification Checklist

1. [ ] Log in as `superadmin` (`Admin@123`).
2. [ ] Check the Executive Dashboard at `/admin/dashboard`.
3. [ ] Verify Channels at `/admin/channels`.
4. [ ] Create a test Project and add a YouTube 4K deliverable at `/admin/projects`.
5. [ ] Log in as `editor_alex` on a mobile browser or viewport.
6. [ ] Verify Shift Check-In (allows browser location access).
7. [ ] Select the test project in the Work Session dropdown.
8. [ ] Verify work session timer runs independently of the shift clock.
9. [ ] Perform Shift Check-Out and confirm work session automatically concludes.
