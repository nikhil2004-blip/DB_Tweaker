// Production server entry point
require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Import database configuration and models
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    server: process.env.DB_SERVER || 'db',
    database: process.env.DB_NAME || 'TallyDB',
    options: {
        encrypt: true, // For Azure
        trustServerCertificate: true // For local dev
    }
};

// Initialize database connection pool
const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

// Middleware to attach database connection to request
app.use(async (req, res, next) => {
    try {
        await poolConnect;
        req.db = pool;
        next();
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({ error: 'Database connection error' });
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Define routes directly in this file
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query('INSERT INTO Users (username, password) VALUES (@username, @password)');
            
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM Users WHERE username = @username');
            
        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.recordset[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '1h' }
        );
        
        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Protected routes
app.get('/api/userinfo', authenticateToken, async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT * FROM UserInfo');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

// Add other CRUD endpoints here...

// Basic route to verify server is running
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Only start the server if this file is run directly (not when required as a module)
if (require.main === module) {
    const server = app.listen(port, () => {
        console.log(`Server running in production mode on port ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
        console.error('Unhandled Rejection:', err);
        server.close(() => process.exit(1));
    });
}
