# Smart Bus Tracking (Node.js + Python ML + Next.js)

A real-time bus tracking system built with a **Node.js Socket Server**, a **Python ML Backend** for ETA predictions, and a **Next.js Frontend**.

## 🚀 Architecture
- **Socket Server (`/socket-server`)**: 
  - Runs on Port `4000`.
  - Handles real-time websocket connections to broadcast GPS updates.
- **ML Backend (`/backend`)**:
  - Runs on Port `8000`.
  - Built with **FastAPI**.
  - Uses **Random Forest** to predict Bus ETAs based on traffic history.
- **Frontend (`/web`)**: 
  - Runs on Port `3000`.
  - Built with **Next.js 14**.
  - Displays live buses on a map with a Sci-fi Glassmorphism UI.

## 🛠️ Installation & Setup

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)

### 2. Backend Setup (One-time)
This application uses a Python backend for ETA predictions. You must set up the virtual environment and train the model first.

#### Windows
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Generate Synthetic Training Data
python backend/generate_data.py

# Train the ML Model
python backend/train_model.py
```

#### Mac/Linux
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 backend/generate_data.py
python3 backend/train_model.py
```

### 3. Install Node.js Dependencies
Install libraries for both the socket server and web app.

```bash
# Socket Server
cd socket-server
npm install

# Web Frontend
cd ../web
npm install
```

## 🚀 How to Run

### Option 1: One-Click (Windows Only)
Simply double-click **`start_app.bat`**. 
This script automatically detects your Python environment and launches all three services (Backend, Socket Server, Frontend).

### Option 2: Manual Start
Open 3 separate terminals:

1. **Socket Server**:
   ```bash
   cd socket-server
   npm run dev
   ```

2. **ML Backend**:
   ```bash
   # Activate venv first!
   .\venv\Scripts\activate 
   uvicorn backend.api:app --reload --port 8000
   ```

3. **Frontend**:
   ```bash
   cd web
   npm run dev
   ```

## 📱 Usage
- **Passenger Dashboard**: Open `http://localhost:3000`. Setup will show live moving bus markers.
- **Driver App**: Open `http://localhost:3000/driver`. 
  - Login (any credentials work for demo).
  - Select "Secunderabad - Charminar" route.
  - Click **Start Tracking** to simulate a bus.
