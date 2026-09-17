# Jharkhand GK Backend

Custom API server for the Jharkhand GK Android app.

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Fill `.env` with your MongoDB Atlas connection string. Do not put this value in the Android app.

## Deploy to Render Free

This backend is ready for Render as a free Web Service.

### Option 1: Render dashboard

1. Push this project to GitHub.
2. In Render, create a new **Web Service** from the GitHub repository.
3. Use these settings:

```text
Root Directory: backend
Runtime: Node
Build Command: npm ci
Start Command: npm start
Health Check Path: /health
Instance Type: Free
```

4. Add these environment variables in Render:

```text
MONGODB_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<a long random secret>
AUTH0_DOMAIN=dev-qe5872uaalyzgbm2.us.auth0.com
AUTH0_CLIENT_ID=7N2UzLDpxbdnhRwuUSXBRcFWZhiJzmDc
QUESTION_COLLECTION=GK
CORS_ORIGIN=*
DEFAULT_BANK_ID=jharkhand-pocket-gk-mcqs
NODE_ENV=production
```

Render provides `PORT` automatically, so do not set it manually.

### Option 2: Render blueprint

Push the repository with the root `render.yaml` file, then create a new Render Blueprint from the repository. Render will read the backend settings automatically. You still need to enter the secret values for `MONGODB_URI`, `JWT_SECRET`, `AUTH0_DOMAIN`, and `AUTH0_CLIENT_ID`.

After deployment, test:

```text
https://your-render-service.onrender.com/health
```

It should return:

```json
{ "ok": true }
```

## Main Flow

```text
Android app -> Backend API -> MongoDB Atlas
```

The existing question bank remains unchanged. User accounts, adaptive values, bookmarks, reports, and sessions are saved in separate collections.

## Endpoints

```text
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

GET /api/questions/range?bankId=&start=&end=
POST /api/practice/start
POST /api/practice/answer
POST /api/practice/end

GET /api/learning/questions?bankId=&start=&end=

POST /api/bookmarks
DELETE /api/bookmarks/:questionRef
GET /api/bookmarks

POST /api/reports

GET /api/progress/summary
```
