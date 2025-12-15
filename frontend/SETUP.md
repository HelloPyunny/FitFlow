# Frontend Setup Guide

## 1. Prerequisites

Install [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## 2. Installation

### environmetal variables

a. Create `.env` file and put your variables there. Use `.env.example` as reference.
b. Run `make install` to install all the Node packages we're using
c. Run `make start` to start the Expo server, default prot: http://localhost:5173

## Clerk Authentication Setup Guide

### 1. Install Clerk

Clerk pakage is already added in package.json. run these commands:

```bash
cd frontend
npm install
```

### 2. Create a Clerk Account and Get API Keys

1. Create an account at https://dashboard.clerk.com 
2. Create a new application
3. Go to the API Keys page and copy the Publishable Key

### 3. Environment Variable Setup

Create a `frontend/.env.local` file and add the following values (`.env` can also be used if preferred):

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_URL=http://localhost:8000
```

## usfull make commands
```bash
make install # install depoendencies
make start # start server, default prot: http://localhost:5173
make stop # to stop the server
make build # build
make preview # preview
make clean # clean the frontend server
```