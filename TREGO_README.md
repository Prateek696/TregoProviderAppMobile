# Trego MVP

Portugal field service marketplace for tradespeople (plumbers, electricians, carpenters).

Tradespeople speak jobs into a floating bubble → AI structures the job → invoice sent automatically via Moloni.

## Architecture

- **Backend**: Node.js + Express + PostgreSQL, hosted on Render
- **Mobile**: React Native (Android only)
- **AI**: Groq API (llama-3.3-70b-versatile) for job parsing
- **SMS Auth**: Twilio OTP
- **Push Notifications**: Firebase Cloud Messaging
- **Invoicing**: Moloni API

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env
# Fill in .env values
npm install
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npx react-native run-android
```

## Project Structure

```
Trego-MVP/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express entry point
│   │   ├── db.js             # PostgreSQL pool
│   │   ├── migrations/       # SQL migrations
│   │   ├── middleware/       # JWT auth
│   │   ├── routes/           # API routes
│   │   └── services/         # AI parser, notifications
│   └── .env.example
└── mobile/
    └── src/
        ├── api/              # Axios client
        ├── screens/          # App screens
        ├── components/       # Reusable UI
        ├── navigation/       # React Navigation
        ├── services/         # Offline queue
        ├── store/            # Auth token storage
        └── config.js         # Constants
```
