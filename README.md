# Jharkhand GK App

Living README for the Jharkhand GK Android app and backend. Update this file after every meaningful modification so future agents and developers know the original idea, current state, and remaining work.

## Original App Plan

Build a bilingual English/Hindi Android app for Jharkhand General Knowledge practice using the existing MongoDB Atlas question bank as the source of truth.

Core flow:

```text
Register/Login -> Onboarding Language Selection -> Home -> Select Question Range -> Learning / Practice / Revision
```

Main rules:

- Android app must never connect directly to MongoDB Atlas.
- A custom backend API sits between Android and MongoDB.
- Existing MongoDB question bank remains unchanged for v1.
- Use question `_id` as `questionRef`, for example `jharkhand-pocket-gk-mcqs:q000019`.
- Use `sourceQuestionNumber` for user-selected ranges because it is confirmed unique.
- Hide questions where `quality.needsReview: true`.
- If the preferred language is missing, show the other available language.
- No target exam selection.
- No guest mode.
- App is free for v1.
- Only Practice Mode reads and updates adaptive value.
- Learning Mode is relaxed and does not affect adaptive value.

Planned architecture:

```text
Android App -> Custom Backend API -> MongoDB Atlas
```

Project layout:

```text
JharkhandGK/
  backend/  Node.js + Express + Mongoose API
  android/  Android Studio Kotlin + Jetpack Compose app
```

## Planned Features

### Authentication

- Register with name, username/email, password, and preferred language.
- Store passwords as hashes only.
- Login returns JWT.
- Protected API routes require `Authorization: Bearer <token>`.

### Question Bank

Existing question fields expected:

```text
_id
bankId
questionId
chapterId
chapterTitle
sourceQuestionNumber
sourcePageStart
sourcePageEnd
type
question.en / question.hi
options
correctOptionKey
explanation.en / explanation.hi
examFacts
quality.needsReview
raw
```

### Practice Mode

- User selects a range such as `1-10`, `1-20`, `1-100`, or `51-100`.
- Backend loads only active questions in that range.
- Backend combines those questions with this user's saved `userQuestionStats`.
- Untouched questions use base value `100` without creating a DB record.
- Higher-value questions appear more often using weighted randomness.
- Wrong and timed-out questions should return soon.
- 30-second visible timer.
- Selecting an option locks the answer.
- Correct answer gives brief confirmation.
- Wrong or timeout shows correct answer and explanation.
- Answer submission updates only this user's adaptive value.

Adaptive constants:

```text
BASE_VALUE = 100
MIN_VALUE = 20
MAX_VALUE = 300
WRONG_DELTA = +40
TIMEOUT_DELTA = +50
CORRECT_FAST_DELTA = -30
CORRECT_SLOW_DELTA = -10
SLOW_THRESHOLD_MS = 20000
QUESTION_TIME_LIMIT_MS = 30000
```

### Learning Mode

- User selects a range.
- Questions are shown in normal order.
- No timer pressure.
- Manual Next button.
- Explanation and exam facts are shown inline.
- Does not change adaptive value.

### Revision Mode

- Review bookmarked questions.
- Later: include wrong, timed-out, and high-value questions.
- Allow range filtering later.

### Bookmarks

- User can bookmark important questions.
- One bookmark per user per question.

### Reports and Suggestions

- Every question has a report icon.
- User can report wrong answer, typo, confusing wording, bad explanation, topic/tag suggestion, or other issue.
- Reports are stored separately and do not directly edit the question bank.

### Progress

User progress should show:

```text
questions practiced
correct answers
wrong answers
timeouts
completion rate
bookmarked count
weak/high-value questions count
XP
streak
```

## Current Work Done

Last updated: 2026-09-17

### Backend Implemented

Location: `backend/`

Implemented:

- Express app setup.
- MongoDB Atlas connection via Mongoose.
- `.env.example` for safe local configuration.
- Render deployment blueprint in `render.yaml`.
- Node 20 LTS engine declaration for hosted deployment.
- Startup validation for required backend secrets.
- JWT auth helpers.
- Auth routes:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Question routes:
  - `GET /api/questions/range?bankId=&start=&end=`
  - `GET /api/learning/questions?bankId=&start=&end=`
- Practice routes:
  - `POST /api/practice/start`
  - `POST /api/practice/answer`
  - `POST /api/practice/end`
- Bookmark routes:
  - `GET /api/bookmarks`
  - `POST /api/bookmarks`
  - `DELETE /api/bookmarks/:questionRef`
- Report route:
  - `POST /api/reports`
- Progress route:
  - `GET /api/progress/summary`
- Mongoose models:
  - `User`
  - `Question`
  - `UserQuestionStat`
  - `Bookmark`
  - `Report`
  - `PracticeSession`
