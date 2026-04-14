# JDMS Audit Survey

Jamati Data Management Systems — Audit Questionnaire

## Quick deploy to GitHub Pages

### 1. Create a GitHub repository
Go to github.com → New repository → name it `jdms-survey` → Create.

### 2. Upload these files
Drag and drop all files into the repository, or use Git:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/jdms-survey.git
git push -u origin main
```

### 3. Update the base path
Open `vite.config.js` and set `base` to match your repo name:
```js
base: '/jdms-survey/',   // use your actual repo name
```

### 4. Enable GitHub Pages
In your repo → Settings → Pages → Source: **GitHub Actions** → Save.

### 5. Trigger the deployment
Push any change (or go to Actions → Run workflow). Your site will be live at:
```
https://YOUR-USERNAME.github.io/jdms-survey/
```

---

## Run locally

```bash
npm install
npm run dev
```

## Admin password
Default: `JDMS@2024` — change it in `src/App.jsx` line 4.

## Notes
- Responses are stored in **browser localStorage** — they are device-specific.
- Connect Airtable in the admin Settings tab to centralise responses across devices.
- The AI Analysis tab requires your own Anthropic API key (entered in Settings).
