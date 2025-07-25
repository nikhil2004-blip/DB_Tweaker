// cli_chat.js - Enhanced CLI chatbot for full CRUD operations using Gemini API
const path = require('path');
const fs = require('fs');

// Try different .env paths to work from any directory
const envPaths = [
    path.join(__dirname, '../backend/.env'),  // When run from chatbot dir
    path.join(process.cwd(), 'backend/.env'),  // When run from project root
    path.join(__dirname, '../../backend/.env') // Fallback
];

let envPath = null;
for (const testPath of envPaths) {
    if (fs.existsSync(testPath)) {
        envPath = testPath;
        break;
    }
}

if (envPath) {
    require('dotenv').config({ path: envPath });
    console.log('Loaded .env from:', envPath);
} else {
    console.error('Could not find .env file');
    process.exit(1);
}

const readline = require('readline');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Server endpoints
const API_URL = 'http://localhost:3001/api';
const LOGIN_URL = `${API_URL}/login`;

// JWT token storage
let token = '';

// Readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Helper: Prompt for input
function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

// Login function
async function login() {
    console.log('\n--- Login Required ---');
    const username = await ask('Username: ');
    const password = await ask('Password: ');
    try {
        const res = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            console.log('Login successful!\n');
        } else {
            console.log('Login failed:', data.error);
            process.exit(1);
        }
    } catch (err) {
        console.error('Login error:', err.message);
        process.exit(1);
    }
}

// Gemini prompt templates for different operations
function getCreatePrompt(userInput) {
    return `Extract the following fields from this text for creating a new entry: "${userInput}". Return ONLY a JSON object with fields: name, phone, address. If a field is missing, use null.`;
}

function getUpdatePrompt(userInput) {
    return `Extract the following fields from this text for updating an entry: "${userInput}". Return ONLY a JSON object with fields: id, name, phone, address. The id field should be the entry ID to update. If a field is missing, use null.`;
}

function getDeletePrompt(userInput) {
    return `Extract the ID number from this text for deleting an entry: "${userInput}". Return ONLY a JSON object with field: id. Example: {"id": 5}`;
}

function getOperationPrompt(userInput) {
    return `Determine what CRUD operation the user wants to perform from this text: "${userInput}". 
    Return ONLY a JSON object with field: operation. 
    Possible values: "create", "read", "update", "delete".
    Examples:
    - "add new user" -> {"operation": "create"}
    - "show all data" -> {"operation": "read"}
    - "update entry 5" -> {"operation": "update"}
    - "delete record 3" -> {"operation": "delete"}`;
}

// Extract operation type using Gemini
async function extractOperation(userInput) {
    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const prompt = getOperationPrompt(userInput);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found in Gemini response');
        const json = JSON.parse(match[0]);
        return json.operation;
    } catch (err) {
        console.error('Operation extraction error:', err.message);
        return null;
    }
}

// Extract fields for CREATE operation
async function extractCreateFields(userInput) {
    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const prompt = getCreatePrompt(userInput);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found in Gemini response');
        const json = JSON.parse(match[0]);
        return json;
    } catch (err) {
        console.error('Create extraction error:', err.message);
        return null;
    }
}

// Extract fields for UPDATE operation
async function extractUpdateFields(userInput) {
    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const prompt = getUpdatePrompt(userInput);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found in Gemini response');
        const json = JSON.parse(match[0]);
        return json;
    } catch (err) {
        console.error('Update extraction error:', err.message);
        return null;
    }
}

// Extract ID for DELETE operation
async function extractDeleteId(userInput) {
    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const prompt = getDeletePrompt(userInput);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found in Gemini response');
        const json = JSON.parse(match[0]);
        return json.id;
    } catch (err) {
        console.error('Delete extraction error:', err.message);
        return null;
    }
}