- Adaptive value utility logic.
- Language fallback utility.
- Public question response mapper.
- Weighted random question picker.
- Basic value-rule tests.

Backend verification already done:

```text
npm install: success
npm test: 5 tests passed
npm audit: 0 vulnerabilities
```

### Android Implemented

Location: `android/`

Implemented:

- Android Studio Gradle project scaffold.
- Kotlin + Jetpack Compose + Material 3 setup.
- Retrofit API client.
- JWT token storage using DataStore.
- API DTO models.
- App ViewModel for auth, range selection, learning, practice, bookmarks, reports, and progress.
- Screens/components:
  - Login/Register
  - Preferred language selection during registration
  - Home header
  - Range inputs
  - Mode selector
  - Learning screen
  - Practice screen with timer
  - Revision screen using bookmarks
  - Question card
  - Bookmark action
  - Report bottom sheet
- Local emulator API base URL:

```text
http://10.0.2.2:4000/api/
```

Android verification status:

```text
Not yet built from command line because Gradle is not installed on PATH in this environment.
Needs Android Studio Gradle sync and build.
```

## Needs To Be Done

### GitHub Upload Checklist

1. Keep `backend/.env` local. It is ignored and must not be committed.
2. Commit `backend/.env.example`, `render.yaml`, source files, and lockfiles.
3. Rotate any secret that was pasted into chat, screenshots, or a shared repository.
4. Push to GitHub.
5. In Render, create a Blueprint from `render.yaml` or a Web Service using `backend/` as the root directory.

### Immediate Next Steps

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill `MONGODB_URI`, `JWT_SECRET`, `QUESTION_COLLECTION`, and `DEFAULT_BANK_ID`.
3. Confirm the actual MongoDB question collection name.
4. Run backend locally:

```bash
cd backend
npm run dev
```

5. Open `android/` in Android Studio.
6. Let Gradle sync.
7. Build and run on emulator.
8. Test this first full loop:

```text
Register/Login -> select range -> start Practice -> answer question -> value updates -> next question
```

### Backend Work Remaining

- Test API with real MongoDB Atlas question bank.
- Confirm `Question` model collection points to the correct collection.
- Confirm query works with string `_id` format from the existing question bank.
- Add integration tests for auth and practice APIs.
- Improve session/streak calculation.
- Add duplicate-report prevention if desired.
- Add admin endpoints later for report review.
- Add stronger validation for request bodies.

### Android Work Remaining

- Sync and build in Android Studio.
- Fix any Gradle or Compose compile issues found by Android Studio.
- Improve navigation structure beyond single-screen state switching.
- Improve Practice Mode auto-advance timing:
  - correct: short green confirmation
  - wrong/timeout: 3-second explanation overlay
- Add polished source page/question number layout for small screens.
- Add bookmark filled/outline state.
- Add progress screen as a dedicated screen.
- Add profile/settings screen.
- Add better loading and error states.
- Add Hindi UI text option if desired.
- Improve visual design polish.

### Content/Data Work Remaining

- Clean messy explanations and exam facts in the question bank.
- Confirm all questions have valid `correctOptionKey`.
- Confirm `sourceQuestionNumber` is unique across the full bank.
- Confirm `quality.needsReview` is present or safely handled.
- Decide whether chapter info should be shown in the app.

## How To Run

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Put MongoDB Atlas credentials only in `backend/.env`.

Required `.env` values:

```text
PORT=4000
MONGODB_URI=...
JWT_SECRET=...
QUESTION_COLLECTION=questions
CORS_ORIGIN=*
DEFAULT_BANK_ID=jharkhand-pocket-gk-mcqs
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
```

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Render

The root `render.yaml` deploys the backend as a Render Web Service with:

```text
Root Directory: backend
Build Command: npm ci
Start Command: npm start
Health Check Path: /health
Node Version: 20
```

Set the secret environment variables in Render, then verify:

```text
https://your-render-service.onrender.com/health
```

### Android

Open the `android/` folder in Android Studio and sync Gradle.

For emulator testing, keep:

```text
http://10.0.2.2:4000/api/
```

This connects the Android emulator to the backend running on your computer.

For a physical Android phone, change the API base URL to your computer's LAN IP, for example:

```text
http://192.168.1.10:4000/api/
```

## Update Log

### 2026-09-17

- Created initial project layout with separate `backend/` and `android/`.
- Implemented backend API scaffold and MongoDB models.
- Implemented adaptive Practice Mode value logic.
- Implemented Android Compose scaffold and main MVP screens.
- Added root `.gitignore`.
- Added this living README.
- Prepared backend for GitHub and Render deployment with safe env template, Node 20 engine, required-env validation, and deployment docs.

## README Maintenance Rule

After every meaningful project change, update:

1. `Current Work Done`
2. `Needs To Be Done`
3. `Update Log`
4. Any setup instructions affected by the change
