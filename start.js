#!/usr/bin/env node
/**
 * DBTweaker Startup Script
 * ========================
 * 
 * Starts the Node.js web server with SQLite database.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SERVER_SCRIPT_PATH = path.join(__dirname, 'backend', 'server.js');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function main() {
    console.log('\n' + '='.repeat(60));
    log('🚀 DBTweaker Startup', 'cyan');
    console.log('='.repeat(60));

    if (!fs.existsSync(SERVER_SCRIPT_PATH)) {
        log('❌ Server script not found at: ' + SERVER_SCRIPT_PATH, 'red');
        process.exit(1);
    }

    log('\n🌐 Starting Web Server...', 'cyan');

    const serverProcess = spawn('node', [SERVER_SCRIPT_PATH], {
        stdio: 'inherit',
        cwd: __dirname
    });

    serverProcess.on('error', (error) => {
        log(`❌ Failed to start web server: ${error.message}`, 'red');
        process.exit(1);
    });

    // Give the server a moment to start
    setTimeout(() => {
        console.log('\n' + '='.repeat(60));
        log('🎉 Application Ready!', 'green');
        log('✅ Web Interface: http://localhost:3001', 'green');
        log('✅ AI Chatbot: http://localhost:3001/chatbot.html', 'green');
        console.log('='.repeat(60));

        log('\n📱 Open http://localhost:3001 in your browser', 'cyan');
        log('🔑 Login with any username/password (auto-registers)', 'cyan');
        log('\n🛑 Press Ctrl+C to stop', 'yellow');
    }, 1000);
}

if (require.main === module) {
    main();
}

module.exports = { main };
