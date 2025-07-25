# TallyDB Access POC for Interns

## 🎯 **One-Script Setup - Access TallyDB Data in 3 Steps**

This POC gives you **complete access** to TallyDB business data on your own system. No passwords to share, no server dependencies.

### **What You Get:**
- ✅ **23 tables** of real business data (ledgers, transactions, inventory)
- ✅ **Independent setup** - runs on your own machine
- ✅ **Full SQL access** - query, analyze, learn
- ✅ **Safe sandbox** - your own isolated database

---

## 🚀 **Quick Start (5 minutes)**

### **Requirements:**
- **Docker** (get from [docker.com](https://docker.com))
- **Python 3.6+** (usually pre-installed)

### **Run:**
```bash
python script.py
```

**That's it!** The script handles everything:
1. 📦 Installs Python dependencies
2. 🐳 Starts SQL Server in Docker  
3. 📁 Restores TallyDB database
4. 🔍 Shows sample data
5. 💬 Provides interactive query mode

### **Expected Output:**
```
🎯 TallyDB Complete Setup & Access
✅ SQL Server container started
✅ TallyDB restored successfully!
📊 Found 23 tables in the database

📋 Connection Details:
   Server: localhost:1434
   Database: TallyDB
   Username: sa
   Password: InternPassword123#
```

---

## 📊 **What Data Can You Explore?**

### **Master Data (Reference Tables):**
- **`mst_ledger`** (298 records) - Chart of accounts, financial ledgers
- **`mst_stock_item`** (447 records) - Inventory items and stock levels
- **`mst_group`** - Account groups and categories

### **Transaction Data (Business Activity):**
- **`trn_voucher`** (8,765 records) - All business transactions
- **`trn_accounting`** (32,474 records) - Detailed accounting entries
- **`trn_inventory`** - Stock movements and transfers

### **Sample Queries to Try:**
```sql
-- Recent transactions
SELECT TOP 10 date, voucher_type, party_name, voucher_number
FROM trn_voucher ORDER BY date DESC;

-- Top ledgers by balance
SELECT TOP 10 name, parent, opening_balance
FROM mst_ledger WHERE opening_balance != 0
ORDER BY ABS(opening_balance) DESC;

-- Inventory analysis
SELECT name, parent, opening_balance, opening_value
FROM mst_stock_item WHERE opening_balance > 0
ORDER BY opening_value DESC;
```

---

## 🛠️ **After Setup - What You Can Do:**

### **1. Use Any SQL Client:**
Connect to `localhost:1434` with username `sa` and password `InternPassword123#`

### **2. Interactive Queries:**
The script includes an interactive mode - just say 'y' when prompted

### **3. Learn & Analyze:**
- Practice SQL queries
- Build reports and dashboards  
- Explore business intelligence
- Create data visualizations

### **4. Stop When Done:**
```bash
docker stop tallydb-intern-sql
docker rm tallydb-intern-sql
```

---

## 🔧 **Troubleshooting**

### **Docker Issues:**
- **Not installed?** Get from [docker.com](https://docker.com)
- **Not running?** Start Docker Desktop

### **Port Conflicts:**
- Script automatically finds available ports
- Default tries 1434, 1435, etc.

### **Python Errors:**
- Ensure Python 3.6+ installed
- Script auto-installs required packages

### **Need Help?**
The script provides detailed error messages and troubleshooting tips.

---

## 📁 **Files in This POC:**
- **`script.py`** - Main setup script (does everything)
- **`tallydb_backup.bak`** - Database backup file (21MB)
- **`README.md`** - This guide

---

## 🎉 **Ready to Explore Business Data!**

Run `python script.py` and start your data analysis journey with real Tally ERP business data. Learn SQL, practice queries, and build your data skills with a complete business database! 🚀 