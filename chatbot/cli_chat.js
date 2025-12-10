// cli_chat.js - Gemini AI Hybrid CLI for database control

const path = require('path');
const fs = require('fs');

// Load .env from backend directory
const envPath = path.join(__dirname, '../backend/.env');
require('dotenv').config({ path: envPath });
console.log("📌 Loaded .env:", envPath);

// Dependencies
const readline = require('readline');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Updated stable model
const MODEL = "models/gemini-flash-latest";

// Server endpoints
const API_URL = 'http://localhost:3001/api';
const LOGIN_URL = `${API_URL}/login`;

// JWT token storage
let token = "";

// CLI interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

// Login handler
async function login() {
    console.log("\n🔑 Login Required:");
    const username = await ask("Username: ");
    const password = await ask("Password: ");

    try {
        const res = await fetch(LOGIN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (!res.ok) {
            console.log("❌ Login failed:", data.error);
            process.exit(1);
        }

        token = data.token;
        console.log("✅ Login successful!\n");

    } catch (err) {
        console.error("Login error:", err.message);
        process.exit(1);
    }
}


// ======================================================================================
// ⚡ LOCAL NLP — No AI call needed for many CRUD operations
// ======================================================================================

function localParse(input) {
    const text = input.toLowerCase().trim();

    if (text === "show" || text === "show all") {
        return { op: "read" };
    }

    const del = text.match(/delete (.+)/);
    if (del) return { op: "delete", name: del[1].trim() };

    const add = text.match(/add (.+) ([0-9]+) (.+)/);
    if (add) {
        return {
            op: "create",
            data: {
                name: add[1].trim(),
                phone: add[2].trim(),
                address: add[3].trim()
            }
        };
    }

    const upd = text.match(/update (.+) phone ([0-9]+)/);
    if (upd) {
        return {
            op: "update",
            searchName: upd[1].trim(),
            updates: { Phone: upd[2].trim() }
        };
    }

    return null; // fallback to AI
}


// ======================================================================================
// 🧠 AI INTENT EXTRACTION — Only if local NLP cannot detect
// ======================================================================================

async function analyzeWithAI(input) {
    try {
        const model = genAI.getGenerativeModel({ model: MODEL });

        const prompt = `
Extract MongoDB CRUD intent from: "${input}"
Return STRICT JSON ONLY like this:
{
 "op":"create|read|update|delete|chat",
 "data":{"name":"","phone":"","address":""},
 "searchName":"",
 "updates":{},
 "filters":{}
}
`;
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return { op: "chat", reply: "I didn't understand sir" };

        return JSON.parse(match[0]);
    }
    catch (err) {
        console.error("❌ AI Error:", err.message);
        return { op: "chat", reply: "AI offline. Try simple commands." };
    }
}


// Database Operations
async function doRead() {
    const res = await fetch(`${API_URL}/userinfo`, {
        headers: { Authorization: "Bearer " + token }
    });
    const data = await res.json();
    const users = data.data;

    if (!users.length) {
        console.log("📭 No records found.");
        return;
    }

    console.log("\n📋 Records:");
    console.log("==================");
    users.forEach(u => {
        console.log(`ID: ${u._id}`);
        console.log(`Name: ${u.Name}`);
        console.log(`Phone: ${u.Phone}`);
        console.log(`Address: ${u.Address}`);
        console.log("------------------");
    });
}

async function doCreate(data) {
    if (!data?.name || !data.phone || !data.address) {
        console.log("❌ Invalid format. Try: add John 9999 Mumbai");
        return;
    }

    const res = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify(data)
    });

    if (res.ok) console.log("🎯 User added!");
    else console.log("❌ Failed to add user");
}

async function doUpdate(aiData) {
    const { searchName, updates } = aiData;
    const res = await fetch(`${API_URL}/userinfo`, {
        headers: { Authorization: "Bearer " + token }
    });
    const json = await res.json();

    const user = json.data.find(u =>
        u.Name.toLowerCase().includes(searchName.toLowerCase())
    );

    if (!user) {
        console.log(`❌ ${searchName} not found`);
        return;
    }

    const res2 = await fetch(`${API_URL}/userinfo/${user._id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify({
            name: user.Name,
            phone: updates.Phone || user.Phone,
            address: updates.Address || user.Address
        })
    });

    if (res2.ok) console.log("✏ Updated!");
    else console.log("❌ Update failed");
}

async function doDelete(aiData) {
    const { name } = aiData;

    const res = await fetch(`${API_URL}/userinfo`, {
        headers: { Authorization: "Bearer " + token }
    });
    const json = await res.json();

    const user = json.data.find(u =>
        u.Name.toLowerCase().includes(name.toLowerCase())
    );

    if (!user) {
        console.log(`❌ ${name} not found`);
        return;
    }

    const res2 = await fetch(`${API_URL}/userinfo/${user._id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token }
    });

    if (res2.ok) console.log("🗑 User deleted!");
    else console.log("❌ Delete failed");
}


// MAIN LOOP
(async function main() {
    await login();

    console.log("🤖 Hybrid CLI Chatbot Ready!");
    console.log("Try:");
    console.log("- add john 9999 delhi");
    console.log("- update john phone 1234");
    console.log("- delete john");
    console.log("- show");
    console.log("Type EXIT to quit.\n");

    while (true) {
        const input = await ask("💬 Command: ");
        if (input.toLowerCase() === "exit") break;

        // First try local NLP — if fails, use AI
        const localResult = localParse(input);
        const aiData = localResult ?? await analyzeWithAI(input);

        const { op } = aiData;
        console.log(`⚙ Operation: ${op.toUpperCase()}`);

        if (op === "read") await doRead();
        else if (op === "create") await doCreate(aiData.data);
        else if (op === "update") await doUpdate(aiData);
        else if (op === "delete") await doDelete(aiData);
        else console.log(aiData.reply || "Hello sir!\n");

        console.log("");
    }

    rl.close();
    console.log("👋 Exiting CLI...");
    process.exit(0);
})();
