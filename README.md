# TRACAL 
### Authentic Homestay Experience Platform with Integrated AI

TRACAL is a full-stack, AI-powered homestay booking platform connecting travellers seeking authentic local experiences with hosts.

It combines intelligent travel planning, personalized recommendations, property management, trust evaluation, and AI-powered insights across Guest, Host, and Administrator roles.

---

##  Integrated AI Features

### 1. Smart Trip Budget Planner
- **Audience:** Guests / Travellers
- **Location:** `/travel-assistant`
- Calculates itemized trip budgets covering accommodation, food, transportation, and activities.
- Considers destination, travel duration, group size, and planned budget.
- Identifies budget surplus or shortfall and suggests suitable homestays.

### 2. AI Travel Personality
- **Audience:** Guests / Travellers
- **Location:** `/travel-assistant`
- Interactive travel personality questionnaire.
- Identifies travel preferences and matches users with four travel archetypes:
  - The Mindful Explorer
  - The Heritage Seeker
  - The Thrill Seeker
  - The Serene Wanderer
- Provides personalized travel insights.

### 3. Local Explorer
- **Audience:** Guests / Travellers
- **Location:** `/travel-assistant`
- Powered by OpenStreetMap, Nominatim, and Overpass API.
- Discovers nearby:
  - Restaurants
  - Hospitals
  - Tourist attractions
  - Cafes
  - ATMs
  - Shopping locations
- Includes distance calculations using the Haversine formula.
- Does not require Google Places API billing.

### 4. TrustScore
- **Audience:** Guests, Hosts, and Admin
- Evaluates property trustworthiness using a 0–100 scoring system.
- Considers:
  - Host identity verification
  - Guest reviews and sentiment
  - Host response rate and reliability
  - Listing profile completeness
- Provides actionable improvement suggestions.

### 5. AI Review Intelligence
- **Audience:** Guests and Hosts
- Analyzes property reviews using Google Gemini.
- Extracts:
  - Guest sentiment
  - Top advantages and disadvantages
  - Cleanliness and noise-related feedback
  - Objective review summaries

### 6. Reality Check
- **Audience:** Guests and Hosts
- Compares host property descriptions with actual guest feedback.
- Identifies potential expectation-versus-reality gaps.
- Highlights possible trade-offs involving accessibility, Wi-Fi, location, and other property conditions.

### Additional AI Capabilities
- AI Host Insights
- Admin AI Monitoring
- Personalized Homestay Recommendations
- AI-Assisted Travel Planning

---

## Role-Based Portals

### Guest Portal
- Explore and search homestays.
- View property details and availability.
- Book homestays.
- Manage reservations and favorites.
- Access personalized recommendations.
- Use AI Travel Assistant.
- Explore property TrustScore and AI reviews.

### Host Portal
- Create and manage property listings.
- Manage bookings and availability.
- Submit host verification requests.
- Access AI Host Insights.
- Monitor property TrustScore.
- Receive actionable recommendations.

### Administrator Portal
- Manage users and properties.
- Review host verification requests.
- Monitor bookings and platform activity.
- Access analytics.
- Monitor AI services and feature performance.

---

## Technology Stack

**Frontend**
- Next.js
- React.js
- TypeScript
- Tailwind CSS

**Backend**
- Python
- FastAPI
- REST APIs

**Database**
- MongoDB

**Artificial Intelligence**
- Google Gemini API

**External Integrations**
- OpenStreetMap
- Nominatim
- Overpass API
- Razorpay
- JWT Authentication

---

##  Project Architecture

TRACAL follows a frontend-backend architecture.

- Frontend: Next.js application
- Backend: FastAPI REST API
- Database: MongoDB
- AI Services: Gemini-powered intelligence features
- Authentication: JWT-based authentication
- Payments: Razorpay integration

---

##  Environment Configuration

### Backend

Create a `backend/.env` file.

Configure the following variables with your own credentials:

```env
JWT_SECRET_KEY=your_secure_jwt_secret
MONGODB_URI=mongodb://localhost:27017
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

ADMIN_EMAIL=admin@tracal.com
ADMIN_PASSWORD=your_secure_admin_password

GEMINI_API_KEY=your_gemini_api_key

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_app_password
FROM_EMAIL=your_email@gmail.com
```

### Frontend

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
API_URL=http://127.0.0.1:8000
```

**Security:** Never upload actual API keys, passwords, database credentials, or secret environment files to GitHub.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/priyachaudhary0806/tracal.git
cd tracal
```

### 2. Backend Setup

```bash
pip install -r backend/requirements.txt
python backend/seed_admin.py
python -m uvicorn backend.main:app --reload --port 8000
```

Backend API documentation:

`http://localhost:8000/docs`

### 3. Frontend Setup

Open another terminal:

```bash
npm install
npm run dev
```

Open the application:

`http://localhost:3000`

Make sure MongoDB is running and both environment files are configured before starting the application.

---

## 🎯 Project Vision

Our vision is to simplify travel experiences by combining homestay discovery, intelligent planning, trustworthy property information, and personalized AI assistance.

TRACAL aims to make travel smarter, safer, and more convenient for travellers and property hosts.

---

## © Copyright & Ownership

Copyright © 2026 Kumari Priya / TRACAL Original Project Authors.

TRACAL is an original project. Its original design, architecture, source code, implementation, and documentation are the intellectual work of its respective authors.

This repository is publicly available for portfolio visibility, educational reference, and collaboration.

**Important Notice:**
- Do not claim the original project or its work as your own.
- Proper credit must be given to the original authors when referencing this project.
- Contributions are welcome through Pull Requests.
- Unauthorized copying, redistribution, modification, or commercial use is not permitted without prior written permission, except where expressly permitted by the applicable license.

---

## 🤝 Contributions

Genuine contributions and improvements are welcome.

All contributions should be submitted through GitHub Pull Requests and are subject to review.

Contributors must respect the original authorship and ownership of TRACAL.

---

## 📌 Repository

GitHub: https://github.com/priyachaudhary0806/tracal

---

**Built with innovation, technology, and a vision to make travel smarter.**