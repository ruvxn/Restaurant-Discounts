# Restaurant Discounts - Quick Start Guide

A step-by-step guide to get the Restaurant Discounts Management System running on your computer.

---

## 📋 Prerequisites

Before you begin, you'll need to install the following software:

### 1. Docker Desktop

Docker runs the entire application including the database, web server, and ML service.

#### Download & Install Docker:

**For macOS:**
1. Visit [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Click "Download for Mac"
3. Choose your chip type:
   - **Apple Silicon (M1/M2/M3)**: Download "Mac with Apple chip"
   - **Intel Mac**: Download "Mac with Intel chip"
4. Open the downloaded `.dmg` file
5. Drag Docker.app to your Applications folder
6. Open Docker from Applications
7. Follow the setup wizard

**For Windows:**
1. Visit [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Click "Download for Windows"
3. Run the installer (Docker Desktop Installer.exe)
4. Follow the installation wizard
5. Restart your computer when prompted
6. Launch Docker Desktop from the Start menu

**For Linux:**
1. Visit [https://docs.docker.com/desktop/install/linux-install/](https://docs.docker.com/desktop/install/linux-install/)
2. Choose your distribution (Ubuntu, Debian, Fedora, etc.)
3. Follow the installation instructions

#### Verify Docker Installation:
Open a terminal/command prompt and run:
```bash
docker --version
```
You should see something like: `Docker version 24.x.x`

### 2. Git (Optional - for cloning)

If you want to clone the repository instead of downloading a ZIP:

**macOS:** Already installed, or install via:
```bash
xcode-select --install
```

**Windows:** Download from [https://git-scm.com/download/win](https://git-scm.com/download/win)

**Linux:**
```bash
sudo apt-get install git  # Ubuntu/Debian
sudo yum install git      # CentOS/RHEL
```

---

## 📥 Getting the Code

You have two options:

### Option A: Download ZIP from GitHub (Recommended for beginners)

1. Go to the GitHub repository: `https://github.com/yourusername/Restaurant-Discounts`
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Save the file to your computer (e.g., Downloads folder)
5. Extract the ZIP file:
   - **Windows**: Right-click → "Extract All"
   - **macOS**: Double-click the ZIP file
   - **Linux**: `unzip Restaurant-Discounts-main.zip`
6. Rename the extracted folder from `Restaurant-Discounts-main` to `Restaurant-Discounts`

### Option B: Clone with Git

Open a terminal/command prompt and run:
```bash
# Navigate to where you want to store the project
cd ~/Documents  # macOS/Linux
cd %USERPROFILE%\Documents  # Windows

# Clone the repository
git clone https://github.com/yourusername/Restaurant-Discounts.git

# Enter the directory
cd Restaurant-Discounts
```

---

## 🚀 Running the Application

### Step 1: Open Terminal/Command Prompt

**macOS:**
- Press `Cmd + Space`, type "Terminal", press Enter

**Windows:**
- Press `Win + R`, type "cmd", press Enter
- Or use PowerShell: Press `Win + X`, select "Windows PowerShell"

**Linux:**
- Press `Ctrl + Alt + T`

### Step 2: Navigate to Project Directory

```bash
# Replace the path with where you extracted/cloned the project
cd ~/Documents/Restaurant-Discounts  # macOS/Linux
cd %USERPROFILE%\Documents\Restaurant-Discounts  # Windows
```

### Step 3: Start Docker Desktop

Make sure Docker Desktop is running:
- **macOS/Windows**: Look for the Docker whale icon in your system tray/menu bar
- If you don't see it, open Docker Desktop from Applications/Start Menu
- Wait until it shows "Docker Desktop is running"

### Step 4: Start the Application

Run this single command:

```bash
docker-compose up
```

**What happens next:**
- First time: Takes 2-5 minutes to download and set up everything
- Docker will automatically:
  1. Download required images (PostgreSQL, Node.js, Python)
  2. Install all dependencies
  3. Set up the database
  4. Run database migrations (create tables)
  5. **Seed sample data** (3 restaurants, menus, tables, admin accounts)
  6. Start all services

**Note:** Seeding happens automatically on first run. The system detects if data already exists and won't duplicate it on subsequent runs.

**You'll see lots of output. Wait for these messages:**
```
restaurant-web     | ✓ Ready in 2.5s
restaurant-web     | ○ Local:   http://localhost:3000
restaurant-model-server | INFO: Application startup complete.
```

### Step 5: Access the Application

Open your web browser and visit:

- **Customer Interface**: [http://localhost:3000/customer/home](http://localhost:3000/customer/home)
- **Admin Dashboard**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

---

## 🔑 Default Login Credentials

### Admin Accounts

Use these to log in to the admin dashboard:

| Restaurant   | Email                 | Password |
|--------------|-----------------------|----------|
| Sushi House  | admin@sushihouse.com  | admin123 |
| Pasta Place  | admin@pastaplace.com  | admin123 |
| Sunset Grill | admin@sunsetgrill.com | admin123 |

### Customer Account

Create a new customer account at: [http://localhost:3000/signup](http://localhost:3000/signup)

---

## 🛑 Stopping the Application

Press `Ctrl + C` in the terminal where docker-compose is running.

Then run:
```bash
docker-compose down
```

This stops all containers but keeps your data.

---

## 🔄 Restarting the Application

If you've already set everything up once, just run:

```bash
docker-compose up
```

Startup will be much faster (10-30 seconds).

---

## 🧹 Fresh Start (Reset Everything)

If something goes wrong and you want to start from scratch:

```bash
# Stop and remove everything including data
docker-compose down -v

# Start fresh (will automatically reseed)
docker-compose up
```

**⚠️ Warning:** This deletes all bookings, customers, and data!

### Manual Seeding (If Needed)

If the database is empty and you need to add sample data manually:

```bash
# While docker-compose is running, open a new terminal and run:
docker-compose exec web npx prisma db seed
```

This will populate the database with:
- 3 restaurants (Sushi House, Pasta Place, Sunset Grill)
- 50+ menu items
- Tables for each restaurant
- 3 admin accounts

---

## 🐛 Troubleshooting

### Problem: "Port 3000 is already in use"

**Solution:**
```bash
# Find what's using port 3000
lsof -ti:3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 $(lsof -ti:3000)  # macOS/Linux
# On Windows, use Task Manager to end the process
```

Or change the port in `docker-compose.yml`:
```yaml
services:
  web:
    ports:
      - "3001:3000"  # Use 3001 instead
```

### Problem: Docker containers won't start

**Solutions:**
1. Make sure Docker Desktop is running
2. Restart Docker Desktop
3. Check Docker has enough resources:
   - Open Docker Desktop → Settings → Resources
   - Set Memory to at least 4GB (8GB recommended)
   - Click "Apply & Restart"

### Problem: "Cannot connect to database"

**Solution:**
```bash
# Stop everything
docker-compose down -v

# Remove old containers
docker rm -f restaurant-postgres restaurant-web restaurant-model-server

# Start fresh
docker-compose up
```

### Problem: Website shows errors or blank pages

**Solution:**
```bash
# Clear browser cache
# Or try in an incognito/private window

# Check logs
docker-compose logs web

# Rebuild containers
docker-compose up --build
```

### Problem: Map not loading on home page

The map uses an external CDN (Leaflet.js). Make sure:
1. You have an internet connection
2. Your firewall isn't blocking external resources
3. Try refreshing the page after a few seconds

---

## 📁 Project Structure

Once running, here's what you have:

```
Restaurant-Discounts/
├── apps/web/              # Next.js web application
├── services/model-server/ # Python ML service
├── docker-compose.yml     # Docker configuration
└── README.md             # Full documentation
```

---

## 🌐 Available Services

After starting with `docker-compose up`:

| Service | URL | Description |
|---------|-----|-------------|
| **Web App** | http://localhost:3000 | Main application |
| **Admin Login** | http://localhost:3000/admin/login | Admin dashboard |
| **Customer Home** | http://localhost:3000/customer/home | Browse restaurants |
| **ML API Docs** | http://localhost:8000/docs | FastAPI documentation |
| **Database** | localhost:5432 | PostgreSQL (internal) |

---

## 📊 Sample Data Included

The system comes pre-loaded with:

✅ **3 Restaurants**:
- Sushi House (Japanese) - 120 seats, 15 tables
- Pasta Place (Italian) - 100 seats, 12 tables
- Sunset Grill (American) - 150 seats, 18 tables

✅ **50+ Menu Items** across all restaurants with:
- Appetizers, Main Courses, Desserts, Beverages
- Dietary flags (Vegetarian, Vegan, Gluten-Free)
- Set menu options

✅ **3 Admin Accounts** (one per restaurant)

✅ **Sample Bookings** with different time slots and discounts

---

## 🎯 Next Steps

Once everything is running:

1. **Browse as a Customer**:
   - Visit http://localhost:3000/customer/home
   - View restaurants with discounts
   - Check the interactive map
   - Create an account and make a test booking

2. **Explore Admin Features**:
   - Log in at http://localhost:3000/admin/login
   - View dashboard analytics
   - Generate ML-powered discounts
   - Manage bookings and menus

3. **Test ML Features**:
   - Go to Admin Dashboard → Discounts
   - Click "Refresh Discounts"
   - Watch the system generate optimized discounts for the next 7 days

---

## 📖 Full Documentation

For detailed information about the system architecture, API endpoints, and features:

- **README.md** - Complete project documentation
- **API_ENDPOINTS.md** - API reference guide
- **DB_SCHEMA.md** - Database structure

---

## 💡 Tips

- **Run in background**: Use `docker-compose up -d` to run without blocking your terminal
- **View logs**: Use `docker-compose logs -f` to see live logs
- **Stop background**: Use `docker-compose down` to stop background services
- **Database access**: Use `docker-compose exec postgres psql -U restaurant_user -d restaurant_discounts`

---

## ⚡ Quick Reference Commands

```bash
# Start application (first time or full setup)
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop (keeps data)
docker-compose down

# Stop and delete all data
docker-compose down -v

# Restart just one service
docker-compose restart web

# Rebuild after code changes
docker-compose up --build

# Check running containers
docker-compose ps
```

---

## 🆘 Getting Help

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review logs: `docker-compose logs -f web`
3. Try a fresh start: `docker-compose down -v && docker-compose up`
4. Check Docker Desktop is running and has enough resources
5. Ensure ports 3000, 5432, and 8000 are not in use

---

## ✅ Success Checklist

You're all set when you can:

- [ ] Docker Desktop is installed and running
- [ ] Project files are downloaded/extracted
- [ ] `docker-compose up` runs without errors
- [ ] Browser opens http://localhost:3000
- [ ] You can see the restaurant list
- [ ] Admin login works with provided credentials
- [ ] Interactive map displays on home page

**Congratulations! Your Restaurant Discounts Management System is ready to use! 🎉**
