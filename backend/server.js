// server.js - Express backend for data entry and authentication
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Load environment variables from the same directory as this script
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve frontend files

// Root route - redirect to login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Initialize SQLite Database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Could not connect to SQLite database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
        initializeDatabase();
    }
});

// Auto-create tables on startup
function initializeDatabase() {
    db.serialize(() => {
        // Create Users table
        db.run(`CREATE TABLE IF NOT EXISTS Users (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Username TEXT UNIQUE NOT NULL,
            Password TEXT NOT NULL
        )`, (err) => {
            if (err) console.error('Error creating Users table:', err);
            else console.log('✅ Users table ready');
        });

        // Create UserInfo table
        db.run(`CREATE TABLE IF NOT EXISTS UserInfo (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL,
            Phone TEXT NOT NULL,
            Address TEXT NOT NULL
        )`, (err) => {
            if (err) console.error('Error creating UserInfo table:', err);
            else console.log('✅ UserInfo table ready');
        });
    });
}

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
        const hash = await bcrypt.hash(password, 10);
        db.run('INSERT INTO Users (Username, Password) VALUES (?, ?)', [username, hash], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'User already exists' });
                }
                return res.status(500).json({ error: 'Registration failed' });
            }
            res.json({ message: 'User registered successfully' });
        });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    db.get('SELECT * FROM Users WHERE Username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.Password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ username: user.Username, id: user.Id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    });
});

// CREATE - POST /api/submit
app.post('/api/submit', authenticateToken, (req, res) => {
    const { name, phone, address } = req.body;
    if (!name || !phone || !address) return res.status(400).json({ error: 'Missing fields' });

    db.run('INSERT INTO UserInfo (Name, Phone, Address) VALUES (?, ?, ?)', [name, phone, address], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Data submitted successfully', id: this.lastID });
    });
});

// READ - GET /api/userinfo
app.get('/api/userinfo', authenticateToken, (req, res) => {
    db.all('SELECT * FROM UserInfo ORDER BY Id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ data: rows });
    });
});

// READ - GET /api/userinfo/:id
app.get('/api/userinfo/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM UserInfo WHERE Id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User info not found' });
        res.json({ data: row });
    });
});

// UPDATE - PUT /api/userinfo/:id
app.put('/api/userinfo/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, phone, address } = req.body;
    if (!name || !phone || !address) return res.status(400).json({ error: 'Missing fields' });

    db.run('UPDATE UserInfo SET Name = ?, Phone = ?, Address = ? WHERE Id = ?', [name, phone, address, id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'User info not found' });
        res.json({ message: 'Data updated successfully' });
    });
});

// DELETE - DELETE /api/userinfo/:id
app.delete('/api/userinfo/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM UserInfo WHERE Id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'User info not found' });
        res.json({ message: 'Data deleted successfully' });
    });
});

