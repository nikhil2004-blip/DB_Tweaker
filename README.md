# DBTweaker

A full-stack CRUD application with AI chatbot integration, built with Node.js, Express, SQL Server, and Google's Gemini AI.

## 🚀 Features

- User authentication (login/register)
- CRUD operations for user information
- AI-powered chatbot interface
- Docker support for easy deployment
- Automated database migrations

## 🛠️ Prerequisites

- Node.js 18+
- Docker & Docker Compose
- SQL Server 2019+ (or use Docker)
- Google Gemini API key

## 🚀 Quick Start (Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/DB_Tweaker.git
   cd DB_Tweaker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser to: http://localhost:3001

## 🐳 Docker Deployment

1. Build and start containers:
   ```bash
   docker-compose up --build -d
   ```

2. Run database migrations:
   ```bash
   docker-compose exec app npm run migrate
   ```

3. Access the application at: http://localhost:3001

## 🌐 Production Deployment

### Railway (Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Fyourusername%2FDB_Tweaker&envs=GEMINI_API_KEY,JWT_SECRET,DB_PASSWORD&optionalEnvs=DB_PASSWORD&DB_PASSWORDDesc=Strong+password+for+SQL+Server&GEMINI_API_KEYDesc=Your+Google+Gemini+API+key&JWT_SECRETDesc=Random+string+for+JWT+token+signing)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Port to run the server on | No (default: 3001) |
| `DB_SERVER` | Database server host | Yes |
| `DB_PORT` | Database port | No (default: 1433) |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database username | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |

## 📝 License

MIT
