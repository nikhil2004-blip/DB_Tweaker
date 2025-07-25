// server.js - Express backend for data entry and authentication
require('dotenv').config({ path: __dirname + '/.env' });
console.log('Loaded DB_HOST:', process.env.DB_HOST);
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// SQL Server config
const [dbServer, dbPort] = process.env.DB_HOST.split(',');
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: dbServer,
    port: dbPort ? parseInt(dbPort, 10) : 1433,
    database: process.env.DB_NAME,
    options: {
        encrypt: false, // set to true if using Azure
        trustServerCertificate: true // for local dev
    }
};

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Auto-create tables on startup
async function initializeDatabase() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected to SQL Server');
        
        // Create Users table if it doesn't exist
        const createUsersTableSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            CREATE TABLE Users (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                Username NVARCHAR(100) UNIQUE NOT NULL,
                Password NVARCHAR(255) NOT NULL
            );
        `;
        
        // Create UserInfo table if it doesn't exist
        const createUserInfoTableSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserInfo' AND xtype='U')
            CREATE TABLE UserInfo (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                Name NVARCHAR(100) NOT NULL,
                Phone NVARCHAR(50) NOT NULL,
                Address NVARCHAR(255) NOT NULL
            );
        `;
        
        await pool.request().query(createUsersTableSQL);
        console.log('✅ Users table ready');
        
        await pool.request().query(createUserInfoTableSQL);
        console.log('✅ UserInfo table ready');
        
        console.log('🚀 Database initialization complete!');
        
    } catch (err) {
        console.error('❌ Database initialization error:', err);
        process.exit(1);
    }
}

// Initialize database on startup
initializeDatabase();

