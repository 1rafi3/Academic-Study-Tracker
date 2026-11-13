# Academic Study Tracker

A modern MERN (MongoDB, Express, React, Node.js) web application for university students to track classes, attendance, academic schedules, topics, assessments, and study notes.

## Key Features

- **Course Academic Hub & Events Explorer:** Manage course-wise academic events (CTs, Quizzes, Midterms, Finals), record obtained marks with strict validation, store private performance notes, and configure custom marks distribution structures.
- **Smart Attendance Analytics & Forecasting:** Live attendance percentage calculations, SAFE/WARNING/DANGER indicators, Bunk Allowance, and Recovery Class requirements.
- **Interactive Calendar & 90-Minute Routine Timetable:** Unified schedule matrix, multi-slot lab spanning, cancellation tracking, and holiday detection.
- **Bangladesh Six Seasons (ষড়ঋতু) Dynamic Atmosphere:** Automatic astronomical season detection with lightweight ambient animations and seasonal settings.
- **Dynamic Theme Engine & Eye-Comfort Aesthetics:** Glare-free, WCAG AA compliant light mode color grading alongside sleek modern glass and dark themes.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack React Query, Lucide Icons
- **Backend:** Node.js, Express.js, TypeScript, Appwrite Cloud JWT Auth
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

## Author

**MD Sheik Rafiwol Karim Rafi**
