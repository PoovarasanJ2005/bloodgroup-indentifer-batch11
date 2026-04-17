# 🩸 BloodAI — Blood Group Prediction from Fingerprints

## Complete Project Guide & Execution Manual

> **AI-powered blood group prediction using fingerprint image analysis with a Deep Learning CNN model, built on the MERN stack with a dark purple/black themed UI.**

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Architecture](#3-project-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Prerequisites & Installation](#5-prerequisites--installation)
6. [Step-by-Step Execution Guide](#6-step-by-step-execution-guide)
7. [CNN Model — How It Works](#7-cnn-model--how-it-works)
8. [Backend API Reference](#8-backend-api-reference)
9. [Frontend Pages & Features](#9-frontend-pages--features)
10. [Security Features Explained](#10-security-features-explained)
11. [User Roles & Workflows](#11-user-roles--workflows)
12. [Configuration & Environment Variables](#12-configuration--environment-variables)
13. [Troubleshooting](#13-troubleshooting)
14. [Screenshots & UI Theme](#14-screenshots--ui-theme)

---

## 1. Project Overview

### What does this project do?

This application predicts a person's **blood group** (A+, A−, AB+, AB−, B+, B−, O+, O−) by analyzing their **fingerprint image** using a trained **Convolutional Neural Network (CNN)**.

### Key Highlights

| Feature | Description |
|---|---|
| 🧠 **AI Model** | CNN trained on 6,001 fingerprint images across 8 blood groups |
| 🔐 **Security** | AES-256 encryption, JWT auth, bcrypt hashing, rate limiting |
| 🎂 **Age Restriction** | Only users aged 18+ can register (biometric data protection) |
| 👤 **User Module** | Signup, login, upload fingerprint, view results & history |
| 🛡️ **Admin Module** | Dashboard analytics, user management, prediction monitoring |
| 🎨 **UI Theme** | Dark purple + black gradient, glassmorphism, neon accents, Framer Motion animations |

### Dataset Summary

| Blood Group | Number of Images |
|:-----------:|:----------------:|
| A+          | 565              |
| A−          | 1,009            |
| AB+         | 708              |
| AB−         | 761              |
| B+          | 652              |
| B−          | 741              |
| O+          | 852              |
| O−          | 713              |
| **Total**   | **6,001**        |

---

## 2. Technology Stack

### Frontend (Client)
| Technology | Purpose |
|---|---|
| React.js (Vite) | UI framework |
| React Router DOM | Client-side routing |
| Axios | HTTP requests |
| Framer Motion | Animations |
| Recharts | Dashboard charts & analytics |
| React Icons | Icon library |
| React Hot Toast | Notification toasts |
| React Dropzone | Drag-and-drop file upload |

### Backend (Server)
| Technology | Purpose |
|---|---|
| Node.js + Express.js | REST API server |
| MongoDB + Mongoose | Database |
| JWT (jsonwebtoken) | Authentication tokens |
| bcryptjs | Password hashing |
| CryptoJS (AES-256) | Fingerprint image encryption |
| Multer | File upload handling |
| Helmet | HTTP security headers |
| express-rate-limit | API rate limiting |
| express-validator | Input validation |
| Nodemailer | Email notifications |
| Axios | Proxy requests to ML API |
| form-data | Multipart forwarding |

### ML/AI (Model)
| Technology | Purpose |
|---|---|
| Python 3.10 | Runtime |
| TensorFlow / Keras | CNN model training |
| Flask + Flask-CORS | ML prediction API |
| Pillow (PIL) | Image preprocessing |
| NumPy | Numerical operations |
| scikit-learn | Metrics & evaluation |
| Matplotlib + Seaborn | Training plots & confusion matrix |

---

## 3. Project Architecture

```
┌─────────────────┐      HTTP (REST)      ┌─────────────────┐
│                 │ ◄──────────────────── │                 │
│   React.js      │      Port 5173        │   User Browser  │
│   (Vite)        │ ────────────────────► │                 │
│                 │                       └─────────────────┘
└────────┬────────┘
         │ API calls (Port 5001)
         ▼
┌─────────────────┐      Mongoose         ┌─────────────────┐
│                 │ ────────────────────► │                 │
│   Express.js    │      Port 27017       │   MongoDB       │
│   Backend       │ ◄──────────────────── │   Database      │
│                 │                       └─────────────────┘
└────────┬────────┘
         │ HTTP (Port 5000)
         ▼
┌─────────────────┐
│                 │
│   Flask API     │──── CNN Model (.h5)
│   (Python)      │
│                 │
└─────────────────┘
```

### Data Flow (Prediction)

```
1. User uploads fingerprint image (React)
2. Image sent to Express.js backend (Multer receives it)
3. Backend encrypts image with AES-256 and stores encrypted copy
4. Backend forwards original image to Flask ML API
5. Flask preprocesses image (grayscale, 96×96, normalize)
6. CNN model predicts blood group + confidence scores
7. Flask returns prediction to Express.js
8. Express.js saves result in MongoDB
9. Result displayed to user in React frontend
10. Email notification sent (optional)
```

---

## 4. Folder Structure

```
e:\final year\
│
├── 📂 dataset/
│   └── 📂 dataset_blood_group/
│       ├── A+/   (565 images)
│       ├── A-/   (1009 images)
│       ├── AB+/  (708 images)
│       ├── AB-/  (761 images)
│       ├── B+/   (652 images)
│       ├── B-/   (741 images)
│       ├── O+/   (852 images)
│       └── O-/   (713 images)
│
├── 📂 ml-model/                      ◄── Python CNN + Flask API
│   ├── train_model.py                    Training script
│   ├── app.py                            Flask prediction API
│   ├── requirements.txt                  Python dependencies
│   └── 📂 saved_model/                  (created after training)
│       ├── blood_group_model.h5          Trained CNN model
│       ├── best_model.h5                Best checkpoint
│       ├── class_mapping.json            Class index → label map
│       ├── metrics.json                  Accuracy, loss, etc.
│       ├── training_plots.png            Accuracy/loss curves
│       └── confusion_matrix.png          Confusion matrix heatmap
│
├── 📂 server/                         ◄── Express.js Backend
│   ├── server.js                         Main server entry point
│   ├── .env                              Environment variables
│   ├── package.json                      Node dependencies
│   ├── 📂 config/
│   │   └── db.js                         MongoDB connection
│   ├── 📂 models/
│   │   ├── User.js                       User schema (age, bcrypt, roles)
│   │   └── Prediction.js                 Prediction schema
│   ├── 📂 middleware/
│   │   └── auth.js                       JWT verify, admin guard, age check
│   ├── 📂 routes/
│   │   ├── auth.js                       Register, login, OTP, profile
│   │   ├── prediction.js                 Upload, predict, history, stats
│   │   └── admin.js                      Dashboard, users, prediction logs
│   ├── 📂 utils/
│   │   └── helpers.js                    JWT gen, AES encrypt, OTP, email
│   └── 📂 uploads/encrypted/            (created at runtime)
│
└── 📂 client-app/                     ◄── React.js Frontend (Vite)
    ├── index.html                        HTML entry point
    ├── package.json                      Node dependencies
    ├── vite.config.js                    Vite configuration
    └── 📂 src/
        ├── main.jsx                      React DOM entry
        ├── App.jsx                       Routes & auth wrappers
        ├── index.css                     Global dark theme CSS
        ├── 📂 context/
        │   └── AuthContext.jsx           Auth state (login/register/logout)
        ├── 📂 services/
        │   └── api.js                    Axios API service layer
        ├── 📂 components/layout/
        │   ├── AppLayout.jsx             Sidebar + content wrapper
        │   ├── Sidebar.jsx               Navigation sidebar
        │   └── Layout.css                Sidebar styles
        └── 📂 pages/
            ├── Login.jsx                 Login page
            ├── Register.jsx              Register page (18+ check)
            ├── Auth.css                  Auth pages styles
            ├── Dashboard.jsx             User dashboard
            ├── Dashboard.css             Dashboard styles
            ├── Predict.jsx               Fingerprint upload + result
            ├── Predict.css               Predict page styles
            ├── History.jsx               Prediction history table
            ├── History.css               History page styles
            ├── Profile.jsx               User profile management
            ├── AdminDashboard.jsx        Admin analytics + charts
            ├── AdminUsers.jsx            Admin user management
            ├── AdminPredictions.jsx      Admin prediction logs
            └── Admin.css                 Admin pages styles
```

---

## 5. Prerequisites & Installation

### Software You Need Installed

| Software | Required Version | Download |
|---|---|---|
| **Node.js** | v18 or higher | https://nodejs.org |
| **Python** | 3.10 (specifically for TensorFlow) | https://python.org |
| **MongoDB** | v6 or higher | https://www.mongodb.com/try/download/community |
| **Git** | Any recent version | https://git-scm.com |

> ⚠️ **IMPORTANT**: TensorFlow does NOT support Python 3.14. You must use **Python 3.10** for the ML model. Verify with: `py -3.10 --version`

### Verify Everything is Installed

Open **PowerShell** and run each command:

```powershell
# Check Node.js
node --version
# Expected: v18.x.x or higher

# Check npm
npm --version
# Expected: 9.x.x or higher

# Check Python 3.10 (Windows py launcher)
py -3.10 --version
# Expected: Python 3.10.x

# Check MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"
# Expected: { ok: 1 }
```

---

## 6. Step-by-Step Execution Guide

### 📋 Overview of Steps

| Step | What | Where | Time |
|:----:|------|-------|------|
| 1 | Install Python packages | `ml-model/` | ~5 min |
| 2 | Train the CNN model | `ml-model/` | ~15–30 min |
| 3 | Install Node packages (server) | `server/` | ~1 min |
| 4 | Install Node packages (client) | `client-app/` | ~1 min |
| 5 | Start MongoDB | System | — |
| 6 | Start Flask ML API | `ml-model/` | Terminal 1 |
| 7 | Start Express.js Backend | `server/` | Terminal 2 |
| 8 | Start React Frontend | `client-app/` | Terminal 3 |

---

### STEP 1 — Install Python Dependencies

Open **PowerShell** and run:

```powershell
cd "e:\final year\ml-model"

py -3.10 -m pip install tensorflow flask flask-cors Pillow numpy scikit-learn matplotlib seaborn
```

**What this installs:**
- `tensorflow` — Deep learning framework for CNN
- `flask` + `flask-cors` — Python web server for the ML API
- `Pillow` — Image processing (resize, grayscale)
- `numpy` — Numerical array operations
- `scikit-learn` — Classification report & confusion matrix
- `matplotlib` + `seaborn` — Training plots

---

### STEP 2 — Train the CNN Model

> ⏱️ This takes **15–30 minutes** depending on your hardware (GPU speeds it up).

```powershell
cd "e:\final year\ml-model"

py -3.10 train_model.py
```

**What happens during training:**
1. Loads 6,001 fingerprint images from `dataset/dataset_blood_group/`
2. Converts all images to **96×96 grayscale** and normalizes pixel values (0–1)
3. Splits data: **80% training** / **20% validation**
4. Applies data augmentation (rotation, shift, zoom, flip)
5. Trains the CNN for up to **50 epochs** with early stopping
6. Saves the best model to `saved_model/blood_group_model.h5`
7. Generates evaluation plots and metrics

**Expected output at the end:**
```
════════════════════════════════════════════════════════════
✅ TRAINING COMPLETE!
   Final Accuracy: XX.XX%
   Model: saved_model/blood_group_model.h5
════════════════════════════════════════════════════════════
```

**Files created in `ml-model/saved_model/`:**
| File | Description |
|---|---|
| `blood_group_model.h5` | The trained CNN model |
| `best_model.h5` | Best checkpoint during training |
| `class_mapping.json` | Maps class index to blood group label |
| `metrics.json` | Accuracy, loss, per-class precision/recall |
| `training_plots.png` | Accuracy & loss curves |
| `confusion_matrix.png` | 8×8 confusion matrix heatmap |

---

### STEP 3 — Install Node.js Packages (Backend)

```powershell
cd "e:\final year\server"

npm install
```

**What this installs:** Express.js, Mongoose, JWT, bcrypt, CryptoJS, Multer, Helmet, rate-limiter, validator, Nodemailer, Axios, form-data.

---

### STEP 4 — Install Node.js Packages (Frontend)

```powershell
cd "e:\final year\client-app"

npm install
```

**What this installs:** React Router, Axios, Framer Motion, Recharts, React Icons, React Hot Toast, React Dropzone.

---

### STEP 5 — Start MongoDB

Make sure MongoDB is running on your machine. If it's installed as a service, it should already be running. Otherwise:

```powershell
# If MongoDB is installed but not running as a service:
mongod --dbpath "C:\data\db"

# Or if using MongoDB Compass, just open the application.
```

**Verify MongoDB is running:**
```powershell
mongosh --eval "db.runCommand({ ping: 1 })"
```
You should see `{ ok: 1 }`.

---

### STEP 6 — Start the Flask ML API (Terminal 1)

> ⚡ Open a **NEW PowerShell window** (keep it open)

```powershell
cd "e:\final year\ml-model"

py -3.10 app.py
```

**Expected output:**
```
🧠 Loading CNN model...
✅ Model loaded successfully!
🏷️  Classes: ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']

🚀 Flask ML API running on http://localhost:5000
```

**Test it's working:**
Open another terminal and run:
```powershell
curl http://localhost:5000/api/health
```
Expected response:
```json
{"classes":["A+","A-","AB+","AB-","B+","B-","O+","O-"],"model_loaded":true,"status":"healthy"}
```

---

### STEP 7 — Start the Express.js Backend (Terminal 2)

> ⚡ Open a **SECOND PowerShell window** (keep it open)

```powershell
cd "e:\final year\server"

npm run dev
```

**Expected output:**
```
✅ MongoDB connected: 127.0.0.1
👤 Default admin user created

🚀 Server running on http://localhost:5001
📡 ML API expected at http://localhost:5000
🗄️  MongoDB: mongodb://127.0.0.1:27017/bloodgroup_prediction
```

**Test it's working:**
```powershell
curl http://localhost:5001/api/health
```
Expected:
```json
{"status":"healthy","timestamp":"2026-04-13T..."}
```

---

### STEP 8 — Start the React Frontend (Terminal 3)

> ⚡ Open a **THIRD PowerShell window** (keep it open)

```powershell
cd "e:\final year\client-app"

npm run dev
```

**Expected output:**
```
  VITE v8.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 🎉 Open Your Browser

Navigate to: **http://localhost:5173**

---

### 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@bloodgroup.com` | `Admin@123456` |
| **User** | Register a new account | (must be 18+ years old) |

---

## 7. CNN Model — How It Works

### Architecture

```
Input (96×96×1 grayscale image)
    │
    ▼
┌─ Block 1 ──────────────────┐
│  Conv2D(32) → BatchNorm    │
│  Conv2D(32) → BatchNorm    │
│  MaxPool(2×2) → Dropout(25%)│
└────────────────────────────┘
    │
    ▼
┌─ Block 2 ──────────────────┐
│  Conv2D(64) → BatchNorm    │
│  Conv2D(64) → BatchNorm    │
│  MaxPool(2×2) → Dropout(25%)│
└────────────────────────────┘
    │
    ▼
┌─ Block 3 ──────────────────┐
│  Conv2D(128) → BatchNorm   │
│  Conv2D(128) → BatchNorm   │
│  MaxPool(2×2) → Dropout(25%)│
└────────────────────────────┘
    │
    ▼
┌─ Block 4 ──────────────────┐
│  Conv2D(256) → BatchNorm   │
│  MaxPool(2×2) → Dropout(25%)│
└────────────────────────────┘
    │
    ▼
    Flatten
    │
    ▼
    Dense(512) → BatchNorm → Dropout(50%)
    Dense(256) → BatchNorm → Dropout(50%)
    Dense(8, softmax)  → Output: [A+, A-, AB+, AB-, B+, B-, O+, O-]
```

### Image Preprocessing Pipeline

```
Raw Image → Convert to Grayscale → Resize to 96×96 → Normalize (÷ 255) → Reshape to (1, 96, 96, 1)
```

### Data Augmentation (Training Only)

| Augmentation | Value |
|---|---|
| Rotation | ±15° |
| Width shift | ±10% |
| Height shift | ±10% |
| Shear | 10% |
| Zoom | ±10% |
| Horizontal flip | Yes |

### Training Configuration

| Parameter | Value |
|---|---|
| Optimizer | Adam (lr=0.001) |
| Loss function | Categorical crossentropy |
| Batch size | 32 |
| Max epochs | 50 |
| Early stopping patience | 10 epochs |
| Learning rate reduction | ×0.5 after 5 epochs without improvement |
| Train/test split | 80% / 20% |

### Evaluation Metrics Generated

- **Overall accuracy** (on 20% test set)
- **Per-class precision, recall, F1-score** (classification report)
- **Confusion matrix** (8×8 heatmap)
- **Training/validation accuracy & loss curves**

All saved in `ml-model/saved_model/`.

---

## 8. Backend API Reference

### Base URL: `http://localhost:5001/api`

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| POST | `/auth/register` | Create account (18+ only) | ❌ |
| POST | `/auth/login` | Login & get JWT token | ❌ |
| POST | `/auth/verify-otp` | Verify email with OTP | ✅ |
| GET | `/auth/profile` | Get user profile | ✅ |
| PUT | `/auth/profile` | Update name/phone | ✅ |

### Prediction Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| POST | `/predictions/predict` | Upload fingerprint & predict | ✅ |
| GET | `/predictions/history` | Get prediction history (paginated) | ✅ |
| GET | `/predictions/prediction/:id` | Get single prediction detail | ✅ |
| GET | `/predictions/stats` | Get user statistics | ✅ |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| GET | `/admin/dashboard` | Full analytics dashboard | ✅ Admin |
| GET | `/admin/users` | List all users (searchable) | ✅ Admin |
| GET | `/admin/predictions` | All prediction logs | ✅ Admin |
| DELETE | `/admin/users/:id` | Delete a user + their data | ✅ Admin |

### Flask ML API Endpoints (Internal)

| Method | Endpoint | Port | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | 5000 | Health check |
| POST | `/api/predict` | 5000 | Fingerprint prediction |
| GET | `/api/model-info` | 5000 | Model accuracy & metadata |

### Registration Request Body Example

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Secure@123",
  "dateOfBirth": "2000-05-15",
  "phone": "+919876543210"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (`@$!%*?&`)

---

## 9. Frontend Pages & Features

| Page | Route | Description |
|------|-------|-------------|
| **Login** | `/login` | Email + password login with animated hero |
| **Register** | `/register` | Signup form with DOB picker (18+ validation) |
| **Dashboard** | `/dashboard` | Stats cards, recent predictions, CTA to predict |
| **Predict** | `/predict` | Drag-and-drop fingerprint upload + AI result display |
| **History** | `/history` | Paginated table of all past predictions with expandable details |
| **Profile** | `/profile` | View/edit name, phone, verification status |
| **Admin Dashboard** | `/admin` | Bar chart, pie chart, area chart analytics |
| **Admin Users** | `/admin/users` | Searchable user table with delete capability |
| **Admin Predictions** | `/admin/predictions` | System-wide prediction log monitoring |

### UI Theme Details

| Element | Value |
|---|---|
| Background | `#06060b` (near-black) |
| Card background | `rgba(15, 15, 30, 0.7)` with `blur(20px)` |
| Primary purple | `#7c3aed` |
| Neon purple | `#a855f7` |
| Border glow | `rgba(124, 58, 237, 0.4)` |
| Heading font | `Outfit` (Google Fonts) |
| Body font | `Inter` (Google Fonts) |
| Animations | Framer Motion (page transitions, stagger, spring) |
| Charts | Recharts (BarChart, PieChart, AreaChart) |

---

## 10. Security Features Explained

### 🔐 Authentication & Authorization

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt with 12 salt rounds |
| JWT tokens | 7-day expiry, signed with secret key |
| Role-based access | `user` and `admin` roles checked via middleware |
| OTP verification | 6-digit code sent to email, expires in 10 minutes |
| Device tracking | User agent + IP logged on each login |

### 🛡️ Biometric Data Protection

| Feature | Implementation |
|---|---|
| Image encryption | AES-256-CBC encryption before disk storage |
| Image hashing | SHA-256 hash of fingerprint for duplicate detection |
| Feature embedding | Non-reversible hash of CNN Dense(256) layer output |
| No raw storage | Original fingerprint images are never stored unencrypted |

### 🚦 API Security

| Feature | Implementation |
|---|---|
| Rate limiting | 100 requests per 15 min (general), 20 per 15 min (auth) |
| Input validation | express-validator on all inputs |
| Security headers | Helmet.js for XSS, HSTS, etc. |
| CORS | Restricted to frontend origins only |
| File validation | Multer: 5MB max, only JPEG/PNG/BMP/TIFF |

### 🎂 Age Restriction (18+)

**Why restrict users under 18?**
1. **Ethical concerns** — Minors cannot consent to biometric data collection
2. **Legal compliance** — GDPR, COPPA and data protection laws
3. **Biological variability** — Fingerprint patterns change during growth
4. **Security risks** — Storing minors' biometric data is high-risk

**How it's enforced:**
- DOB field is required at registration
- Date picker has max date set to 18 years ago
- Server-side middleware calculates age and blocks if < 18
- Age is stored in the database for audit

---

## 11. User Roles & Workflows

### 👤 Regular User Workflow

```
Register (18+ verified) → Login → Dashboard → Upload Fingerprint
    → View Prediction (blood group + confidence) → Check History
    → Update Profile
```

### 🛡️ Admin Workflow

```
Login (admin@bloodgroup.com) → Admin Dashboard (analytics)
    → View charts (blood group distribution, daily predictions)
    → Manage Users (search, view, delete)
    → Monitor Prediction Logs (all users)
```

---

## 12. Configuration & Environment Variables

### Server Configuration (`server/.env`)

```env
# Server
PORT=5001                    # Express server port
NODE_ENV=development         # Environment mode

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/bloodgroup_prediction

# JWT Authentication
JWT_SECRET=bg_pred_jwt_secret_key_2026_secure_random    # Change in production!
JWT_EXPIRE=7d                # Token expiry duration

# Flask ML API
ML_API_URL=http://localhost:5000    # URL where Flask runs

# AES Encryption
AES_SECRET_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6    # 32-char hex key

# Email Notifications (optional — configure with your Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com     # Replace with your email
EMAIL_PASS=your-app-password        # Google App Password (not regular password)

# Default Admin Account
ADMIN_EMAIL=admin@bloodgroup.com
ADMIN_PASSWORD=Admin@123456
```

### To enable Email Notifications:

1. Go to https://myaccount.google.com/apppasswords
2. Generate an "App Password" for "Mail"
3. Replace `EMAIL_USER` with your Gmail address
4. Replace `EMAIL_PASS` with the generated app password

---

## 13. Troubleshooting

### ❌ "TensorFlow not found" or pip install fails

**Problem:** Python 3.14 doesn't support TensorFlow.  
**Solution:** Use Python 3.10 specifically:
```powershell
py -3.10 -m pip install tensorflow
py -3.10 train_model.py
py -3.10 app.py
```

### ❌ "MongoDB connection error"

**Problem:** MongoDB is not running.  
**Solution:**
```powershell
# Check if MongoDB service is running
Get-Service MongoDB

# Start it if stopped
net start MongoDB

# Or start manually
mongod --dbpath "C:\data\db"
```

### ❌ "ML service unavailable" when predicting

**Problem:** Flask API (port 5000) is not running.  
**Solution:** Make sure Terminal 1 is running `py -3.10 app.py` and shows "Model loaded successfully".

### ❌ "Model not found" when starting Flask

**Problem:** You haven't trained the model yet.  
**Solution:** Run training first:
```powershell
cd "e:\final year\ml-model"
py -3.10 train_model.py
```
Wait for it to finish, then start Flask again.

### ❌ Frontend shows blank page

**Problem:** Default Vite files might conflict.  
**Solution:** Delete `src/App.css` default content (it should only have a comment now) and restart:
```powershell
cd "e:\final year\client-app"
npm run dev
```

### ❌ "CORS error" in browser console

**Problem:** Backend isn't allowing the frontend origin.  
**Solution:** Both `server.js` and Flask `app.py` already allow `localhost:5173`. Make sure you're accessing the frontend at exactly `http://localhost:5173`.

### ❌ Registration says "You must be 18 or older"

**This is expected behavior.** The system requires users to be 18+ years old. Use a date of birth that makes you 18 or older.

---

## 14. Screenshots & UI Theme

### Color Palette

```
Primary Background:    #06060b  ██████  (Near Black)
Secondary Background:  #0d0d18  ██████  (Dark Navy)
Purple 600:            #7c3aed  ██████  (Primary Purple)
Purple 400:            #a78bfa  ██████  (Light Purple)
Neon Purple:           #a855f7  ██████  (Neon Accent)
Neon Green:            #22c55e  ██████  (Success)
Neon Red:              #ef4444  ██████  (Error)
Neon Amber:            #f59e0b  ██████  (Warning)
Text Primary:          #f1f0f5  ██████  (White-ish)
Text Muted:            #6b6b80  ██████  (Gray)
```

### UI Features

- **Glassmorphism Cards** — Semi-transparent cards with backdrop blur
- **Neon Glow Effects** — Purple box-shadows on hover
- **Animated Background Orbs** — Floating gradient circles on auth pages
- **Confidence Bars** — Animated progress bars for prediction results
- **Scan Animation** — Pulsing ring effect while AI processes fingerprint
- **Staggered Animations** — Cards and list items animate in sequence
- **Dark Scrollbar** — Custom styled to match the theme

---

## Quick Reference — All Commands

```powershell
# ────────────────────────────────────────
# ONE-TIME SETUP (run these only once)
# ────────────────────────────────────────

# 1. Install Python packages
cd "e:\final year\ml-model"
py -3.10 -m pip install tensorflow flask flask-cors Pillow numpy scikit-learn matplotlib seaborn

# 2. Train the CNN model (~15-30 min)
cd "e:\final year\ml-model"
py -3.10 train_model.py

# 3. Install backend Node packages
cd "e:\final year\server"
npm install

# 4. Install frontend Node packages
cd "e:\final year\client-app"
npm install

# ────────────────────────────────────────
# EVERY TIME YOU WANT TO RUN THE PROJECT
# (Open 3 separate PowerShell terminals)
# ────────────────────────────────────────

# Terminal 1 — Flask ML API
cd "e:\final year\ml-model"
py -3.10 app.py

# Terminal 2 — Express.js Backend
cd "e:\final year\server"
npm run dev

# Terminal 3 — React Frontend
cd "e:\final year\client-app"
npm run dev

# Then open: http://localhost:5173
```

---

## Ports Summary

| Service | Port | URL |
|---------|:----:|-----|
| React Frontend | 5173 | http://localhost:5173 |
| Express.js Backend | 5001 | http://localhost:5001 |
| Flask ML API | 5000 | http://localhost:5000 |
| MongoDB | 27017 | mongodb://127.0.0.1:27017 |

---

> **Built with ❤️ using MERN Stack + TensorFlow/Keras + Flask**
