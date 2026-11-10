# TRACAL - Authentic Homestay Experience Platform with Integrated AI

TRACAL is a full-stack homestay platform connecting travellers seeking authentic local experiences with verified hosts. It integrates a comprehensive suite of 6 AI-powered features across Guest, Host, and Administrator roles with free, unrestricted access.

---

## 🌟 Integrated AI Features

### 1. Smart Trip Budget Planner
- **Audience:** Guests / Travellers
- **Location:** `/travel-assistant` (Budget Tab)
- **Description:** Computes an intelligent, itemized trip budget breakdown covering accommodation, local food, transportation, and discretionary activities based on destination, travel duration, group size, and total planned budget. Identifies surplus or shortfall and highlights homestay recommendations fitting the budget.

### 2. AI Travel Personality
- **Audience:** Guests / Travellers & Admin
- **Location:** `/travel-assistant` (Personality Tab) & Navbar dropdown
- **Description:** Interactive 5-question psychological travel questionnaire evaluating pacing, social preferences, nature orientation, and culinary curiosity. Matches users to one of 4 curated travel archetypes (*The Mindful Explorer*, *The Heritage Seeker*, *The Thrill Seeker*, *The Serene Wanderer*), assigns custom mottoes and badges, and preserves assessment history.

### 3. Local Explorer
- **Audience:** Guests / Travellers
- **Location:** `/travel-assistant` (Local Explorer Tab)
- **Description:** Powered by OpenStreetMap (Nominatim & Overpass API), this tool surfaces verified nearby restaurants, hospitals & medical facilities, tourist attractions, cafes, ATMs, and shopping locations around selected destinations and homestays. Features precise Haversine distance calculations and zero external API keys or billing accounts required.

### 4. TrustScore
- **Audience:** Guests (Listing details), Hosts (Dashboard), Admin (Monitoring)
- **Location:** Homestay details page, Host Dashboard (`/host#ai-host-insights`), `/admin/ai-monitoring`
- **Description:** Algorithmic transparency score (0–100) combining Host Identity Verification (30 pts), Guest Review Sentiment & Quantity (30 pts), Host Response Rate & Reliability (20 pts), and Listing Profile Completeness (20 pts). Accompanied by actionable improvement tips for hosts.

### 5. AI Review Intelligence
- **Audience:** Guests & Property Hosts
- **Location:** Homestay details page & Host AI Insights
- **Description:** Analyzes homestay review collections via Google Gemini to extract honest guest sentiment, top 3 pros, top 3 cons, noise/cleanliness ratings, and an objective summary. Features strict ownership IDOR access controls.

### 6. Reality Check
- **Audience:** Guests & Property Hosts
- **Location:** Homestay details page & Host AI Insights
- **Description:** Evaluates listings for expectation-vs-reality gaps by comparing host marketing descriptions with authentic guest feedback. Flags potential trade-offs (e.g. accessibility, Wi-Fi speed in remote regions, steep terrain) so guests know exactly what to expect.

---

## 👥 Role-Based Access Points

| Role | Access Points & Navigation |
|---|---|
| **Guest / Traveller** | - **Home Page Hero Banner**: Quick 1-click launch to Travel Assistant<br>- **Navigation Bar**: Quick "AI Assistant" button & User Menu links<br>- **Travel Assistant (`/travel-assistant`)**: Unified hub for Budget, Personality, and Explorer<br>- **Homestay Details**: Integrated AI panel for TrustScore, Review Intelligence, and Reality Check |
| **Host** | - **Host Dashboard (`/host#ai-host-insights`)**: AI Host Insights panel with property selector<br>- **My Properties (`/properties`)**: Direct link to AI performance and TrustScore insights<br>- **Actionable Recommendations**: Tips to increase listing TrustScore and address guest feedback |
| **Administrator** | - **Admin Dashboard (`/admin`)**: AI Monitoring quick-access tile<br>- **AI Monitoring Dashboard (`/admin/ai-monitoring`)**: Live status of Gemini API & OpenStreetMap services, total profiles generated, TrustScore ecosystem health, and feature latency checks |

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
Create `backend/.env` with the following variables:

```ini
# Core Configuration
JWT_SECRET_KEY=your_secure_jwt_secret_key
MONGODB_URI=mongodb://localhost:27017
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Admin Seed Account
ADMIN_EMAIL=admin@tracal.com
ADMIN_PASSWORD=your_secure_admin_password

# External AI & Places Services
# Google Gemini API Key (for AI Travel Personality, Review Intelligence, Reality Check)
# Obtain from: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key

# Local Explorer: Powered by OpenStreetMap (Nominatim & Overpass API).
# Zero API keys or billing required!

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Email Service (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_char_app_password
FROM_EMAIL=your_email@gmail.com
```

### Frontend (`.env.local`)
Create `.env.local` in the project root:

```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
API_URL=http://127.0.0.1:8000
```

> **Security Rule:** Secret keys (`GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`, `JWT_SECRET_KEY`, `MONGODB_URI`, `RAZORPAY_KEY_SECRET`) must exist exclusively in `backend/.env`. Never expose secret keys in client-side code or `NEXT_PUBLIC_` variables.

---

## 🚀 Getting Started

### 1. Start the Backend API Server
```bash
# Activate virtual environment or install dependencies
pip install -r backend/requirements.txt  # or your python environment

# Seed the secure admin account (idempotent)
python backend/seed_admin.py

# Start FastAPI server
uvicorn backend.main:app --reload --port 8000
```
Backend API interactive documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Start the Frontend Next.js Server
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Testing

An end-to-end verification script is included in `scratch/test_ai_endpoints.py`. It tests:
1. Smart Trip Budget Planner calculation and shortfall logic.
2. AI Travel Personality questionnaire, archetype computation, and assessment persistence.
3. Local Explorer Google Places key detection and graceful fallback.
4. TrustScore multi-component calculation for both guests and hosts.
5. AI Review Intelligence and IDOR authorization checks (enforcing HTTP 403 on non-owners).
6. Reality Check expectation analysis and host permission checks.

To execute the verification suite:
```bash
python scratch/test_ai_endpoints.py
```
