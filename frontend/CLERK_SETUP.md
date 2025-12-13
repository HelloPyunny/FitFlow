# Clerk Authentication Setup Guide

## 1. Install Clerk

Clerk pakage is already added in package.json. run these commands:

```bash
cd frontend
npm install
```

## 2. Create a Clerk Account and Get API Keys

1. Create an account at https://dashboard.clerk.com 
2. Create a new application
3. Go to the API Keys page and copy the Publishable Key

## 3. 환Environment Variable Setup

Create a `frontend/.env.local` file and add the following values (`.env` can also be used if preferred):

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_URL=http://localhost:8000
```

**중요**: 
- `.env` is included in .gitignore and will not be committed to Git.
- Never hardcode real API keys into source files.

## 4. Clerk Dashboard Configuration

Configure the following settings in the Clerk Dashboard:

- **Sign-in/Sign-up URLs**: 
  - Allowed redirect URLs: `http://localhost:5173/*`
  - Sign-in URL: `http://localhost:5173/sign-in`
  - Sign-up URL: `http://localhost:5173/sign-up`
  - After sign-in redirect: `http://localhost:5173/`
  - After sign-up redirect: `http://localhost:5173/`

## 5. Run

```bash
npm run dev
```
