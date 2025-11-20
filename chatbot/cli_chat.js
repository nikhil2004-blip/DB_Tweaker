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
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Try different models until one works
const modelNames = [
    'gemini-2.0-flash-exp',
    'gemini-exp-1206',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro'
];

let workingModel = null;

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

function getFilterPrompt(userInput) {
    return `Analyze this user query and extract any filter criteria for searching a database.
User query: "${userInput}"

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
}

// Extract operation type using Gemini
async function extractOperation(userInput) {
    try {
        // Initialize working model if not done yet
        if (!workingModel) {
            for (const modelName of modelNames) {
                try {
                    const testModel = genAI.getGenerativeModel({ model: modelName });
                    await testModel.generateContent('test');
                    workingModel = testModel;
                    console.log(`✅ Using model: ${modelName}`);
                    break;
                } catch (err) {
                    continue;
                }
            }
            if (!workingModel) {
                throw new Error('No working Gemini model found');
            }
        }

        const prompt = getOperationPrompt(userInput);
        const result = await workingModel.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found in Gemini response');
        const json = JSON.parse(match[0]);
        return json.operation;
    } catch (err) {
        console.error('❌ Operation extraction error:', err.message);
        return null;
    }
}

// Extract fields for CREATE operation
async function extractCreateFields(userInput) {
    try {
        const prompt = getCreatePrompt(userInput);
        const result = await workingModel.generateContent(prompt);
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
        const prompt = getUpdatePrompt(userInput);
        const result = await workingModel.generateContent(prompt);
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
        const prompt = getDeletePrompt(userInput);
        const result = await workingModel.generateContent(prompt);
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

// Extract filter criteria for READ operation
async function extractFilters(userInput) {
    try {
        const prompt = getFilterPrompt(userInput);
        const result = await workingModel.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return { hasFilters: false, filters: [] };
        const json = JSON.parse(match[0]);
        return json;
    } catch (err) {
        console.error('Filter extraction error:', err.message);
        return { hasFilters: false, filters: [] };
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

// READ operation with intelligent filtering
async function readData(userInput) {
    try {
        // Extract filter criteria
        const filterData = await extractFilters(userInput);

        // Fetch all data from API
        const res = await fetch(`${API_URL}/userinfo`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (!res.ok) {
            console.log('❌ Read failed:', data.error);
            return;
        }

        let results = data.data;

        // Apply filters locally if needed
        if (filterData.hasFilters && filterData.filters.length > 0) {
            results = results.filter(item => {
                return filterData.filters.every(filter => {
                    const fieldValue = item[filter.field];
                    if (!fieldValue) return false;

                    if (filter.matchType === 'partial') {
                        return fieldValue.toLowerCase().includes(filter.value.toLowerCase());
                    } else {
                        return fieldValue.toLowerCase() === filter.value.toLowerCase();
                    }
                });
            });
        }

        // Display results
        if (results.length === 0) {
            if (filterData.hasFilters) {
                console.log('🔍 No results found matching your search criteria');
            } else {
                console.log('📭 No data found');
            }
        } else {
            if (filterData.hasFilters) {
                console.log(`\n🔍 Found ${results.length} result(s) matching your search:`);
            } else {
                console.log('\n📋 All User Data:');
            }
            console.log('==================');
            results.forEach(item => {
                console.log(`ID: ${item.Id}`);
                console.log(`Name: ${item.Name}`);
                console.log(`Phone: ${item.Phone}`);
                console.log(`Address: ${item.Address}`);
                console.log('------------------');
            });
        }
    } catch (err) {
        console.error('❌ Read error:', err.message);
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

    console.log('🤖 AI-Powered Intelligent Chatbot');
    console.log('============================');
    console.log('Ask me anything using natural language!');
    console.log('Examples:');
    console.log('• "show people in Delhi" - Filter by location');
    console.log('• "find John" - Search by name');
    console.log('• "users with phone 98" - Filter by phone');
    console.log('• "Add new user: John Doe, phone 123456789, address New York"');
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
                console.log('📖 Reading data...');
                await readData(input);
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
