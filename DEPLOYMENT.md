# 🚀 SaafHawa — Deployment Guide

> Complete step-by-step guide to deploy the backend on Railway and frontend on GitHub Pages.

---

## Prerequisites

- A GitHub account
- A [Railway](https://railway.app) account (login with GitHub)
- API keys (free, no card required):

| Service | Link | Used For |
|---|---|---|
| WAQI / aqicn | https://aqicn.org/data-platform/token/ | Real station AQI data |
| Groq (Llama 3.3 70B) | https://console.groq.com/keys | Bilingual AI interpretation |
| OpenWeather (optional) | https://openweathermap.org/api/air-pollution | Fallback air source |

---

## Part 1 — Fork the Repository

1. Go to 👉 https://github.com/mmoneka11/SaafHawa
2. Click **"Fork"** (top right)
3. Your fork will be at: `github.com/YOUR_USERNAME/SaafHawa`

---

## Part 2 — Backend Deployment on Railway

### Step 1 — Add a Procfile

1. Go to your forked repo on GitHub
2. Navigate into the `backend/` folder
3. Click **"Add file" → "Create new file"**
4. Name it exactly: `Procfile` (capital P, no extension)
5. Paste this content:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```
6. Click **"Commit changes" → "Commit directly to main"**

### Step 2 — Deploy on Railway

1. Go to 👉 https://railway.app
2. Click **"Login with GitHub"**
3. Click **"New Project" → "Deploy from GitHub repo"**
4. Search and select your forked `SaafHawa` repo
5. Before deploying, go to **"Settings"** and set:
   - **Root Directory:** `backend`
6. Click **"Deploy"**

### Step 3 — Add Environment Variables

1. In your Railway service, click the **"Variables"** tab
2. Add the following:

| Variable | Value |
|---|---|
| `WAQI_TOKEN` | your WAQI token |
| `GROQ_API_KEY` | your Groq API key |
| `OPENWEATHER_KEY` | your OpenWeather key (optional) |

3. Railway will automatically redeploy after saving variables.

### Step 4 — Get Your Public URL

1. Go to **Settings → Networking**
2. Click **"Generate Domain"**
3. Copy your URL — it will look like:
```
https://your-app.up.railway.app
```

### Step 5 — Verify Backend is Live

Open in browser:
```
https://your-app.up.railway.app/
```

You should see:
```json
{"service":"SaafHawa","areas":["lahore","karachi","islamabad"],"endpoints":["/aqi","/plan","/ask"]}
```

API docs available at:
```
https://your-app.up.railway.app/docs
```

---

## Part 3 — Frontend Deployment on GitHub Pages

### Step 1 — Update the Backend URL

1. Go to your repo → `frontend/config.js`
2. Click the **pencil icon ✏️** to edit
3. Replace the content with:

```js
(function () {
  const isLocalDev =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "0.0.0.0";
  window.SAAFHAWA_CONFIG = {
    API_BASE: isLocalDev
      ? "http://localhost:8000"
      : "https://your-app.up.railway.app",  // ← Replace with your Railway URL
  };
})();
```

4. Click **"Commit changes" → "Commit directly to main"**

### Step 2 — Enable GitHub Actions Permissions

1. Go to your repo → **Settings → Actions → General**
2. Scroll to **"Workflow permissions"**
3. Select **"Read and write permissions"**
4. Click **"Save"**

### Step 3 — Add GitHub Actions Workflow

1. In your repo, click **"Add file" → "Create new file"**
2. Name it exactly:
```
.github/workflows/deploy.yml
```
3. Paste this content:

```yaml
name: Deploy Frontend to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./frontend

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

4. Click **"Commit changes" → "Commit directly to main"**

### Step 4 — Enable GitHub Pages

1. Go to **Settings → Pages**
2. Under **"Source"** select **"GitHub Actions"**
3. Click **"Save"**

### Step 5 — Verify Frontend is Live

Wait 1-2 minutes, then open:
```
https://YOUR_USERNAME.github.io/SaafHawa/frontend/
```

---

## ✅ Final Checklist

| Task | Status |
|---|---|
| Fork the repository | ⬜ |
| Add `Procfile` to `backend/` | ⬜ |
| Deploy backend on Railway | ⬜ |
| Set Root Directory to `backend` in Railway | ⬜ |
| Add environment variables on Railway | ⬜ |
| Get Railway public URL | ⬜ |
| Update `config.js` with Railway URL | ⬜ |
| Enable Actions write permissions on GitHub | ⬜ |
| Add `deploy.yml` GitHub Actions workflow | ⬜ |
| Enable GitHub Pages (source: GitHub Actions) | ⬜ |
| Verify frontend loads at GitHub Pages URL | ⬜ |

---

## 🔗 Live URLs (fill in after deployment)

| | URL |
|---|---|
| 🌐 Frontend | `https://YOUR_USERNAME.github.io/SaafHawa/frontend/` |
| ⚙️ Backend | `https://your-app.up.railway.app` |
| 📖 API Docs | `https://your-app.up.railway.app/docs` |

---

## 🛠️ Troubleshooting

**Railway build fails with "could not determine how to build"**
→ Make sure Root Directory is set to `backend` in Railway Settings.

**GitHub Actions fails with permission denied (403)**
→ Go to Settings → Actions → General → set "Read and write permissions".

**Frontend shows README instead of the app**
→ Make sure GitHub Pages source is set to "GitHub Actions", not "Deploy from branch".

**API calls fail on the live site**
→ Check `config.js` has the correct Railway URL (not `localhost`).

**Backend returns errors**
→ Verify all environment variables (WAQI_TOKEN, GROQ_API_KEY) are set in Railway Variables tab.

---

*SaafHawa · صاف ہوا — Made with ❤️ for the people who feel the air first.*
