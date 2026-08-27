# Academic Study Tracker

A modern MERN (MongoDB, Express, React, Node.js) web application for university students to track classes, attendance, academic schedules, topics, and study notes.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** MongoDB with Mongoose ODM

## Project Structure

```text
academic-study-tracker/
├── client/          # React + TypeScript + Vite frontend
├── server/          # Node.js + Express + TypeScript backend
├── .gitignore       # Root Git ignore rules
└── README.md        # Project documentation
```

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)
- MongoDB (local instance or MongoDB Atlas URI)

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env    # Configure your PORT & MONGODB_URI
npm run dev
```
Backend will start on `http://localhost:5000` with health check at `http://localhost:5000/api/health`.

### 3. Frontend Setup
```bash
cd client
npm install
cp .env.example .env    # Configure VITE_API_URL if needed
npm run dev
```
Frontend will start on `http://localhost:5173`.