// Web Chatbot endpoint
app.post('/api/chatbot', authenticateToken, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY is missing in .env file');
        return res.status(500).json({ error: 'Server configuration error: API Key missing' });
    }

    try {
        // Import Gemini AI
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Try different model names - API availability varies
        const modelNames = [
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
            'gemini-2.0-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro-latest',
            process.env.GEMINI_MODEL,
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro'
        ].filter(Boolean);

        let model = null;
        let lastError = null;

        // Try each model until one works
        for (const modelName of modelNames) {
            try {
                console.log(`🔍 Trying model: ${modelName}`);
                model = genAI.getGenerativeModel({ model: modelName });
                // Test the model with a simple prompt
                await model.generateContent('test');
                console.log(`✅ Successfully connected to model: ${modelName}`);
                break;
            } catch (err) {
                console.log(`❌ Model ${modelName} failed`);
                lastError = err;
                continue;
            }
        }

        if (!model) {
            throw new Error(`No available Gemini models found. Last error: ${lastError?.message || 'Unknown'}. Please check your API key at https://aistudio.google.com/app/apikey`);
        }

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
            // Extract filter criteria from the query
            const filterPrompt = `
Analyze this user query and extract any filter criteria for searching a database.
User query: "${message}"

The database has these fields: Id, Name, Phone, Address

Respond with ONLY a JSON object in this format:
{
  "hasFilters": true/false,
  "filters": [
    {"field": "Name|Phone|Address", "value": "search term", "matchType": "exact|partial"}
  ]
}

Examples:
- "show people in Delhi" → {"hasFilters": true, "filters": [{"field": "Address", "value": "Delhi", "matchType": "partial"}]}
- "find John" → {"hasFilters": true, "filters": [{"field": "Name", "value": "John", "matchType": "partial"}]}
- "show all data" → {"hasFilters": false, "filters": []}
- "people in Mumbai with phone 99" → {"hasFilters": true, "filters": [{"field": "Address", "value": "Mumbai", "matchType": "partial"}, {"field": "Phone", "value": "99", "matchType": "partial"}]}

If the query doesn't specify any filters, set hasFilters to false.`;

            try {
                const filterResult = await model.generateContent(filterPrompt);
                const filterText = filterResult.response.text();

                const filterMatch = filterText.match(/\{[\s\S]*\}/);
                let filterData = { hasFilters: false, filters: [] };

                if (filterMatch) {
                    try {
                        filterData = JSON.parse(filterMatch[0]);
                    } catch (e) {
                        console.log('⚠️ Failed to parse filter JSON, showing all data');
                    }
                }

                // Build SQL query with WHERE clause
                let query = 'SELECT * FROM UserInfo';
                let params = [];

                if (filterData.hasFilters && filterData.filters.length > 0) {
                    const whereClauses = [];
                    filterData.filters.forEach(filter => {
                        if (filter.matchType === 'partial') {
                            whereClauses.push(`${filter.field} LIKE ?`);
                            params.push(`%${filter.value}%`);
                        } else {
                            whereClauses.push(`${filter.field} = ?`);
                            params.push(filter.value);
                        }
                    });
                    query += ' WHERE ' + whereClauses.join(' AND ');
                }

                query += ' ORDER BY Id DESC';

                // Execute the query
                db.all(query, params, (err, rows) => {
                    if (err) {
                        console.error('Database error:', err);
                        res.json({ response: "❌ Database error occurred." });
                    } else if (rows.length === 0) {
                        if (filterData.hasFilters) {
                            res.json({ response: "🔍 No results found matching your search criteria. Try a different search term." });
                        } else {
                            res.json({ response: "📭 No data found in the database." });
                        }
                    } else {
                        let response = '';
                        if (filterData.hasFilters) {
                            response = `🔍 Found ${rows.length} result(s) matching your search:\n\n`;
                        } else {
                            response = "📋 Here's all the data in your database:\n\n";
                        }
                        rows.forEach(item => {
                            response += `🆔 ID: ${item.Id}\n👤 Name: ${item.Name}\n📞 Phone: ${item.Phone}\n📍 Address: ${item.Address}\n\n`;
                        });
                        res.json({ response });
                    }
                });
            } catch (err) {
                console.error('Filter extraction error:', err);
                // Fallback to showing all data
                db.all('SELECT * FROM UserInfo ORDER BY Id DESC', [], (err, rows) => {
                    if (err) {
                        res.json({ response: "❌ Database error occurred." });
                    } else if (rows.length === 0) {
                        res.json({ response: "📭 No data found in the database." });
                    } else {
                        response = "📋 Here's all the data in your database:\n\n";
                        rows.forEach(item => {
                            response += `🆔 ID: ${item.Id}\n👤 Name: ${item.Name}\n📞 Phone: ${item.Phone}\n📍 Address: ${item.Address}\n\n`;
                        });
                        res.json({ response });
                    }
                });
            }
            return; // Return early as we're inside a callback
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
                response = "❌ I need all three fields to create an entry. Please provide: name, phone, and address.";
            } else {
                const extractData = JSON.parse(extractMatch[0]);
                const { name, phone, address } = extractData;

                if (!name || !phone || !address) {
                    response = "❌ I need all three fields to create an entry. Please provide: name, phone, and address.";
                } else {
                    await new Promise((resolve, reject) => {
                        db.run('INSERT INTO UserInfo (Name, Phone, Address) VALUES (?, ?, ?)', [name, phone, address], function (err) {
                            if (err) {
                                response = "❌ Database error occurred.";
                                resolve();
                            } else {
                                response = `✅ Successfully created new entry!\n👤 Name: ${name}\n📞 Phone: ${phone}\n📍 Address: ${address}`;
                                resolve();
                            }
                        });
                    });
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
                response = "❌ I need the entry ID and all fields to update.";
            } else {
                const updateData = JSON.parse(updateMatch[0]);
                const { id, name, phone, address } = updateData;

                if (!id || !name || !phone || !address) {
                    response = "❌ I need the entry ID and all fields to update.";
                } else {
                    await new Promise((resolve, reject) => {
                        db.run('UPDATE UserInfo SET Name = ?, Phone = ?, Address = ? WHERE Id = ?', [name, phone, address, id], function (err) {
                            if (err) {
                                response = "❌ Database error occurred.";
                                resolve();
                            } else if (this.changes === 0) {
                                response = `❌ Entry ${id} not found.`;
                                resolve();
                            } else {
                                response = `✅ Successfully updated entry ${id}!\n👤 Name: ${name}\n📞 Phone: ${phone}\n📍 Address: ${address}`;
                                resolve();
                            }
                        });
                    });
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
                response = "❌ I need the entry ID to delete.";
            } else {
                const deleteData = JSON.parse(deleteMatch[0]);
                const { id } = deleteData;

                if (!id) {
                    response = "❌ I need the entry ID to delete.";
                } else {
                    await new Promise((resolve, reject) => {
                        db.run('DELETE FROM UserInfo WHERE Id = ?', [id], function (err) {
                            if (err) {
                                response = "❌ Database error occurred.";
                                resolve();
                            } else if (this.changes === 0) {
                                response = `❌ Entry ${id} not found.`;
                                resolve();
                            } else {
                                response = `✅ Successfully deleted entry ${id}!`;
                                resolve();
                            }
                        });
                    });
                }
            }
        } else {
            response = "I understand you want to perform a database operation, but I couldn't determine the specific action.";
        }

        res.json({ response });

    } catch (err) {
        console.error('❌ Chatbot Error:', err);
        res.status(500).json({ error: `Chatbot error: ${err.message}` });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});