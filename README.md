# 🚌 Smart Bus Tracking System

A real-time GPS bus tracking application with live map, driver app, and admin dashboard.

![Demo](https://img.shields.io/badge/Status-Working-brightgreen)
![Node](https://img.shields.io/badge/Node.js-18+-green)
![Python](https://img.shields.io/badge/Python-3.10+-blue)

---

## 📋 What You Need Before Starting

Make sure you have these installed on your computer:

| Software | Download Link |
|----------|---------------|
| **Node.js** (v18 or higher) | [Download Node.js](https://nodejs.org/) |
| **Python** (v3.10 or higher) | [Download Python](https://www.python.org/downloads/) |
| **Git** | [Download Git](https://git-scm.com/) |

---

## � Installation (Step-by-Step)

### Step 1: Download the Project

Open your terminal (Command Prompt or PowerShell) and run:

```bash
git clone https://github.com/tellapallyakhil/Smart-bus-tracking-gps.git
cd Smart-bus-tracking-gps
```

---

### Step 2: Setup Python Backend

```bash
# Create virtual environment
python -m venv venv

# Activate it (Windows)
.\venv\Scripts\activate

# Install Python packages
pip install -r requirements.txt

# Generate training data
python backend/generate_data.py

# Train the ML model
python backend/train_model.py
```

---

### Step 3: Setup Socket Server

```bash
cd socket-server
npm install
cd ..
```

---

### Step 4: Setup Web App

```bash
cd web
npm install
cd ..
```

---

## ▶️ How to Run

### Option A: Quick Start (Windows Only)

Just double-click **`start_app.bat`** file.

### Option B: Manual Start

Open **3 separate terminals** and run:

**Terminal 1 - Socket Server:**
```bash
cd socket-server
npm run dev
```

**Terminal 2 - Python Backend:**
```bash
.\venv\Scripts\activate
python -m uvicorn backend.api:app --reload --port 8000
```

**Terminal 3 - Web App:**
```bash
cd web
npm run dev
```

---

## 🌐 Open the App

After starting, open these links in your browser:

| Page | URL |
|------|-----|
| **Passenger Dashboard** | http://localhost:3000 |
| **Driver App** | http://localhost:3000/driver |
| **Admin Panel** | http://localhost:3000/admin |

---

## 🔐 Login Instructions

1. Go to http://localhost:3000/login
2. Select your role (User / Driver / Admin)
3. Enter any email and password
4. Click **Register** (first time) or **Login** (returning user)

---

## ✨ Features

- 🗺️ **Live Map** - See buses moving in real-time
- 📍 **GPS Tracking** - Drivers share their location
- ⏱️ **ETA Prediction** - AI predicts bus arrival times
- 🔔 **Geofence Alerts** - Notifications when bus arrives at stops
- 👨‍✈️ **Driver Dashboard** - Easy-to-use driver interface
- 🛡️ **Admin Panel** - Monitor all buses and alerts

---

## 🛠️ Troubleshooting

### Error: "CSS chunk loading failed"
```bash
cd web
Remove-Item -Recurse -Force .next
npm run dev
```

### Error: "Module not found"
```bash
cd web
npm install
```

### Error: "Python/pip not found"
Make sure Python is installed and added to PATH.

---

## 📁 Project Structure

```
Smart-bus-tracking-gps/
├── backend/          # Python ML API
├── socket-server/    # Real-time WebSocket server
├── web/              # Next.js frontend
├── requirements.txt  # Python dependencies
├── start_app.bat     # Windows quick-start script
└── README.md         # This file
```

---

## 👨‍💻 Tech Stack

- **Frontend**: Next.js 14, React, Leaflet Maps
- **Backend**: Node.js, Socket.IO, FastAPI
- **ML**: Python, Scikit-learn (Random Forest)
- **Auth**: Supabase

---

## 📞 Support

If you face any issues, create an issue on GitHub or contact the developer.

---

Made with ❤️ by Akhil Tellapally
