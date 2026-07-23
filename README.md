# 🌙 Dream App

A beautiful dream journal app with AI analysis, voice input, and pattern detection.

## Features

- 🌙 Dream journal with categories and emotions
- 🎙️ Voice input (Turkish + English)
- 🧠 AI-powered dream analysis (OpenAI/Claude) - **secure backend**
- 📊 Statistics with interactive charts
- 🔁 Recurring dream pattern detection
- 🌓 Dark/Light mode
- 📱 PWA support (installable)
- 👤 Multi-user support with JWT authentication
- 🔒 API keys stored securely on server

## Architecture

```
Frontend (HTML/CSS/JS)  →  Backend (Node.js/Express)  →  AI APIs
                              ↓
                         .env (API keys)
```

## Development

### Frontend
Simply open `index.html` in a browser.

### Backend
```bash
cd server
npm install
cp .env.example .env   # Add your API keys
npm run dev
```

## Deployment to Railway (Backend)

1. Push this repo to GitHub
2. Go to [Railway](https://railway.app) and create new project
3. Connect your GitHub repo
4. Add environment variables:
   - `OPENAI_API_KEY` = your key
   - `ANTHROPIC_API_KEY` = your key
   - `JWT_SECRET` = random secret string
   - `FRONTEND_URL` = your frontend URL
5. Railway will auto-deploy

### Update Frontend API URL
In `js/storage.js`, update `API_URL` with your Railway backend URL:
```javascript
const API_URL = "https://your-app.up.railway.app/api";
```

## Deployment to GitHub Pages (Frontend)

1. Push to GitHub
2. Settings > Pages > Deploy from branch > `main`
3. Update `API_URL` in `js/storage.js` with your Railway URL

## Capacitor (Mobile App)

```bash
npm install
npx cap init DreamApp com.yourname.dreamapp
npx cap add android
npx cap add ios
npx cap sync
npx cap open android
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Create account |
| `/api/auth/login` | POST | No | Login |
| `/api/ai/analyze` | POST | Yes | AI dream analysis |
| `/api/health` | GET | No | Health check |

## License

MIT
