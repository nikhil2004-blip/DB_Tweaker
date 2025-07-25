#!/usr/bin/env node
/**
 * Automated Startup Script for DBTweaker
 * =====================================
 * 
 * This script automatically:
 * 1. Runs the Python database setup (Docker + SQL Server + TallyDB)
 * 2. Waits for database to be ready
 * 3. Starts the Node.js web server
 * 
 * Usage: node start.js
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const PYTHON_SCRIPT_PATH = path.join(__dirname, 'python_docs', 'script.py');
const SERVER_SCRIPT_PATH = path.join(__dirname, 'backend', 'server.js');
const DB_CHECK_TIMEOUT = 60000; // 60 seconds
const DB_CHECK_INTERVAL = 2000; // 2 seconds

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
    console.log('\n' + '='.repeat(60));
    log(`🚀 ${title}`, 'cyan');
    console.log('='.repeat(60));
}

function logStep(step, description) {
    log(`\n${step}. ${description}`, 'yellow');
    console.log('-'.repeat(40));
}

async function checkPythonAvailable() {
    return new Promise((resolve) => {
        exec('python --version', (error) => {
            if (error) {
                exec('python3 --version', (error) => {
                    resolve(error ? 'python3' : 'python3');
                });
            } else {
                resolve('python');
            }
        });
    });
}

async function checkDockerAvailable() {
    return new Promise((resolve) => {
        exec('docker --version', (error) => {
            resolve(!error);
        });
    });
}

async function checkDatabaseRunning() {
    return new Promise((resolve) => {
        exec('docker ps --filter "name=tallydb-intern-sql" --format "{{.Names}}"', (error, stdout) => {
            resolve(!error && stdout.trim() === 'tallydb-intern-sql');
        });
    });
}

async function runPythonSetup() {
    return new Promise(async (resolve, reject) => {
        logStep('1', 'Running Database Setup (Python Script)');
        
        const pythonCmd = await checkPythonAvailable();
        if (!pythonCmd) {
            log('❌ Python not found. Please install Python 3.6+', 'red');
            reject(new Error('Python not available'));
            return;
        }

        if (!fs.existsSync(PYTHON_SCRIPT_PATH)) {
            log('❌ Python setup script not found at: ' + PYTHON_SCRIPT_PATH, 'red');
            reject(new Error('Python script not found'));
            return;
        }

        log('📦 Starting database setup...', 'blue');
        
        const pythonProcess = spawn(pythonCmd, [PYTHON_SCRIPT_PATH], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(PYTHON_SCRIPT_PATH)
        });

        let output = '';
        let setupComplete = false;

        pythonProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            
            // Show important messages
            if (text.includes('✅') || text.includes('🎉') || text.includes('Setup Complete')) {
                log(text.trim(), 'green');
            } else if (text.includes('❌') || text.includes('Error')) {
                log(text.trim(), 'red');
            } else if (text.includes('📋 Connection Details')) {
                log(text.trim(), 'cyan');
                setupComplete = true;
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            log(`⚠️  ${data.toString().trim()}`, 'yellow');
        });

        // Auto-respond to interactive prompts
        pythonProcess.stdin.write('n\n'); // Skip interactive query mode

        pythonProcess.on('close', (code) => {
            if (code === 0 || setupComplete) {
                log('✅ Database setup completed successfully!', 'green');
                resolve(true);
            } else {
                log(`❌ Database setup failed with code: ${code}`, 'red');
                reject(new Error(`Python setup failed with code: ${code}`));
            }
        });

        pythonProcess.on('error', (error) => {
            log(`❌ Failed to start Python setup: ${error.message}`, 'red');
            reject(error);
        });

        // Timeout after 5 minutes
        setTimeout(() => {
            if (!setupComplete) {
                pythonProcess.kill();
                reject(new Error('Database setup timeout'));
            }
        }, 300000);
    });
}

async function waitForDatabase() {
    logStep('2', 'Waiting for Database to be Ready');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < DB_CHECK_TIMEOUT) {
        const isRunning = await checkDatabaseRunning();
        
        if (isRunning) {
            log('✅ Database container is running!', 'green');
            
            // Additional wait for database to be fully ready
            log('⏳ Waiting for database to be fully ready...', 'blue');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            return true;
        }
        
        log('⏳ Waiting for database container...', 'blue');
        await new Promise(resolve => setTimeout(resolve, DB_CHECK_INTERVAL));
    }
    
    throw new Error('Database failed to start within timeout period');
}

async function startWebServer() {
    return new Promise((resolve, reject) => {
        logStep('3', 'Starting Web Server');
        
        if (!fs.existsSync(SERVER_SCRIPT_PATH)) {
            log('❌ Server script not found at: ' + SERVER_SCRIPT_PATH, 'red');
            reject(new Error('Server script not found'));
            return;
        }

        log('🌐 Starting Node.js web server...', 'blue');
        
        const serverProcess = spawn('node', [SERVER_SCRIPT_PATH], {
            stdio: 'inherit',
            cwd: __dirname
        });

        serverProcess.on('error', (error) => {
            log(`❌ Failed to start web server: ${error.message}`, 'red');
            reject(error);
        });

        // Give the server a moment to start
        setTimeout(() => {
            log('✅ Web server started successfully!', 'green');
            resolve(serverProcess);
        }, 2000);
    });
}

async function main() {
    try {
        logHeader('DBTweaker Automated Startup');
        log('This will automatically set up the database and start the web server', 'cyan');
        
        // Check prerequisites
        log('\n🔍 Checking prerequisites...', 'blue');
        
        const dockerAvailable = await checkDockerAvailable();
        if (!dockerAvailable) {
            log('❌ Docker not found. Please install Docker first.', 'red');
            process.exit(1);
        }
        log('✅ Docker is available', 'green');

        // Check if database is already running
        const dbAlreadyRunning = await checkDatabaseRunning();
        if (dbAlreadyRunning) {
            log('✅ Database container already running, skipping setup', 'green');
        } else {
            // Run Python database setup
            await runPythonSetup();
            
            // Wait for database to be ready
            await waitForDatabase();
        }
        
        // Start web server
        const serverProcess = await startWebServer();
        
        // Success message
        logHeader('🎉 Startup Complete!');
        log('✅ Database: SQL Server running in Docker', 'green');
        log('✅ Database: TallyDB data available', 'green');
        log('✅ Web Server: Running on http://localhost:3001', 'green');
        log('✅ Web Interface: http://localhost:3001/login.html', 'green');
        log('✅ AI Chatbot: http://localhost:3001/chatbot.html', 'green');
        
        log('\n🎯 Your application is ready!', 'cyan');
        log('📱 Open http://localhost:3001 in your browser', 'cyan');
        log('🔑 Login with: nikh / nikh', 'cyan');
        
        log('\n🛑 To stop everything:', 'yellow');
        log('   Press Ctrl+C to stop the web server', 'yellow');
        log('   Run: docker stop tallydb-intern-sql', 'yellow');
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            log('\n\n🛑 Shutting down...', 'yellow');
            if (serverProcess) {
                serverProcess.kill();
            }
            log('👋 Goodbye!', 'cyan');
            process.exit(0);
        });
        
    } catch (error) {
        log(`\n❌ Startup failed: ${error.message}`, 'red');
        log('\n🔧 Troubleshooting:', 'yellow');
        log('1. Make sure Docker is running', 'yellow');
        log('2. Make sure Python 3.6+ is installed', 'yellow');
        log('3. Check if port 3001 and 1434 are available', 'yellow');
        log('4. Try running the Python script manually first', 'yellow');
        process.exit(1);
    }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
    log(`❌ Unhandled error: ${error.message}`, 'red');
    process.exit(1);
});

// Run the main function
if (require.main === module) {
    main();
}

module.exports = { main };