// Helper: Authenticate JWT middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// User registration endpoint
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    try {
        const pool = await sql.connect(dbConfig);
        // Check if user exists
        const result = await pool.request().input('username', sql.NVarChar, username).query('SELECT * FROM Users WHERE Username = @username');
        if (result.recordset.length > 0) return res.status(409).json({ error: 'User already exists' });
        // Hash password
        const hash = await bcrypt.hash(password, 10);
        await pool.request().input('username', sql.NVarChar, username).input('password', sql.NVarChar, hash).query('INSERT INTO Users (Username, Password) VALUES (@username, @password)');
        res.json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('username', sql.NVarChar, username).query('SELECT * FROM Users WHERE Username = @username');
        if (result.recordset.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = result.recordset[0];
        const match = await bcrypt.compare(password, user.Password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });
        // Generate JWT
        const token = jwt.sign({ username: user.Username, id: user.Id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// CREATE - POST /api/submit - Insert user info (protected)
app.post('/api/submit', authenticateToken, async (req, res) => {
    const { name, phone, address } = req.body;
    if (!name || !phone || !address) return res.status(400).json({ error: 'Missing fields' });
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('phone', sql.NVarChar, phone)
            .input('address', sql.NVarChar, address)
            .query('INSERT INTO UserInfo (Name, Phone, Address) VALUES (@name, @phone, @address)');
        res.json({ message: 'Data submitted successfully' });
    } catch (err) {
        console.error('DB Insert Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// READ - GET /api/userinfo - Get all user info (protected)
app.get('/api/userinfo', authenticateToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM UserInfo ORDER BY Id DESC');
        res.json({ data: result.recordset });
    } catch (err) {
        console.error('DB Read Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// READ - GET /api/userinfo/:id - Get specific user info (protected)
app.get('/api/userinfo/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM UserInfo WHERE Id = @id');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User info not found' });
        }
        res.json({ data: result.recordset[0] });
    } catch (err) {
        console.error('DB Read Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// UPDATE - PUT /api/userinfo/:id - Update user info (protected)
app.put('/api/userinfo/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, phone, address } = req.body;
    if (!name || !phone || !address) return res.status(400).json({ error: 'Missing fields' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('phone', sql.NVarChar, phone)
            .input('address', sql.NVarChar, address)
            .query('UPDATE UserInfo SET Name = @name, Phone = @phone, Address = @address WHERE Id = @id');
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User info not found' });
        }
        res.json({ message: 'Data updated successfully' });
    } catch (err) {
        console.error('DB Update Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE - DELETE /api/userinfo/:id - Delete user info (protected)
app.delete('/api/userinfo/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM UserInfo WHERE Id = @id');
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User info not found' });
        }
        res.json({ message: 'Data deleted successfully' });
    } catch (err) {
        console.error('DB Delete Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Web Chatbot endpoint
app.post('/api/chatbot', authenticateToken, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    
    try {
        // Import Gemini AI
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
        
        // Detect operation type
        const operationPrompt = `
Analyze this user message and determine what database operation they want to perform.
User message: "${message}"

Respond with ONLY a JSON object in this format:
{
  "operation": "create|read|update|delete",
  "confidence": 0.0-1.0
}

Operation types:
- create: adding new data ("add", "create", "new", "insert")
- read: viewing/showing data ("show", "list", "view", "get", "display")
- update: modifying existing data ("update", "modify", "change", "edit")
- delete: removing data ("delete", "remove", "drop")`;
        
        const operationResult = await model.generateContent(operationPrompt);
        const operationText = operationResult.response.text();
        const operationMatch = operationText.match(/\{[\s\S]*\}/);
        
        if (!operationMatch) {
            return res.json({ response: "I couldn't understand your request. Please try commands like 'show all data' or 'add new user'." });
        }
        
        const operationData = JSON.parse(operationMatch[0]);
        const operation = operationData.operation;
        
        let response = '';
        
        if (operation === 'read') {
            // Handle read operation
            const pool = await sql.connect(dbConfig);
            const result = await pool.request().query('SELECT * FROM UserInfo');
            
            if (result.recordset.length === 0) {
                response = "📭 No data found in the database.";
            } else {
                response = "📋 Here's all the data in your database:\n\n";
                result.recordset.forEach(item => {
                    response += `🆔 ID: ${item.Id}\n👤 Name: ${item.Name}\n📞 Phone: ${item.Phone}\n📍 Address: ${item.Address}\n\n`;
                });
            }
        } else if (operation === 'create') {
            // Extract fields for create operation
            const extractPrompt = `
Extract the name, phone, and address from this user message.
User message: "${message}"

Respond with ONLY a JSON object in this format:
{
  "name": "extracted name",
  "phone": "extracted phone",
  "address": "extracted address"
}

If any field is missing, set it to null.`;
            
            const extractResult = await model.generateContent(extractPrompt);
            const extractText = extractResult.response.text();
            const extractMatch = extractText.match(/\{[\s\S]*\}/);
            
            if (!extractMatch) {
                response = "❌ I need all three fields to create an entry. Please provide: name, phone, and address.\nExample: 'Add new user: John Doe, phone 123456789, address New York'";
            } else {
                const extractData = JSON.parse(extractMatch[0]);
                const { name, phone, address } = extractData;
                
                if (!name || !phone || !address) {
                    response = "❌ I need all three fields to create an entry. Please provide: name, phone, and address.\nExample: 'Add new user: John Doe, phone 123456789, address New York'";
                } else {
                    const pool = await sql.connect(dbConfig);
                    await pool.request()
                        .input('name', sql.NVarChar, name)
                        .input('phone', sql.NVarChar, phone)
                        .input('address', sql.NVarChar, address)
                        .query('INSERT INTO UserInfo (Name, Phone, Address) VALUES (@name, @phone, @address)');
                    
                    response = `✅ Successfully created new entry!\n👤 Name: ${name}\n📞 Phone: ${phone}\n📍 Address: ${address}`;
                }
            }
        } else if (operation === 'update') {
            // Extract fields for update operation
            const updatePrompt = `
Extract the ID, name, phone, and address from this update message.
User message: "${message}"

Respond with ONLY a JSON object in this format:
{
  "id": "extracted id number",
  "name": "extracted name",
  "phone": "extracted phone",
  "address": "extracted address"
}

If any field is missing, set it to null.`;
            
            const updateResult = await model.generateContent(updatePrompt);
            const updateText = updateResult.response.text();
            const updateMatch = updateText.match(/\{[\s\S]*\}/);
            
            if (!updateMatch) {
                response = "❌ I need the entry ID and all fields to update. Please provide: entry ID, name, phone, and address.\nExample: 'Update entry 1: name Alice, phone 987654321, address Boston'";
            } else {
                const updateData = JSON.parse(updateMatch[0]);
                const { id, name, phone, address } = updateData;
                
                if (!id || !name || !phone || !address) {
                    response = "❌ I need the entry ID and all fields to update. Please provide: entry ID, name, phone, and address.\nExample: 'Update entry 1: name Alice, phone 987654321, address Boston'";
                } else {
                    const pool = await sql.connect(dbConfig);
                    const result = await pool.request()
                        .input('id', sql.Int, id)
                        .input('name', sql.NVarChar, name)
                        .input('phone', sql.NVarChar, phone)
                        .input('address', sql.NVarChar, address)
                        .query('UPDATE UserInfo SET Name = @name, Phone = @phone, Address = @address WHERE Id = @id');
                    
                    if (result.rowsAffected[0] === 0) {
                        response = `❌ Entry ${id} not found.`;
                    } else {
                        response = `✅ Successfully updated entry ${id}!\n👤 Name: ${name}\n📞 Phone: ${phone}\n📍 Address: ${address}`;
                    }
                }
            }
        } else if (operation === 'delete') {
            // Extract ID for delete operation
            const deletePrompt = `
Extract the ID number from this delete message.
User message: "${message}"

Respond with ONLY a JSON object in this format:
{
  "id": "extracted id number"
}

If no ID is found, set it to null.`;
            
            const deleteResult = await model.generateContent(deletePrompt);
            const deleteText = deleteResult.response.text();
            const deleteMatch = deleteText.match(/\{[\s\S]*\}/);
            
            if (!deleteMatch) {
                response = "❌ I need the entry ID to delete. Please specify which entry to delete.\nExample: 'Delete entry 3'";
            } else {
                const deleteData = JSON.parse(deleteMatch[0]);
                const { id } = deleteData;
                
                if (!id) {
                    response = "❌ I need the entry ID to delete. Please specify which entry to delete.\nExample: 'Delete entry 3'";
                } else {
                    const pool = await sql.connect(dbConfig);
                    const result = await pool.request()
                        .input('id', sql.Int, id)
                        .query('DELETE FROM UserInfo WHERE Id = @id');
                    
                    if (result.rowsAffected[0] === 0) {
                        response = `❌ Entry ${id} not found.`;
                    } else {
                        response = `✅ Successfully deleted entry ${id}!`;
                    }
                }
            }
        } else {
            response = "I understand you want to perform a database operation, but I couldn't determine the specific action. Try commands like:\n• 'Show all data'\n• 'Add new user: John, phone 123, address NYC'\n• 'Update entry 1: name Alice'\n• 'Delete entry 3'";
        }
        
        res.json({ response });
        
    } catch (err) {
        console.error('Chatbot Error:', err);
        res.status(500).json({ error: 'Chatbot processing error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});