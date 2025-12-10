// server.js - Express backend with MongoDB + Gemini AI
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Root route
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Secrets
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB Connection
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing in .env');
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('✅ Connected to MongoDB'))
        .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// Schemas
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const userInfoSchema = new mongoose.Schema({
    Name: { type: String, required: true },
    Phone: { type: String, required: true },
    Address: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const UserInfo = mongoose.model('UserInfo', userInfoSchema);

// Auth Middleware
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

// Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username and password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ error: 'User already exists' });
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username and password required' });

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ username: user.username, id: user._id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Create Info
app.post('/api/submit', authenticateToken, async (req, res) => {
    const { name, phone, address } = req.body;
    if (!name || !phone || !address)
        return res.status(400).json({ error: 'Missing fields' });

    try {
        const info = new UserInfo({ Name: name, Phone: phone, Address: address });
        await info.save();
        res.json({ message: 'Data submitted successfully', id: info._id });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Read Info
app.get('/api/userinfo', authenticateToken, async (req, res) => {
    try {
        const data = await UserInfo.find().sort({ createdAt: -1 });
        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Read Single Info
app.get('/api/userinfo/:id', authenticateToken, async (req, res) => {
    try {
        const data = await UserInfo.findById(req.params.id);
        if (!data) return res.status(404).json({ error: 'User info not found' });
        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Update Info
app.put('/api/userinfo/:id', authenticateToken, async (req, res) => {
    const { name, phone, address } = req.body;
    if (!name || !phone || !address)
        return res.status(400).json({ error: 'Missing fields' });

    try {
        const updated = await UserInfo.findByIdAndUpdate(
            req.params.id,
            { Name: name, Phone: phone, Address: address },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'User info not found' });
        res.json({ message: 'Data updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// Delete Info
app.delete('/api/userinfo/:id', authenticateToken, async (req, res) => {
    try {
        const deleted = await UserInfo.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'User info not found' });
        res.json({ message: 'Data deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// 🌟 Gemini Database Assistant Chat API — HYBRID NLP + CRUD
app.post('/api/chatbot', authenticateToken, async (req, res) => {
    const { message } = req.body;
    if (!message)
        return res.status(400).json({ error: 'Message required' });

    const text = message.toLowerCase();

    // ⚡ Local NLP (no AI call needed — saves quota)
    if (text === "show" || text === "show all") {
        const data = await UserInfo.find();
        if (!data.length) return res.json({ response: "📭 No records found." });

        return res.json({
            response: data.map(u =>
                `👤 <strong>${u.Name}</strong><br>📞 ${u.Phone}<br>🏠 ${u.Address}<br>🆔 ${u._id}<br>`
            ).join("<br>")
        });
    }

    const del = text.match(/delete (.+)/);
    if (del) {
        const user = await UserInfo.findOne({ Name: { $regex: del[1], $options: "i" } });
        if (!user) return res.json({ response: `❌ No match for ${del[1]}` });

        await UserInfo.findByIdAndDelete(user._id);
        return res.json({ response: `🗑 Deleted: ${user.Name}` });
    }

    const add = text.match(/add (.+) ([0-9]+) (.+)/);
    if (add) {
        const u = new UserInfo({ Name: add[1], Phone: add[2], Address: add[3] });
        await u.save();
        return res.json({ response: `🆕 Added: ${u.Name}` });
    }

    const upd = text.match(/update (.+) phone ([0-9]+)/);
    if (upd) {
        const user = await UserInfo.findOne({ Name: { $regex: upd[1], $options: "i" } });
        if (!user) return res.json({ response: `❌ ${upd[1]} not found` });

        await UserInfo.findByIdAndUpdate(user._id, { Phone: upd[2] });
        return res.json({ response: `✏ Updated phone for ${user.Name}` });
    }

    // 🧠 AI fallback for complex queries
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "models/gemini-flash-latest" });

    try {
        const prompt = `
Interpret command for "UserInfo" DB.
User message: "${message}"

Output STRICT JSON ONLY:
{
 "op":"chat|read|create|update|delete",
 "data":{"name":"","phone":"","address":""},
 "filters":{},
 "searchName":"",
 "updates":{}
}
`;

        const result = await model.generateContent(prompt);
        const textResult = result.response.text().trim();
        const json = JSON.parse(textResult.match(/\{[\s\S]*\}/)[0]);

        let reply = "⚠️ Couldn't process.";

        if (json.op === "chat") {
            reply = json.reply || "Hello sir!";
        } else if (json.op === "read") {
            const data = await UserInfo.find(json.filters || {});
            reply = data.length ?
                data.map(u => `${u.Name} - ${u.Phone} - ${u.Address}`).join("<br>")
                : "📭 No results.";
        } else if (json.op === "create") {
            const d = json.data;
            const u = new UserInfo({ Name: d.name, Phone: d.phone, Address: d.address });
            await u.save();
            reply = `🆕 Created: ${u.Name}`;
        } else if (json.op === "update") {
            const user = await UserInfo.findOne({ Name: { $regex: json.searchName, $options: "i" } });
            if (!user) reply = `❌ Not found: ${json.searchName}`;
            else {
                await UserInfo.findByIdAndUpdate(user._id, json.updates);
                reply = `✏ Updated: ${user.Name}`;
            }
        } else if (json.op === "delete") {
            const user = await UserInfo.findOne({ Name: { $regex: json.name, $options: "i" } });
            if (!user) reply = `❌ Not found: ${json.name}`;
            else {
                await UserInfo.findByIdAndDelete(user._id);
                reply = `🗑 Deleted: ${json.name}`;
            }
        }

        res.json({ response: reply });

    } catch (err) {
        console.error("AI ERROR:", err);
        res.json({ response: "⚠️ AI is cooling down. Try simple commands like 'show'" });
    }
});

// Start Server (Vercel compatible)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`🔑 API Key loaded: ${process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`);
    });
}

module.exports = app;
