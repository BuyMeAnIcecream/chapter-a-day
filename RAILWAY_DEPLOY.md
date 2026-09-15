# Railway Deployment Guide

This guide will help you deploy your Chapter-a-Day app to Railway.

## Prerequisites
- A Railway account (sign up at https://railway.app)
- GitHub account (to connect your repo)

## Step 1: Add PostgreSQL Database

1. In Railway dashboard, click **"New Project"**
2. Click **"Add Service"** → **"Database"** → **"Add PostgreSQL"**
3. Railway will create a PostgreSQL database automatically
4. Click on the PostgreSQL service
5. Go to the **"Variables"** tab
6. Copy the `DATABASE_URL` value (you'll need this later)

## Step 2: Deploy the Server

1. In your Railway project, click **"New Service"** → **"GitHub Repo"**
2. Select your `chapter-a-day` repository
3. Railway will try to auto-detect - **you'll see a Railpack error, that's expected!**
4. Click on the service you just created
5. Go to **"Settings"** tab
6. Under **"Source"**, leave **Root Directory** empty (the repository root). The server Dockerfile copies `server/...` paths, so it must be built from the repo root.
7. The root `railway.toml` configures the build: Dockerfile builder, `dockerfilePath = "server/Dockerfile"`, and the start command `sh scripts/start.sh`. If the dashboard shows a different builder, set it to **"Dockerfile"** with path `server/Dockerfile`.
8. Click **"Save"** or the changes will auto-save
9. Go to **"Variables"** tab and add:
   - `DATABASE_URL` = (paste the PostgreSQL connection string from Step 1)
   - `JWT_SECRET` = (generate a random secret, e.g., use `openssl rand -base64 32`)
   - `PORT` = `4000`
   - `NODE_ENV` = `production`
10. Railway will automatically trigger a new build using the Dockerfile
11. Once deployed, go to **"Settings"** → **"Networking"** and copy the **public URL** (e.g., `https://your-server.railway.app`)

## Step 3: Deploy the Client

1. In your Railway project, click **"New Service"** → **"GitHub Repo"**
2. Select the same `chapter-a-day` repository
3. Railway will try to auto-detect - **you'll see a Railpack error again, that's expected!**
4. Click on the service you just created
5. Go to **"Settings"** tab
6. Under **"Source"**, set **Root Directory** to: `client`
7. Under **"Build"** section:
   - Click the dropdown that says **"Nixpacks"** or **"Railpack"**
   - Change it to **"Dockerfile"**
   - The Dockerfile path should auto-fill as `Dockerfile` (the client Dockerfile is built from the `client/` directory)
8. Under **"Config-as-code"**, set **Railway Config File** to `/client/railway.toml` (the config file path does not follow Root Directory, so without this the service would read the server's root `railway.toml`)
9. Click **"Save"** or the changes will auto-save
10. Go to **"Variables"** tab and add:
   - `VITE_API_URL` = (your server URL from Step 2, e.g., `https://your-server.railway.app`)
   - `VITE_GA_MEASUREMENT_ID` = (optional, GA4 measurement ID)
11. Railway will automatically trigger a new build using the Dockerfile
12. Once deployed, go to **"Settings"** → **"Networking"** and copy the **public URL** for your client (e.g., `https://your-client.railway.app`)

## Step 4: Seed and Import KJV (First-Time Only)

Every deploy runs `server/scripts/start.sh`, which applies migrations, seeds an empty database, then starts the server. If migrations fail, the container exits instead of starting against an out-of-date schema (a seed failure is logged but does not block startup). For a **new project**, you also need to import the KJV text once (replaces placeholder chapter content):

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Import KJV text (run once after first deploy)
railway run --service server npm run import:kjv
```

This is not run on every deploy—only when setting up a new database.

## Step 5: Update Client API URL

If you need to update the client's API URL after deployment:

1. Go to client service → **"Variables"**
2. Update `VITE_API_URL` to your server URL
3. Redeploy the client service

## Quick Reference

**For Server Service:**
- Root Directory: empty (repo root)
- Config: root `railway.toml` → builds `server/Dockerfile`, starts with `sh scripts/start.sh`
- Variables needed: `DATABASE_URL`, `JWT_SECRET`, `PORT=4000`, `NODE_ENV=production`

**For Client Service:**
- Root Directory: `client`
- Config: `/client/railway.toml` → builds `client/Dockerfile`, serves with nginx
- Variables needed: `VITE_API_URL` (your server's Railway URL), optionally `VITE_GA_MEASUREMENT_ID`

**Important:** The two services use different build contexts: the server builds from the repo root, the client from `client/`.

## Troubleshooting

- **"Railpack could not determine how to build"**: This is normal! Just go to Settings → Build and change from "Nixpacks" to "Dockerfile", then set the Root Directory as described above
- **Build fails**: Check the build logs in Railway dashboard
- **`COPY server/...` not found**: The server service has Root Directory set to `server`; clear it so the build runs from the repo root
- **`COPY package*.json` fails or the client builds the server**: The client service needs Root Directory `client` and config file `/client/railway.toml`
- **Server keeps restarting after a deploy**: Check the logs for a failed `prisma migrate deploy`; startup stops when migrations fail
- **Database connection errors**: Verify `DATABASE_URL` is correct in server variables
- **CORS errors**: The server is configured to allow all origins in production
- **Client can't reach server**: Verify `VITE_API_URL` matches your server's public URL

## Cost

Railway offers:
- **Free tier**: $5 credit/month (usually enough for small projects)
- **Hobby plan**: $5/month for additional resources
- PostgreSQL: Included in free tier (with limits)

For a fun project to show friends, the free tier should be sufficient!