// CREATE operation
async function createData(fields) {
    try {
        const res = await fetch(`${API_URL}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(fields)
        });
        const data = await res.json();
        if (res.ok) {
            console.log(' Data created successfully!');
        } else {
            console.log(' Creation failed:', data.error);
        }
    } catch (err) {
        console.error(' Creation error:', err.message);
    }
}

// READ operation
async function readData() {
    try {
        const res = await fetch(`${API_URL}/userinfo`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (res.ok) {
            if (data.data.length === 0) {
                console.log(' No data found');
            } else {
                console.log('\n All User Data:');
                console.log('==================');
                data.data.forEach(item => {
                    console.log(`ID: ${item.Id}`);
                    console.log(`Name: ${item.Name}`);
                    console.log(`Phone: ${item.Phone}`);
                    console.log(`Address: ${item.Address}`);
                    console.log('------------------');
                });
            }
        } else {
            console.log(' Read failed:', data.error);
        }
    } catch (err) {
        console.error(' Read error:', err.message);
    }
}

// UPDATE operation
async function updateData(id, fields) {
    try {
        const res = await fetch(`${API_URL}/userinfo/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(fields)
        });
        const data = await res.json();
        if (res.ok) {
            console.log(' Data updated successfully!');
        } else {
            console.log(' Update failed:', data.error);
        }
    } catch (err) {
        console.error(' Update error:', err.message);
    }
}

// DELETE operation
async function deleteData(id) {
    try {
        const res = await fetch(`${API_URL}/userinfo/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (res.ok) {
            console.log(' Data deleted successfully!');
        } else {
            console.log(' Delete failed:', data.error);
        }
    } catch (err) {
        console.error(' Delete error:', err.message);
    }
}

// Main loop
(async function main() {
    await login();
    
    console.log(' AI-Powered CRUD Chatbot');
    console.log('============================');
    console.log('You can now perform CRUD operations using natural language!');
    console.log('Examples:');
    console.log('• "Add new user: John Doe, phone 123456789, address New York"');
    console.log('• "Show all data" or "list all entries"');
    console.log('• "Update entry 5: name Alice, phone 987654321, address Boston"');
    console.log('• "Delete entry 3" or "remove record 7"');
    console.log('• Type "exit" to quit\n');
    
    while (true) {
        const input = await ask('  Enter your request: ');
        if (input.trim().toLowerCase() === 'exit') break;
        
        // First, determine what operation the user wants
        const operation = await extractOperation(input);
        
        if (!operation) {
            console.log(' Could not understand your request. Please try again.');
            continue;
        }
        
        console.log(` Detected operation: ${operation.toUpperCase()}`);
        
        switch (operation) {
            case 'create':
                const createFields = await extractCreateFields(input);
                if (createFields && createFields.name && createFields.phone && createFields.address) {
                    console.log(` Creating entry: ${createFields.name}, ${createFields.phone}, ${createFields.address}`);
                    await createData(createFields);
                } else {
                    console.log(' Could not extract all required fields (name, phone, address). Please try again.');
                }
                break;
                
            case 'read':
                console.log(' Reading all data...');
                await readData();
                break;
                
            case 'update':
                const updateFields = await extractUpdateFields(input);
                if (updateFields && updateFields.id && updateFields.name && updateFields.phone && updateFields.address) {
                    console.log(`  Updating entry ${updateFields.id}: ${updateFields.name}, ${updateFields.phone}, ${updateFields.address}`);
                    await updateData(updateFields.id, {
                        name: updateFields.name,
                        phone: updateFields.phone,
                        address: updateFields.address
                    });
                } else {
                    console.log(' Could not extract all required fields (id, name, phone, address). Please try again.');
                }
                break;
                
            case 'delete':
                const deleteId = await extractDeleteId(input);
                if (deleteId) {
                    console.log(`  Deleting entry ${deleteId}...`);
                    await deleteData(deleteId);
                } else {
                    console.log(' Could not extract entry ID. Please try again.');
                }
                break;
                
            default:
                console.log(' Unknown operation. Please try again.');
        }
        
        console.log(''); // Add spacing
    }
    
    rl.close();
    console.log(' Goodbye!');
    process.exit(0);
})();
