# Academic Study Tracker — Production Deployment Guide

This guide walks you step-by-step through deploying the **Academic Study Tracker** to the cloud so you can share your live website with classmates, teachers, and other users.

---

## 🏗️ Production Architecture Overview

```text
Classmates & Public Users (Browsers)
       │
       ├──► Frontend (Vercel / Netlify) ──► React + Vite Static App
       │         │
       │         ├──► Authenticates with Appwrite Cloud (JWT)
       │         │
       │         └──► Sends Authenticated API Calls (with JWT Bearer token)
       ▼                    ▼
Appwrite Cloud ◄──── Express Backend (Render / Railway)
(User Management)           │
                            ▼
                    MongoDB Atlas Cluster
                    (Multi-Tenant Scoped Data)
```

---

## 📋 Step 1: MongoDB Atlas Network Access

Cloud platforms (like Render or Railway) use dynamic outgoing IP addresses. Ensure your MongoDB Atlas cluster allows incoming connections:

1. Open [MongoDB Atlas](https://cloud.mongodb.com/).
2. In the left sidebar, click **Network Access** under Security.
3. Click **Add IP Address**.
4. Click **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Click **Confirm**.

---

## ⚙️ Step 2: Deploy the Backend (e.g. on Render)

You can host the Express backend for free on [Render](https://render.com) or [Railway](https://railway.app):

1. Go to [Render](https://render.com) and create a free account or log in with GitHub.
2. Click **New +** and choose **Web Service**.
3. Select your GitHub repository: `Academic-Study-Tracker`.
4. Configure the service settings:
   - **Name:** `academic-tracker-server` (or your preferred name)
   - **Region:** Frankfurt (EU) or Oregon (US) — matching your Appwrite region is best
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/server.js`
   - **Instance Type:** `Free`
5. Scroll down to **Environment Variables** and add the following keys:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production security & logging |
| `PORT` | `5000` | Port for Express listener (Render sets this automatically) |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster0...` | Your MongoDB Atlas connection string |
| `CLIENT_URL` | `https://your-frontend.vercel.app` | Comma-separated list of allowed frontend URLs |
| `APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | Appwrite Cloud endpoint URL |
| `APPWRITE_PROJECT_ID` | `6a96f538001b66f7d249` | Your Appwrite Project ID |
| `LEGACY_MIGRATION_SECRET` | `AcademicTrackerOwner2026!` | Migration passkey for securing legacy data |

6. Click **Deploy Web Service**.
7. Once deployed, Render will provide a public URL for your backend (e.g., `https://academic-tracker-server.onrender.com`).
   - Test it by visiting: `https://academic-tracker-server.onrender.com/api/health`
   - It should return: `{"status":"ok","message":"Academic Study Tracker API is operating smoothly."}`

---

## 🌐 Step 3: Deploy the Frontend (e.g. on Vercel)

Deploy the React + Vite frontend for free on [Vercel](https://vercel.com):

1. Go to [Vercel](https://vercel.com) and log in with GitHub.
2. Click **Add New...** -> **Project**.
3. Select the `Academic-Study-Tracker` repository.
4. Configure the project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit and select `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand the **Environment Variables** section and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://academic-tracker-server.onrender.com/api` | Your deployed backend URL from Step 2 |
| `VITE_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | Appwrite Cloud endpoint URL |
| `VITE_APPWRITE_PROJECT_ID` | `6a96f538001b66f7d249` | Your Appwrite Project ID |

6. Click **Deploy**.
7. Vercel will build your application and generate a public live URL (e.g., `https://academic-tracker-client.vercel.app`).

---

## 🔑 Step 4: Configure Appwrite Cloud Web Platform

Appwrite blocks authentication requests from unauthorized domains to prevent cross-site request forgery. You must register your new Vercel domain in Appwrite:

1. Open [Appwrite Cloud Console](https://cloud.appwrite.io).
2. Select your project: **`Academic Tracker`**.
3. In the left sidebar, click **Overview** (or Project Settings).
4. Scroll down to the **Platforms** section.
5. Click **Add Platform** and select **Web App**.
6. Enter the details:
   - **Name:** `Academic Tracker Production`
   - **Hostname:** Enter your Vercel domain (e.g. `academic-tracker-client.vercel.app`).
   - *(Optional for testing: You can also use `*` as hostname during setup).*
7. Click **Next** / **Create**.

---

## 🔄 Step 5: Update Backend `CLIENT_URL` on Render

Now that you have your final Vercel frontend domain:

1. Return to your [Render Dashboard](https://dashboard.render.com).
2. Open your backend service (`academic-tracker-server`).
3. Click **Environment**.
4. Update `CLIENT_URL` to your live Vercel URL (e.g., `https://academic-tracker-client.vercel.app`).
5. Save changes (Render will automatically redeploy the backend with the new CORS permission).

---

## 🎉 Verification Checklist

After completing the steps above:

- [ ] Visit your Vercel URL in an incognito window.
- [ ] Register a brand new user account.
- [ ] Verify you land on the dashboard with a clean demo calendar and national holidays.
- [ ] Create a semester, add a course with weekly schedules, and inspect the routine.
- [ ] Verify that data remains 100% private to that account.
