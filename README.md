# RomDynamics — Internal App Hub

> Private GitHub Pages site listing all RomDynamics internal applications.  
> **URL:** `https://romapps.github.io`

---

## 🏗 Architecture

```
romapps.github.io/
├── index.html                  # Single-page application
├── css/style.css               # Dark-themed UI styles
├── js/app.js                   # Auth gate, search, filtering
├── data/apps.json              # Application catalog (single source of truth)
└── .github/workflows/
    ├── deploy.yml              # Deploy on release publish
    └── update-catalog.yml      # Update an app entry + redeploy
```

This is a **static site** — no build step required. The entire catalog lives in `data/apps.json`.

---

## 🔐 Authentication

Because this repo is **private**, GitHub Pages will only serve the site to authenticated GitHub users who have access to the repository. This is the primary auth layer.

An additional client-side token gate is included for an extra layer of protection. By default it runs in **relaxed mode** (any non-empty token is accepted). To enforce a specific token:

1. Open `js/app.js`
2. Set `STRICT_MODE = true`
3. Generate the SHA-256 hash of your chosen token:
   ```bash
   echo -n "your-secret-token" | shasum -a 256
   ```
4. Replace the `TOKEN_HASH` value with the output.

---

## 📂 Managing the App Catalog

### Add a new app

Edit `data/apps.json` and add an entry to the `apps` array:

```json
{
  "id": "rom-new-app",
  "name": "ROM New App",
  "category": "mobile-robots",
  "version": "0.1.0",
  "description": "Short description of the application.",
  "tags": ["tag1", "tag2"],
  "repo": "romdynamics/rom-new-app",
  "status": "alpha",
  "updatedAt": "2026-02-08"
}
```

Valid categories: `mobile-robots`, `dog-robots`, `drones`, `books`  
Valid statuses: `stable`, `beta`, `alpha`

### Update from another repo (CI trigger)

From any other RomDynamics repo, dispatch an event to update the catalog automatically:

```yaml
# In the releasing repo's workflow:
- name: Notify App Hub
  uses: peter-evans/repository-dispatch@v3
  with:
    token: ${{ secrets.APP_HUB_PAT }}
    repository: romapps/romapps.github.io
    event-type: app-updated
    client-payload: |
      {
        "app_id": "rom-nav-stack",
        "version": "2.5.0",
        "status": "stable"
      }
```

> You'll need a **Personal Access Token** (`APP_HUB_PAT`) with `repo` scope stored as a secret in the releasing repo.

---

## 🚀 Deployment

Deployment happens automatically via GitHub Actions:

| Trigger | Workflow | What happens |
|---------|----------|--------------|
| **Release published** | `deploy.yml` | Deploys the site to GitHub Pages |
| **`repository_dispatch`** | `update-catalog.yml` | Updates `apps.json`, commits, and deploys |
| **Manual** | Either workflow | Trigger from the Actions tab |

### First-time setup

1. Go to **Settings → Pages** in this repo
2. Set **Source** to **GitHub Actions**
3. The site will be available at `https://romapps.github.io`

---

## 🔍 Features

- **Category filtering** — Mobile Robots, Dog Robots, Drones, Books & Docs
- **Real-time search** — searches names, descriptions, tags, versions
- **Keyboard shortcut** — press `/` to focus search, `Esc` to clear
- **Status badges** — Stable (green), Beta (yellow), Alpha (purple)
- **Responsive** — works on desktop, tablet, and mobile
- **Dark theme** — GitHub-inspired dark UI
- **No build step** — pure HTML/CSS/JS, instant deploys

---

## 🛠 Local Development

```bash
# Serve locally (any static server works)
npx serve .
# or
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser.

---

## 📜 License

Internal use only — © 2026 RomDynamics. All rights reserved.
