# 🚀 DBTweaker - Deployment Guide

## 🎯 **One-Command Startup**

Your application has **fully automated startup** with SQLite database!

### **Quick Start:**
```bash
npm start
```

**That's it!** This single command will:
1. ✅ **Start web server** automatically
2. ✅ **Initialize SQLite database** (auto-creates on first run)
3. ✅ **Show success message** with URLs

---

## 🔧 **Available Commands**

| Command | Description |
|---------|-------------|
| `npm start` | **Full automated startup** (web server + database) |
| `npm run start-server-only` | Start web server only |
| `npm run chatbot` | Start CLI chatbot interface with intelligent filtering |

---

## 🌐 **Access Your Application**

After running `npm start`, open your browser to:

- **🏠 Main App**: http://localhost:3001
- **🔐 Login Page**: http://localhost:3001/login.html  
- **📊 Dashboard**: http://localhost:3001/dashboard.html
- **🤖 AI Chatbot**: http://localhost:3001/chatbot.html

**Login:**
- Use any username/password (auto-registers new users)

---

## 📋 **Prerequisites**

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **Google Gemini API Key** (for AI chatbot features)

**No Docker or SQL Server required!** The app uses SQLite for simplicity.

---

## ⚙️ **Environment Variables**

Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_secret_key_here
```

**Get your Gemini API Key:**
1. Visit https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy and paste it into your `.env` file

---

## 🚀 **Deployment**

### **Local Development**
```bash
npm install
npm start
```

### **Production**
```bash
npm install --production
npm start
```

The SQLite database file (`database.sqlite`) will be created automatically in the `backend/` directory.

---

## 🤖 **AI Chatbot Features**

The chatbot supports intelligent natural language queries:

### **Web Chatbot** (http://localhost:3001/chatbot.html)
- "show people in Delhi" - Filter by address
- "find John" - Search by name
- "users with phone 98" - Filter by phone number
- "people in Mumbai with phone 99" - Multiple filters

### **CLI Chatbot** (`npm run chatbot`)
Same intelligent filtering as the web version, but in your terminal!

---

## 📁 **Project Structure**

```
dbtweaker/
├── backend/
│   ├── server.js          # Express server with SQLite
│   ├── database.sqlite    # Auto-generated database
│   └── .env              # Configuration (API keys)
├── frontend/
│   ├── index.html        # Landing page
│   ├── login.html        # Authentication
│   ├── dashboard.html    # CRUD interface
│   └── chatbot.html      # AI assistant
├── chatbot/
│   └── cli_chat.js       # CLI chatbot
├── start.js              # Startup script
└── package.json          # Dependencies
```

---

## 🔧 **Troubleshooting**

### **Port 3001 already in use**
```bash
# Find and kill the process
netstat -ano | findstr :3001
taskkill /PID <process_id> /F
```

### **Chatbot not working**
1. Check your `GEMINI_API_KEY` in `backend/.env`
2. Ensure you have internet connection
3. Verify API key is valid at https://aistudio.google.com/app/apikey

### **Database issues**
Simply delete `backend/database.sqlite` and restart - it will recreate automatically!

---

## ✨ **Features**

- ✅ **Fully automated** - One command to start everything
- ✅ **Production ready** - Clean, optimized code
- ✅ **Deployment friendly** - No Docker or complex setup needed
- ✅ **User friendly** - Auto-registration, intuitive UI
- ✅ **AI powered** - Intelligent chatbot with natural language filtering
- ✅ **Portable** - SQLite database, runs anywhere

---

## 📝 **Notes**

- The database is created automatically on first run
- User registration is automatic - just login with any credentials
- All data is stored in `backend/database.sqlite`
- The app runs on port 3001 by default

Enjoy your DBTweaker application! 🎉
