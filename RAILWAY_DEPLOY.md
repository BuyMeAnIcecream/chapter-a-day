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
6. Under **"Source"**, set **Root Directory** to: `server`
7. Under **"Build"** section:
   - Click the dropdown that says **"Nixpacks"** or **"Railpack"**
   - Change it to **"Dockerfile"**
   - The Dockerfile path should auto-fill as `Dockerfile` (which is correct since root is now `server`)
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
   - The Dockerfile path should auto-fill as `Dockerfile`
8. Click **"Save"** or the changes will auto-save
9. Go to **"Variables"** tab and add:
   - `VITE_API_URL` = (your server URL from Step 2, e.g., `https://your-server.railway.app`)
10. Railway will automatically trigger a new build using the Dockerfile
11. Once deployed, go to **"Settings"** → **"Networking"** and copy the **public URL** for your client (e.g., `https://your-client.railway.app`)

## Step 4: Seed and Import KJV (First-Time Only)

The deploy automatically runs migrations and seed. For a **new project**, you also need to import the KJV text once (replaces placeholder chapter content):

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
- Root Directory: `server`
- Build: Dockerfile (auto-detected)
- Variables needed: `DATABASE_URL`, `JWT_SECRET`, `PORT=4000`, `NODE_ENV=production`

**For Client Service:**
- Root Directory: `client`  
- Build: Dockerfile (auto-detected)
- Variables needed: `VITE_API_URL` (your server's Railway URL)

**Important:** Make sure to set the **Root Directory** in Settings → Source, otherwise Railway will look at the repo root and fail!

## Troubleshooting

- **"Railpack could not determine how to build"**: This is normal! Just go to Settings → Build and change from "Nixpacks" to "Dockerfile", then set the Root Directory
- **Build fails**: Check the build logs in Railway dashboard
- **Dockerfile not found**: Make sure Root Directory is set correctly (`server` or `client`)
- **Database connection errors**: Verify `DATABASE_URL` is correct in server variables
- **CORS errors**: The server is configured to allow all origins in production
- **Client can't reach server**: Verify `VITE_API_URL` matches your server's public URL

## Cost

Railway offers:
- **Free tier**: $5 credit/month (usually enough for small projects)
- **Hobby plan**: $5/month for additional resources
- PostgreSQL: Included in free tier (with limits)

For a fun project to show friends, the free tier should be sufficient!
