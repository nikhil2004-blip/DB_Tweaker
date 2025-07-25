# 🚀 DBTweaker - Automated Deployment Guide

## 🎯 **One-Command Startup**

Your application now has **fully automated startup** - no more manual Python scripts!

### **Quick Start:**
```bash
npm start
```

**That's it!** This single command will:
1. ✅ **Check prerequisites** (Docker, Python)
2. ✅ **Run database setup** (SQL Server + TallyDB)
3. ✅ **Wait for database** to be ready
4. ✅ **Start web server** automatically
5. ✅ **Show success message** with URLs

---

## 🔧 **Available Commands**

| Command | Description |
|---------|-------------|
| `npm start` | **Full automated startup** (database + web server) |
| `npm run start-server-only` | Start web server only (if DB already running) |
| `npm run setup-db` | Run database setup manually |
| `npm run chatbot` | Start CLI chatbot interface |

---

## 🌐 **Access Your Application**

After running `npm start`, open your browser to:

- **🏠 Main App**: http://localhost:3001
- **🔐 Login Page**: http://localhost:3001/login.html  
- **📊 Dashboard**: http://localhost:3001/dashboard.html
- **🤖 AI Chatbot**: http://localhost:3001/chatbot.html

**Login Credentials:**
- Username: `nikh`
- Password: `nikh`

---

## 🐳 **Docker Alternative (For Deployment)**

For production deployment, use Docker Compose:

```bash
# Start database only
docker-compose up -d

# Then start your Node.js app
npm run start-server-only
```

---

## 🌍 **Hosting/Deployment Options**

### **Option 1: Traditional Hosting (VPS/Cloud)**
```bash
# On your server:
git clone your-repo
cd dbtweaker
npm install
npm start  # Fully automated!
```

### **Option 2: Container Deployment**
```dockerfile
# Dockerfile (create this for containerized deployment)
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3001
CMD ["npm", "start"]
```

### **Option 3: Cloud Platforms**

**Heroku:**
- Add `start.js` as your main process
- Use Heroku Postgres add-on instead of local SQL Server
- Update connection strings in `.env`

**Railway/Render:**
- Set build command: `npm install`
- Set start command: `npm start`
- Add environment variables from `.env`

**DigitalOcean App Platform:**
- Use the automated startup script
- Configure database as a managed service

---

## 🔧 **Environment Variables**

Create `.env` file in `backend/` directory:

```env
# Database Configuration
DB_HOST=localhost,1434
DB_USER=sa
DB_PASS=InternPassword123#
DB_NAME=TallyDB

# AI Configuration  
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Authentication
JWT_SECRET=your_jwt_secret_here
```

---

## 🛠 **Prerequisites**

### **Development:**
- ✅ **Node.js 16+**
- ✅ **Docker** (for database)
- ✅ **Python 3.6+** (for database setup)

### **Production:**
- ✅ **Node.js 16+**
- ✅ **SQL Server** (managed or self-hosted)
- ✅ **Environment variables** configured

---

## 🚨 **Troubleshooting**

### **Database Issues:**
```bash
# Check if Docker is running
docker ps

# Restart database container
docker stop tallydb-intern-sql
docker rm tallydb-intern-sql
npm start  # Will recreate everything

# Manual database setup
npm run setup-db
```

### **Port Conflicts:**
```bash
# Check what's using port 3001
netstat -ano | findstr :3001

# Kill process if needed
taskkill /PID <process_id> /F
```

### **Python Issues:**
```bash
# Check Python installation
python --version
# or
python3 --version

# Install required packages manually
pip install pyodbc docker
```

---

## 📊 **Features**

### **Web Interface:**
- 🔐 **Modern login/registration** system
- 📊 **Beautiful dashboard** with CRUD operations
- 📱 **Mobile responsive** design
- 🎨 **Professional UI** with animations

### **AI Chatbot:**
- 🤖 **Web chatbot** interface (browser-based)
- 💻 **CLI chatbot** interface (terminal-based)
- 🧠 **Google Gemini AI** powered
- 💬 **Natural language** CRUD operations

### **Backend:**
- 🔒 **JWT authentication** 
- 🗄️ **SQL Server** database
- 🔄 **Full CRUD API** endpoints
- 🚀 **Auto database** initialization

---

## 🎉 **Success!**

Your DBTweaker application is now:
- ✅ **Fully automated** - single command startup
- ✅ **Production ready** - proper error handling
- ✅ **Deployment friendly** - works on any platform
- ✅ **User friendly** - beautiful modern UI
- ✅ **AI powered** - natural language interface

**No more manual database setup required!** 🎊

---

## 📞 **Support**

If you encounter any issues:
1. Check the troubleshooting section above
2. Ensure all prerequisites are installed
3. Verify environment variables are set correctly
4. Check Docker is running and ports are available

Happy coding! 🚀
