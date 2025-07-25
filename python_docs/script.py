#!/usr/bin/env python3
"""
TallyDB Complete Setup Script
============================

This script does EVERYTHING needed to access the TallyDB data:
1. Checks and installs Python dependencies
2. Starts SQL Server in Docker
3. Attaches the MDF file as a database
4. Demonstrates data access with sample queries
5. Provides interactive query capability

Just run: python complete_setup.py
"""

import subprocess
import sys
import os
import time
import platform
from pathlib import Path

def print_header(title):
    """Print a formatted header"""
    print(f"\n{'='*60}")
    print(f"🎯 {title}")
    print(f"{'='*60}")

def print_step(step, description):
    """Print a formatted step"""
    print(f"\n{step}. {description}")
    print("-" * 40)

def check_command_exists(command):
    """Check if a command exists on the system"""
    try:
        subprocess.run([command, "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def check_and_install_odbc_driver():
    """Check for ODBC driver and provide installation guidance"""
    print_step("1.5", "Checking SQL Server ODBC Driver")
    
    available_drivers = get_available_sql_server_drivers()
    
    if available_drivers:
        print(f"✅ Found SQL Server ODBC drivers: {', '.join(available_drivers)}")
        best_driver = get_best_sql_server_driver()
        print(f"🎯 Will use: {best_driver}")
        return True
    else:
        print("❌ No SQL Server ODBC drivers found!")
        print("\n📋 REQUIRED: Install Microsoft ODBC Driver for SQL Server")
        print("   This is needed to connect to SQL Server from Python")
        print("\n🔗 Download from:")
        print("   https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server")
        print("\n📋 For Windows:")
        print("   1. Download 'Microsoft ODBC Driver 18 for SQL Server' (x64)")
        print("   2. Run the installer as Administrator")
        print("   3. Follow the installation wizard")
        print("   4. Restart this script after installation")
        
        choice = input("\n❓ Do you want to continue anyway? (y/n): ").strip().lower()
        return choice == 'y'

def install_python_packages():
    """Install required Python packages"""
    print_step("1", "Installing Python Dependencies")
    
    packages = ["pyodbc", "sqlalchemy", "pandas"]
    
    for package in packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package} already installed")
        except ImportError:
            print(f"📦 Installing {package}...")
            subprocess.run([sys.executable, "-m", "pip", "install", package], check=True)
            print(f"✅ {package} installed successfully")

def check_docker():
    """Check if Docker is available and running"""
    print_step("2", "Checking Docker")
    
    if not check_command_exists("docker"):
        print("❌ Docker not found!")
        print("📋 Please install Docker from: https://www.docker.com/get-started")
        print("   For Windows: Docker Desktop")
        print("   For Mac: Docker Desktop") 
        print("   For Linux: docker.io package")
        return False
    
    # Check if Docker daemon is running
    try:
        subprocess.run(["docker", "info"], capture_output=True, check=True)
        print("✅ Docker is installed and running")
        return True
    except subprocess.CalledProcessError:
        print("❌ Docker is installed but not running")
        print("📋 Please start Docker and try again")
        return False

def start_sql_server():
    """Start SQL Server in Docker"""
    print_step("3", "Starting SQL Server")
    
    container_name = "tallydb-intern-sql"
    password = "InternPassword123#"
    port = 1434  # Use different port to avoid conflicts
    
    # Stop existing container if running
    try:
        subprocess.run(["docker", "stop", container_name], capture_output=True)
        subprocess.run(["docker", "rm", container_name], capture_output=True)
        print("🛑 Stopped existing container")
    except:
        pass
    
    # Check if port is in use and find available port
    import socket
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                break  # Port is available
            port += 1
            if port > 1440:  # Safety limit
                print("❌ Could not find available port")
                return None
    
    print(f"🐳 Starting SQL Server 2022 container on port {port}...")
    
    current_dir = os.getcwd()
    
    # Detect platform for Apple Silicon compatibility
    import platform
    platform_arch = platform.machine().lower()
    
    docker_cmd = [
        "docker", "run", "-d",
        "--name", container_name,
        "-e", "ACCEPT_EULA=Y",
        "-e", f"SA_PASSWORD={password}",
        "-p", f"{port}:1433",
        "-v", f"{current_dir}:/data"
    ]
    
    # Add platform specification for Apple Silicon
    if platform_arch in ['arm64', 'aarch64']:
        docker_cmd.extend(["--platform", "linux/amd64"])
    
    docker_cmd.append("mcr.microsoft.com/mssql/server:2022-latest")
    
    try:
        result = subprocess.run(docker_cmd, capture_output=True, text=True, check=True)
        print(f"✅ SQL Server container started: {result.stdout.strip()[:12]}...")
        
        # Wait for SQL Server to be ready
        print("⏳ Waiting for SQL Server to initialize...")
        time.sleep(15)
        
        # Test connection
        if test_sql_server_connection(password, port):
            print("✅ SQL Server is ready!")
            return password, port
        else:
            print("❌ SQL Server failed to start properly")
            return None
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start SQL Server: {e}")
        print(f"Error output: {e.stderr}")
        return None

def get_available_sql_server_drivers():
    """Get list of available SQL Server ODBC drivers"""
    try:
        import pyodbc
        drivers = [driver for driver in pyodbc.drivers() if 'SQL Server' in driver]
        return drivers
    except ImportError:
        return []

def get_best_sql_server_driver():
    """Get the best available SQL Server ODBC driver"""
    available_drivers = get_available_sql_server_drivers()
    
    if not available_drivers:
        return None
        
    # Try drivers in order of preference
    driver_priority = [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server", 
        "ODBC Driver 13 for SQL Server",
        "SQL Server"
    ]
    
    for preferred_driver in driver_priority:
        if preferred_driver in available_drivers:
            return preferred_driver
    
    # Return first available driver if none of the preferred ones found
    return available_drivers[0] if available_drivers else None

def test_sql_server_connection(password, port=1433):
    """Test SQL Server connection with multiple driver fallbacks"""
    max_attempts = 6
    
    # Check available drivers first
    available_drivers = get_available_sql_server_drivers()
    
    if not available_drivers:
        print("❌ No SQL Server ODBC drivers found!")
        print("📋 Please install Microsoft ODBC Driver for SQL Server:")
        print("   Download from: https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server")
        print("   For Windows: Install 'Microsoft ODBC Driver 18 for SQL Server'")
        return False
    
    print(f"🔍 Found ODBC drivers: {', '.join(available_drivers)}")
    
    # Try drivers in order of preference
    driver_priority = [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server", 
        "ODBC Driver 13 for SQL Server",
        "SQL Server"
    ]
    
    drivers_to_try = []
    for preferred_driver in driver_priority:
        if preferred_driver in available_drivers:
            drivers_to_try.append(preferred_driver)
    
    # Add any remaining drivers
    for driver in available_drivers:
        if driver not in drivers_to_try:
            drivers_to_try.append(driver)
    
    for driver in drivers_to_try:
        print(f"🔌 Trying driver: {driver}")
        
        for attempt in range(max_attempts):
            try:
                import pyodbc
                conn_str = f"DRIVER={{{driver}}};SERVER=localhost,{port};UID=sa;PWD={password};TrustServerCertificate=yes"
                conn = pyodbc.connect(conn_str, timeout=5)
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                conn.close()
                print(f"✅ Connected successfully using: {driver}")
                return True
            except Exception as e:
                if attempt < max_attempts - 1:
                    print(f"⏳ Connection attempt {attempt + 1} with {driver} failed, retrying...")
                    time.sleep(5)
                else:
                    print(f"❌ All attempts failed with {driver}: {e}")
                    break
    
    print("❌ All drivers failed. Please ensure:")
    print("   1. SQL Server container is running")
    print("   2. ODBC Driver for SQL Server is installed")
    print("   3. Port is not blocked by firewall")
    return False

def restore_database(password, port=1433):
    """Restore the TallyDB database from backup"""
    print_step("4", "Restoring TallyDB Database")
    
    backup_path = os.path.abspath("tallydb_backup.bak")
    
    if not os.path.exists(backup_path):
        print(f"❌ Backup file not found: {backup_path}")
        return False
    
    print(f"📁 Found backup file: {backup_path}")
    
    # Get the best available driver
    driver = get_best_sql_server_driver()
    if not driver:
        print("❌ No SQL Server ODBC drivers found!")
        print("📋 Please install Microsoft ODBC Driver for SQL Server:")
        print("   Download from: https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server")
        return False
    
    print(f"🔌 Using driver: {driver}")
    
    try:
        import pyodbc
        
        # Connect to master database with autocommit
        conn_str = f"DRIVER={{{driver}}};SERVER=localhost,{port};DATABASE=master;UID=sa;PWD={password};TrustServerCertificate=yes"
        conn = pyodbc.connect(conn_str)
        conn.autocommit = True  # Enable autocommit for DDL operations
        cursor = conn.cursor()
        
        # Restore the database (WITH REPLACE handles existing database)
        print("📎 Restoring TallyDB database from backup...")
        
        # Use Docker internal path for the backup file
        docker_backup_path = "/data/tallydb_backup.bak"
        
        restore_sql = f"RESTORE DATABASE TallyDB FROM DISK = '{docker_backup_path}' WITH REPLACE"
        
        cursor.execute(restore_sql)
        print("✅ Database restore initiated!")
        
        # Wait for restore to complete
        print("⏳ Waiting for database restore to complete...")
        max_wait_attempts = 12  # 60 seconds total
        for wait_attempt in range(max_wait_attempts):
            try:
                time.sleep(5)
                cursor.execute("SELECT COUNT(*) FROM TallyDB.INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
                table_count = cursor.fetchone()[0]
                print("✅ Database restore completed!")
                break
            except Exception as wait_error:
                error_msg = str(wait_error)
                if "middle of a restore" in error_msg or "cannot be opened" in error_msg:
                    print(f"⏳ Restore in progress... (attempt {wait_attempt + 1}/{max_wait_attempts})")
                    continue
                else:
                    # Different error, re-raise it
                    raise wait_error
        else:
            # If we exhausted all attempts
            print("❌ Database restore timed out")
            return False
        
        # Verify restoration one more time
        cursor.execute("SELECT COUNT(*) FROM TallyDB.INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        table_count = cursor.fetchone()[0]
        
        print(f"✅ TallyDB restored successfully!")
        print(f"📊 Found {table_count} tables in the database")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Failed to restore database: {e}")
        return False

def demonstrate_data_access_pyodbc(password, port, driver):
    """Demonstrate data access using direct pyodbc connection"""
    try:
        import pyodbc
        import pandas as pd
        
        conn_str = f"DRIVER={{{driver}}};SERVER=localhost,{port};DATABASE=TallyDB;UID=sa;PWD={password};TrustServerCertificate=yes"
        
        with pyodbc.connect(conn_str) as conn:
            # Show table summary
            tables_query = """
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            ORDER BY TABLE_NAME
            """
            
            tables_df = pd.read_sql_query(tables_query, conn)
            print(f"\n📊 Database contains {len(tables_df)} tables:")
            
            # Categorize tables
            master_tables = [t for t in tables_df['TABLE_NAME'] if t.startswith('mst_')]
            transaction_tables = [t for t in tables_df['TABLE_NAME'] if t.startswith('trn_')]
            
            print(f"   • Master Data Tables: {len(master_tables)}")
            print(f"   • Transaction Tables: {len(transaction_tables)}")
            
            # Show sample data from key tables
            sample_queries = [
                {
                    'name': 'Ledger Summary',
                    'query': 'SELECT COUNT(*) as total_ledgers FROM mst_ledger'
                },
                {
                    'name': 'Transaction Summary', 
                    'query': 'SELECT COUNT(*) as total_transactions FROM trn_voucher'
                },
                {
                    'name': 'Stock Items Summary',
                    'query': 'SELECT COUNT(*) as total_items FROM mst_stock_item'
                }
            ]
            
            print(f"\n📈 Data Summary:")
            for query_info in sample_queries:
                try:
                    result = pd.read_sql_query(query_info['query'], conn)
                    value = result.iloc[0, 0]
                    print(f"   • {query_info['name']}: {value:,} records")
                except Exception as e:
                    print(f"   • {query_info['name']}: Error - {e}")
            
            # Show sample records
            print(f"\n🔍 Sample Data:")
            
            sample_data_queries = [
                {
                    'name': 'Recent Transactions',
                    'query': '''
                        SELECT TOP 5 date, voucher_type, voucher_number, party_name
                        FROM trn_voucher 
                        ORDER BY date DESC
                    '''
                },
                {
                    'name': 'Top Ledgers by Balance',
                    'query': '''
                        SELECT TOP 5 name, parent, opening_balance
                        FROM mst_ledger 
                        WHERE opening_balance IS NOT NULL AND opening_balance != 0
                        ORDER BY ABS(opening_balance) DESC
                    '''
                }
            ]
            
            for query_info in sample_data_queries:
                try:
                    print(f"\n📋 {query_info['name']}:")
                    result = pd.read_sql_query(query_info['query'], conn)
                    print(result.to_string(index=False))
                except Exception as e:
                    print(f"❌ Error in {query_info['name']}: {e}")
            
            return True
            
    except Exception as e:
        print(f"❌ Direct pyodbc data access failed: {e}")
        return False

def demonstrate_data_access(password, port=1433):
    """Demonstrate accessing the data"""
    print_step("5", "Demonstrating Data Access")
    
    # Get the best available driver
    driver = get_best_sql_server_driver()
    if not driver:
        print("❌ No SQL Server ODBC drivers found!")
        return False
    
    print(f"🔌 Using direct pyodbc connection with {driver}")
    
    # Use direct pyodbc approach to avoid SQLAlchemy compatibility issues
    return demonstrate_data_access_pyodbc(password, port, driver)

def interactive_query_mode(password, port=1433):
    """Provide interactive query capability"""
    print_step("6", "Interactive Query Mode")
    
    # Get the best available driver
    driver = get_best_sql_server_driver()
    if not driver:
        print("❌ No SQL Server ODBC drivers found!")
        return
    
    try:
        import pandas as pd
        import pyodbc
        
        conn_str = f"DRIVER={{{driver}}};SERVER=localhost,{port};DATABASE=TallyDB;UID=sa;PWD={password};TrustServerCertificate=yes"
        
        print("🎯 Interactive SQL Query Mode")
        print("Type your SQL queries below (or 'exit' to quit)")
        print("Example: SELECT TOP 10 * FROM mst_ledger")
        
        with pyodbc.connect(conn_str) as conn:
            while True:
                try:
                    query = input("\n📝 SQL> ").strip()
                    
                    if query.lower() in ['exit', 'quit', 'q']:
                        break
                    
                    if not query:
                        continue
                    
                    result = pd.read_sql_query(query, conn)
                    print(f"\n📊 Results ({len(result)} rows):")
                    print(result.to_string(index=False))
                    
                except KeyboardInterrupt:
                    print("\n👋 Exiting interactive mode...")
                    break
                except Exception as e:
                    print(f"❌ Query error: {e}")
        
    except Exception as e:
        print(f"❌ Interactive mode failed: {e}")

def main():
    """Main execution function"""
    print_header("TallyDB Complete Setup & Access")
    print("This script will set up everything needed to access TallyDB data")
    print("Requirements: Docker, Python 3.6+, SQL Server ODBC Driver")
    
    try:
        # Step 1: Install Python packages
        install_python_packages()
        
        # Step 1.5: Check ODBC driver
        if not check_and_install_odbc_driver():
            print("\n⚠️  Continuing without proper ODBC driver may cause connection failures")
        
        # Step 2: Check Docker
        if not check_docker():
            sys.exit(1)
        
        # Step 3: Start SQL Server
        result = start_sql_server()
        if not result:
            sys.exit(1)
        password, port = result
        
        # Step 4: Restore database
        if not restore_database(password, port):
            sys.exit(1)
        
        # Step 5: Demonstrate data access
        if not demonstrate_data_access(password, port):
            sys.exit(1)
        
        # Success!
        print_header("🎉 Setup Complete!")
        print("✅ SQL Server is running in Docker")
        print("✅ TallyDB database is attached and accessible")
        print("✅ Sample data queries executed successfully")
        print(f"\n📋 Connection Details:")
        print(f"   Server: localhost:{port}")
        print(f"   Database: TallyDB")
        print(f"   Username: sa")
        print(f"   Password: {password}")
        
        print(f"\n🎯 What you can do now:")
        print("1. Use any SQL client to connect to the database")
        print("2. Run custom queries on the TallyDB data")
        print("3. Explore the 23+ tables of business data")
        print("4. Practice SQL and data analysis")
        
        # Offer interactive mode
        choice = input("\n🔍 Want to try interactive query mode? (y/n): ").strip().lower()
        if choice == 'y':
            interactive_query_mode(password, port)
        
        print(f"\n🛑 To stop SQL Server later:")
        print("   docker stop tallydb-intern-sql")
        print("   docker rm tallydb-intern-sql")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 