const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa', // Use environment variables in production
  password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'TallyDB',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true, // For Azure
    trustServerCertificate: true // For local dev
  }
};

async function runMigrations() {
  try {
    console.log('🔍 Connecting to database...');
    await sql.connect(config);
    
    console.log('✅ Connected to database');
    
    // Create Users table if not exists
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
      BEGIN
        CREATE TABLE Users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          username NVARCHAR(50) NOT NULL UNIQUE,
          password NVARCHAR(255) NOT NULL,
          email NVARCHAR(100),
          created_at DATETIME DEFAULT GETDATE()
        );
        PRINT '✅ Created Users table';
      END
    `);

    // Create UserInfo table if not exists
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserInfo')
      BEGIN
        CREATE TABLE UserInfo (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT FOREIGN KEY REFERENCES Users(id),
          name NVARCHAR(100),
          phone NVARCHAR(20),
          address NVARCHAR(255),
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
        );
        PRINT '✅ Created UserInfo table';
      END
    `);

    console.log('✅ Database migrations completed successfully');
    
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    sql.close();
  }
}

runMigrations();
