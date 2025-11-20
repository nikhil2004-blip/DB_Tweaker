# ⚡ DBTweaker

**DBTweaker** is a modern, AI-powered database management system with a sleek "Matrix/Terminal" aesthetic. It allows users to manage data through both a visual dashboard and an intelligent AI chatbot that understands natural language queries.

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** SQLite (Zero-config, file-based)
- **AI Engine:** Google Gemini Pro (via `@google/generative-ai`)
- **Frontend:** Vanilla HTML/CSS/JS (No framework bloat)
- **Authentication:** JWT (JSON Web Tokens) + bcrypt
- **Styling:** Custom CSS with Matrix-style particle animations & Glassmorphism

## ✨ Key Features

### 1. 🤖 Intelligent AI Chatbot
- **Natural Language SQL:** Ask "Show me everyone from Delhi" and the AI converts it to a database query.
- **Smart Filtering:** Automatically detects names, cities, and phone numbers in your messages.
- **Dual Interface:** Available via Web Interface and Command Line (CLI).

### 2. 📊 Real-Time Dashboard
- **Full CRUD:** Create, Read, Update, and Delete records instantly.
- **Live Search:** Filter data dynamically.
- **System Stats:** View database health and record counts.

### 3. 🎨 "Hacker" Aesthetic
- **Dark Mode:** Deep blue/black terminal theme.
- **Matrix Rain:** Continuous, randomized code rain animation.
- **Interactive Elements:** Glowing borders, pulsing logos, and smooth transitions.

### 4. 🔐 Security
- **Secure Auth:** Hashed passwords and token-based session management.
- **Protection:** SQL injection prevention via parameterized queries.

## 🚀 Quick Start

### Local Setup
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Start Server:**
   ```bash
   npm start
   ```
3. **Open App:**
   - Web: `http://localhost:3001`
   - CLI Chat: `npm run chatbot`

### Deployment
- Ready for **Render** or **Railway**.
- Uses SQLite (persistent disk recommended).

---
*Built for the "Database Tweaking" experience.*
