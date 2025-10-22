# Restaurant Discounts Management System

A full-stack intelligent restaurant booking platform that leverages machine learning to dynamically optimize occupancy and maximize revenue through data-driven discount recommendations.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Machine Learning Integration](#machine-learning-integration)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

This platform revolutionizes restaurant revenue management by combining a modern Next.js web application with a sophisticated Python-based machine learning service. The system predicts customer demand patterns and automatically generates strategic discount recommendations to fill low-occupancy time slots, helping restaurants maximize revenue while providing customers with value-driven booking opportunities.

### Business Value

- **Revenue Optimization**: Increase overall revenue by filling previously empty tables during off-peak hours
- **Demand Prediction**: Machine learning models analyze historical patterns to forecast demand 7 days ahead
- **Dynamic Pricing**: Automated discount generation (5-30%) for predicted low-demand periods
- **Customer Retention**: Attract price-sensitive customers while maintaining premium pricing during peak hours
- **Operational Efficiency**: Real-time capacity management and automated table assignment

## Key Features

### For Customers

#### Booking Experience
- **Smart Restaurant Discovery**: Browse restaurants with real-time discount visibility
- **Instant Availability**: Real-time table availability checking across all time slots
- **Discount Transparency**: See exact discount percentages before booking
- **Flexible Party Sizes**: Support for 1-20 guests with automatic table assignment
- **Table Sharing**: Intelligent table sharing for optimal capacity utilization
- **Pre-ordering**: Select menu items during booking for streamlined dining

#### Account Management
- **Profile Customization**: Manage personal information and preferences
- **Interest Tracking**: Share interests for enhanced social dining experiences
- **Birthday Benefits**: Automatic birthday discount eligibility
- **Booking History**: Track upcoming and past reservations with savings summary

### For Restaurant Admins

#### Dashboard & Analytics
- **Real-time Metrics**: Today's bookings, revenue, and occupancy at a glance
- **7-Day Forecast**: Upcoming bookings with revenue projections
- **Popular Time Slots**: Data-driven insights into peak demand periods
- **Performance Tracking**: Total bookings, completion rates, and customer statistics

#### Booking Management
- **Comprehensive View**: Filter bookings by date, status (upcoming/past/all), and booking status (booked/cancelled/completed)
- **Quick Actions**: Create, modify, and cancel bookings directly from dashboard
- **Customer Insights**: Access customer information and booking history
- **Flexible Cancellation**: Cancel bookings without customer-facing 24-hour restriction
- **Manual Booking Creation**: Create bookings on behalf of customers with automatic table assignment

#### Discount Management
- **ML-Powered Recommendations**: One-click generation of AI-optimized discount schedules
- **Manual Override**: Adjust individual discount percentages (5-50%) with reason tracking
- **Batch Updates**: Modify multiple time slots simultaneously
- **Historical Tracking**: View booking count per discount slot to measure effectiveness
- **Date Range Control**: Generate discounts for 1-7 days ahead

#### Operations
- **Menu Management**: Create, update, and categorize menu items with dietary tags
- **Table Configuration**: Manage seating capacity and table assignments
- **Availability Monitoring**: Real-time capacity tracking across all tables
- **Menu Lock Enforcement**: Ensure consistent set menus during shared bookings

### ML-Powered Discount System

#### Prediction Capabilities
- **7-Day Advance Forecast**: Predict demand for each hour, 7 days ahead
- **Restaurant-Specific Models**: Separate trained models per restaurant for personalized accuracy
- **Multi-Factor Analysis**: Considers day of week, hour, weather patterns, holidays, and historical booking data
- **Hourly Granularity**: Predictions for every operating hour (e.g., 8 AM to 10 PM)

#### Model Architecture
- **Algorithm**: Histogram Gradient Boosting Regression (HGBR) from scikit-learn
- **Training Data**: Historical bookings, seasonal patterns, and external factors
- **Features**: Temporal (day, hour, month), categorical (day of week), numerical (past occupancy rates)
- **Output**: Demand score (0-100) mapped to discount percentage (0-30%)

#### Discount Strategy
- **Low Demand (0-30%)**: 25-30% discount to maximize fill rate
- **Medium Demand (30-60%)**: 15-20% discount to boost occupancy
- **High Demand (60-80%)**: 5-10% discount to maintain slight incentive
- **Peak Demand (80-100%)**: 0-5% discount or no discount (premium pricing)

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser                            │
│              (React 19 / Next.js 15 Frontend)                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                Next.js Application Server                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  App Router Pages (SSR/SSG)                          │   │
│  │  - Customer Pages: /restaurant/[id], /booking/[id]  │   │
│  │  - Admin Pages: /admin/dashboard, /admin/bookings   │   │
│  │  - Auth Pages: /login, /signup                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/*)                                 │   │
│  │  - Auth: /api/auth/login, /api/auth/signup          │   │
│  │  - Bookings: /api/bookings, /api/bookings/[id]      │   │
│  │  - Restaurants: /api/restaurants, /api/capacity     │   │
│  │  - Admin: /api/admin/*, /api/admin/refresh-discounts│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Business Logic & Utilities                          │   │
│  │  - Prisma ORM (Database Access Layer)               │   │
│  │  - Auth Helpers (Session Management)                │   │
│  │  - Booking Utils (Capacity, Pricing, Menu Locks)    │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
            │ Prisma                          │ HTTP POST
            │ Client                          │ /v1/generate
            │                                 │
┌───────────▼─────────────────┐   ┌───────────▼───────────────┐
│   PostgreSQL Database       │   │  Python ML Service        │
│   - Restaurants             │   │  (FastAPI + scikit-learn) │
│   - Bookings                │   │                           │
│   - Customers               │   │  ┌────────────────────┐  │
│   - AcceptedDiscounts       │   │  │  /v1/generate      │  │
│   - DiningTables            │   │  │  - Load Model      │  │
│   - MenuItems               │   │  │  - Predict Demand  │  │
│   - Accounts                │   │  │  - Map to Discount │  │
│   - BookingItems            │   │  └────────────────────┘  │
│                             │   │                           │
│  Port: 5432                 │   │  ┌────────────────────┐  │
│  Database: restaurant_      │   │  │  Trained Models    │  │
│            discounts        │   │  │  (.pkl files)      │  │
└─────────────────────────────┘   │  │  - sushi-house/    │  │
                                  │  │  - pasta-place/    │  │
                                  │  │  - sunset-grill/   │  │
                                  │  └────────────────────┘  │
                                  │  Port: 8000              │
                                  └──────────────────────────┘
```

### Request Flow Examples

#### Customer Booking Flow
1. User selects restaurant, date, time, party size
2. Frontend calls `GET /api/restaurants/[id]/capacity?date=...&hour=...`
3. API queries database for existing bookings and table configurations
4. Business logic calculates available seats per table
5. Response includes availability, menu lock status, and applicable discounts
6. User confirms booking with optional menu items
7. Frontend calls `POST /api/bookings` with booking details
8. API validates capacity, applies discount, assigns table(s)
9. Transaction commits booking + booking items to database
10. Response includes confirmation with savings breakdown

#### Admin Discount Generation Flow
1. Admin clicks "Refresh Discounts" in dashboard
2. Frontend calls `POST /api/admin/refresh-discounts` with date range
3. API authenticates admin, retrieves restaurant details
4. For each day in range:
   - API calls Python ML service `POST /v1/generate`
   - ML service loads restaurant-specific model
   - Model predicts demand for each operational hour
   - Predictions mapped to discount percentages
5. API deletes existing discounts for dates
6. API bulk inserts new `AcceptedDiscount` records
7. Response includes total slots updated and per-day results

## Tech Stack

### Frontend & Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.5.2 | Full-stack React framework with App Router |
| **React** | 19.1.0 | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Prisma** | 6.15.0 | Database ORM and migration tool |
| **PostgreSQL** | 16 | Relational database |
| **bcryptjs** | 3.0.2 | Password hashing |
| **Zod** | 3.23.8 | Schema validation |
| **Sonner** | 1.5.0 | Toast notifications |
| **React Icons** | 5.5.0 | Icon library |

### Machine Learning Service

| Technology | Purpose |
|------------|---------|
| **Python** | 3.11+ runtime |
| **FastAPI** | Modern async API framework |
| **scikit-learn** | ML models (HGBR, preprocessing) |
| **pandas** | Data manipulation and analysis |
| **numpy** | Numerical computing |
| **joblib** | Model serialization/deserialization |
| **XGBoost** | Alternative gradient boosting library |
| **uvicorn** | ASGI server for FastAPI |

### Infrastructure & DevOps

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Node.js** | JavaScript runtime (v20+) |
| **npm** | Package management |
| **ESLint** | Code linting |
| **Git** | Version control |

## Project Structure

```
Restaurant-Discounts/
│
├── apps/
│   └── web/                           # Next.js monorepo application
│       ├── app/                       # App Router (Next.js 15)
│       │   ├── (auth)/                # Auth route group
│       │   │   ├── login/             # Customer/Admin login
│       │   │   └── signup/            # Customer signup
│       │   │
│       │   ├── customer/              # Customer-facing route group
│       │   │   ├── page.tsx           # Restaurant listing
│       │   │   ├── restaurant/[id]/   # Restaurant detail + booking
│       │   │   ├── booking/[id]/      # Booking confirmation
│       │   │   └── profile/           # Customer profile management
│       │   │
│       │   ├── admin/                 # Admin route group
│       │   │   ├── login/             # Admin-specific login
│       │   │   ├── dashboard/         # Analytics dashboard
│       │   │   ├── bookings/          # Booking management
│       │   │   ├── discounts/         # Discount management
│       │   │   └── menu/              # Menu item management
│       │   │
│       │   └── api/                   # API route handlers
│       │       ├── auth/              # Authentication endpoints
│       │       │   ├── login/
│       │       │   ├── signup/
│       │       │   ├── logout/
│       │       │   └── me/
│       │       │
│       │       ├── bookings/          # Booking CRUD
│       │       │   ├── route.ts       # POST /api/bookings
│       │       │   ├── [id]/          # GET/PATCH/DELETE
│       │       │   └── user/[customerId]/ # User bookings
│       │       │
│       │       ├── restaurants/       # Restaurant info & capacity
│       │       │   ├── route.ts       # GET /api/restaurants
│       │       │   └── [id]/
│       │       │       ├── route.ts   # GET restaurant details
│       │       │       ├── discounts/ # GET/POST discounts
│       │       │       ├── availability/
│       │       │       ├── capacity/
│       │       │       └── tables/[tableId]/guests/
│       │       │
│       │       ├── admin/             # Admin-only endpoints
│       │       │   ├── bookings/      # Admin booking management
│       │       │   ├── discounts/     # Discount CRUD
│       │       │   ├── refresh-discounts/ # ML trigger
│       │       │   ├── dashboard/     # Dashboard metrics
│       │       │   └── menu/          # Menu management
│       │       │
│       │       └── customer/
│       │           ├── profile/       # Customer profile
│       │           └── list/          # Admin: list customers
│       │
│       ├── prisma/
│       │   ├── schema.prisma          # Database schema definition
│       │   ├── migrations/            # Migration history
│       │   │   └── 20241001_*/        # Timestamped migrations
│       │   └── seed.mjs               # Database seeding script
│       │
│       ├── src/
│       │   ├── lib/                   # Shared utilities
│       │   │   ├── auth.ts            # Customer auth helpers
│       │   │   ├── admin-auth.ts      # Admin auth helpers
│       │   │   ├── booking-utils.ts   # Booking business logic
│       │   │   ├── time.ts            # Date/time utilities
│       │   │   ├── store.ts           # Default configurations
│       │   │   └── validation.ts      # Zod schemas
│       │   │
│       │   └── components/            # React components
│       │       ├── BookingForm.tsx
│       │       ├── RestaurantCard.tsx
│       │       ├── DiscountBadge.tsx
│       │       └── ...
│       │
│       ├── public/                    # Static assets
│       │   ├── images/
│       │   └── favicon.ico
│       │
│       ├── package.json               # Dependencies & scripts
│       ├── tsconfig.json              # TypeScript configuration
│       ├── tailwind.config.ts         # Tailwind CSS config
│       ├── next.config.ts             # Next.js configuration
│       └── .env                       # Environment variables
│
├── services/
│   └── model-server/                  # Python ML microservice
│       ├── app.py                     # FastAPI application
│       │                              # Routes: /v1/generate, /health
│       │
│       ├── models/                    # Trained ML models (.pkl)
│       │   ├── sushi-house/
│       │   │   ├── model.pkl
│       │   │   └── metadata.json
│       │   ├── pasta-place/
│       │   │   ├── model.pkl
│       │   │   └── metadata.json
│       │   └── sunset-grill/
│       │       ├── model.pkl
│       │       └── metadata.json
│       │
│       ├── train.ipynb                # Jupyter notebook for training
│       ├── requirements.txt           # Python dependencies
│       ├── Dockerfile                 # Container definition
│       └── README.md                  # ML service documentation
│
├── .git/                              # Git repository
├── .gitignore                         # Git ignore rules
│
├── docker-compose.yml                 # Multi-service orchestration
├── package.json                       # Root package.json
│
└── Documentation/                     # Comprehensive guides
    ├── README.md                      # This file
    ├── API_ENDPOINTS.md               # Complete API reference
    ├── DB_SCHEMA.md                   # Database schema details + ERD
    ├── DOCKER_SETUP.md                # Docker setup guide
    ├── SETUP.md                       # Manual setup (non-Docker)
    ├── BOOKING_SYSTEM_SUMMARY.md      # Booking architecture
    ├── TABLE_BOOKING_RULES.md         # Table assignment logic
    ├── TABLE_SHARING_RULES.md         # Table sharing mechanics
    ├── CAPACITY_API_GUIDE.md          # Capacity checking docs
    ├── ADMIN_DASHBOARD_SUMMARY.md     # Admin features overview
    ├── ADMIN_BOOKING_OPERATIONS.md    # Admin booking workflows
    └── BOOKING_STATUS_BEHAVIOR.md     # Status lifecycle
```

## Database Schema

### Entity Relationship Diagram

See [DB_SCHEMA.md](DB_SCHEMA.md#entity-relationship-diagram) for the complete Mermaid ERD.

### Core Models

#### **Account & Authentication**

```prisma
model Account {
  id           Int       @id @default(autoincrement())
  email        String    @unique
  passwordHash String?
  role         Role      @default(CUSTOMER) // CUSTOMER | ADMIN
  customer     Customer?
  admin        Admin?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

- Central authentication entity
- One-to-one relationship with either Customer or Admin
- Bcrypt password hashing (strength: 10 rounds)

#### **Restaurant**

```prisma
model Restaurant {
  id           Int      @id @default(autoincrement())
  slug         String   @unique
  name         String
  openHour     Int      // 0-23
  closeHour    Int      // 0-23
  totalSeats   Int
  googleRating Float?
  averageBill  Float?
  distanceKm   Float?
  category     String?
  acceptedDiscounts AcceptedDiscount[]
  admins       Admin[]
  tables       DiningTable[]
  menuItems    MenuItem[]
  bookings     Booking[]
}
```

- Root entity for restaurant operations
- Cascade deletes to discounts, tables, menu items, bookings
- Indexed by slug for fast URL lookups

#### **AcceptedDiscount**

```prisma
model AcceptedDiscount {
  id           Int      @id @default(autoincrement())
  restaurantId Int
  date         DateTime // UTC midnight (YYYY-MM-DDT00:00:00Z)
  time         String   // "HH:MM" format (e.g., "18:00")
  discount     Int      // 0-100 (percentage)
  restaurant   Restaurant @relation(...)
  @@unique([restaurantId, date, time])
}
```

- Stores ML-generated or admin-overridden discounts
- Unique constraint ensures one discount per hour slot per day
- Indexed by (restaurantId, date) and (restaurantId, time)

#### **Booking**

```prisma
model Booking {
  id              Int            @id @default(autoincrement())
  restaurantId    Int
  tableId         Int
  customerId      Int
  partySize       Int
  startsAt        DateTime       // Must be on the hour
  endsAt          DateTime       // startsAt + 2 hours
  originalTotal   Float
  discountedTotal Float
  discountPercent Int
  menuLockKey     String?        // "menu_<menuItemId>"
  status          BookingStatus  // BOOKED | COMPLETED | CANCELLED
  cancelledAt     DateTime?
  cancellationReason String?
  items           BookingItem[]
  @@unique([customerId, tableId, startsAt])
}
```

- 2-hour booking windows starting on the hour
- Menu lock ensures consistent set menus on shared tables
- Soft cancellation with reason tracking
- Complex indexes for availability queries

#### **DiningTable**

```prisma
model DiningTable {
  id           Int        @id @default(autoincrement())
  restaurantId Int
  label        String     // "T1", "Booth-3", "Window-2"
  seatingCap   Int
  bookings     Booking[]
  @@unique([restaurantId, label])
}
```

- Physical tables within restaurants
- Unique labels per restaurant
- Multiple bookings can share tables (capacity-permitting)

#### **MenuItem & BookingItem**

```prisma
model MenuItem {
  id           Int      @id @default(autoincrement())
  restaurantId Int
  name         String
  priceCents   Int      // Integer cents to avoid float issues
  isSetMenu    Boolean  // Fixed-price multi-course menus
  isActive     Boolean
  isVegetarian Boolean
  isVegan      Boolean
  isGlutenFree Boolean
  category     String?
  bookingItems BookingItem[]
}

model BookingItem {
  id          Int      @id @default(autoincrement())
  bookingId   Int
  menuItemId  Int
  qty         Int      @default(1)
  notes       String?
}
```

- Menu items with dietary flags and categorization
- BookingItems link menus to bookings (many-to-many through join table)
- onDelete: Restrict prevents deleting active menu items

### Key Relationships

- **Restaurant** → Many Admins, Tables, MenuItems, Bookings, Discounts
- **Account** → One Customer OR One Admin (mutually exclusive)
- **Customer** → Many Bookings
- **DiningTable** → Many Bookings (shared capacity)
- **Booking** → Many BookingItems → Many MenuItems

### Constraints & Indexes

- **Unique**: Restaurant slug, Account email, (Customer/Admin accountId), (Restaurant label), (Booking: customer+table+time), (Discount: restaurant+date+time)
- **Indexes**: Optimized for availability queries, booking status filters, menu locks, discount lookups
- **Cascade Deletes**: Restaurant deletion removes dependent entities
- **Restrict Deletes**: Preserve historical bookings when tables/customers deleted

For detailed schema documentation, see [DB_SCHEMA.md](DB_SCHEMA.md).

## Getting Started

### Prerequisites

- **Docker Desktop** ([Download](https://docs.docker.com/desktop/))
  - Version 20.10.0 or higher
  - 4GB RAM minimum (8GB recommended)
  - 10GB free disk space
- **Git** for cloning the repository

### Quick Start with Docker (Recommended)

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Restaurant-Discounts.git
cd Restaurant-Discounts
```

#### 2. Start All Services

```bash
docker-compose up
```

**First-time setup** takes 2-5 minutes. Docker will:
1. Pull base images (Node.js 20, Python 3.11, PostgreSQL 16)
2. Install dependencies for web app and ML service
3. Run database migrations
4. Seed sample data (3 restaurants, 50+ menu items, tables)
5. Start development servers

**Console output will show**:
- PostgreSQL ready on port 5432
- Next.js dev server ready on port 3000
- Python FastAPI ready on port 8000

#### 3. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Customer restaurant browsing |
| **Admin Dashboard** | [http://localhost:3000/admin/login](http://localhost:3000/admin/login) | Admin panel |
| **ML API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | FastAPI Swagger UI |
| **PostgreSQL** | `localhost:5432` | Database connection |

#### 4. Login with Sample Accounts

**Admin Accounts** (for all restaurants):

| Restaurant | Email | Password |
|------------|-------|----------|
| Sushi House | admin@sushihouse.com | admin123 |
| Pasta Place | admin@pastaplace.com | admin123 |
| Sunset Grill | admin@sunsetgrill.com | admin123 |

**Customer Accounts**: Create via signup at [http://localhost:3000/signup](http://localhost:3000/signup)

### Docker Commands Reference

```bash
# Start services in background (detached mode)
docker-compose up -d

# View live logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f web
docker-compose logs -f model-server
docker-compose logs -f postgres

# Stop services (preserves database)
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v

# Rebuild after code changes
docker-compose up --build

# Run database migrations
docker-compose exec web npx prisma migrate dev

# Access PostgreSQL shell
docker-compose exec postgres psql -U restaurant_user -d restaurant_discounts

# Access web container shell
docker-compose exec web sh

# Access Python service shell
docker-compose exec model-server bash
```

### Manual Setup (Without Docker)

If you prefer local development without Docker, see [SETUP.md](SETUP.md) for detailed instructions covering:
- PostgreSQL installation and configuration
- Node.js and npm setup
- Python virtual environment creation
- Environment variable configuration
- Database migration and seeding

## API Documentation

### Base URLs

- **Next.js API**: `http://localhost:3000/api`
- **Python ML Service**: `http://localhost:8000/v1`

### Authentication

Session-based authentication using HTTP-only cookies:

```typescript
// Login sets a session cookie
POST /api/auth/login
Body: { email: string, password: string }
Response: { accountId, email, role, customer?, admin? }

// Session cookie included in subsequent requests
// No Authorization header needed
```

### Key Endpoints

#### Restaurants & Capacity

```typescript
// List all restaurants with today's max discount
GET /api/restaurants
Response: Restaurant[]

// Get restaurant details with menu and tables
GET /api/restaurants/:id
Response: { restaurant, menuItems[], tables[] }

// Check available seats for a time window
GET /api/restaurants/:id/availability?date=YYYY-MM-DD&hour=HH
Response: { availableSeats, totalCapacity, bookedSeats, occupancyRate }

// Get detailed capacity per table
GET /api/restaurants/:id/capacity?date=YYYY-MM-DD&hour=HH
Response: { restaurant, tables[], timeWindow, menuLock }

// Get active discounts for a date
GET /api/restaurants/:id/discounts?date=YYYY-MM-DD
Response: { discounts: [{ hour, discountPercentage }] }
```

#### Bookings

```typescript
// Create booking (requires CUSTOMER session)
POST /api/bookings
Body: {
  restaurantId: number
  bookingDate: "YYYY-MM-DD"
  bookingTime: number // 0-23
  partySize: number // 1-20
  menuItems?: [{ menuItemId, quantity, notes? }]
  tableId?: number // Optional pre-selected table
}
Response: {
  message: string
  booking: Booking
  savings: number
}

// Get booking details
GET /api/bookings/:id
Response: { booking }

// Update booking
PATCH /api/bookings/:id
Body: { partySize?, bookingDate?, bookingTime?, menuItems? }
Response: { message, booking }

// Cancel booking (customer: ≥24h ahead)
DELETE /api/bookings/:id
Body: { reason?: string }
Response: { message, booking }

// Get user bookings
GET /api/bookings/user/:customerId
Response: { upcoming[], past[], totalBookings, totalSavings }
```

#### Admin - Bookings

```typescript
// List bookings for admin's restaurant
GET /api/admin/bookings?date=YYYY-MM-DD&status=upcoming|past|all&bookingStatus=BOOKED|CANCELLED|COMPLETED|all&limit=50
Response: { bookings[], summary: { totalBookings, totalRevenue, totalSavings, totalGuests } }

// Create booking as admin
POST /api/admin/bookings/create
Body: {
  customerId: number
  bookingDate: "YYYY-MM-DD"
  bookingTime: number
  partySize: number
  menuItems: [{ menuItemId, quantity }] // Required for admins
}
Response: { message, booking }

// Cancel booking (no time restriction)
DELETE /api/admin/bookings/:id/cancel
Body: { reason?: string }
Response: { message, booking, note }
```

#### Admin - Discounts

```typescript
// Get discounts for a date with booking counts
GET /api/admin/discounts?date=YYYY-MM-DD
Response: {
  date: string
  discounts: [{ id, time, hour, discount, bookingsReceived, createdAt, updatedAt }]
}

// Update multiple discounts
PATCH /api/admin/discounts
Body: { updates: [{ id, discount }] }
Response: { message, updated }

// Update single discount with override reason
PUT /api/admin/discounts/:id
Body: { discount: number, overrideReason?: string }
Response: { message, discount }

// Generate ML-powered discounts
POST /api/admin/refresh-discounts
Body: { startDate?: "YYYY-MM-DD", days?: number } // defaults: today, 7 days
Response: {
  message: string
  totalSlotsUpdated: number
  results: [{ date, slots, success, error? }]
  restaurantName: string
}
```

#### Admin - Dashboard

```typescript
// Get dashboard metrics
GET /api/admin/dashboard
Response: {
  today: {
    totalBookings, totalRevenue, totalSavings,
    totalGuests, occupancyRate, averagePartySize
  }
  upcoming: { // Next 7 days
    totalBookings, totalRevenue, totalSavings,
    totalGuests, bookingsToday, bookingsTomorrow
  }
  popularTimeSlots: [{ hour, bookingCount, totalGuests, totalRevenue }]
  stats: {
    totalTables, totalSeats, totalBookings,
    completedBookings, cancelledBookings
  }
}
```

#### Machine Learning Service

```typescript
// Generate demand predictions and discount recommendations
POST http://localhost:8000/v1/generate
Body: {
  restaurant_id: number // 1=Sushi House, 2=Pasta Place, 3=Sunset Grill
  start_date: "YYYY-MM-DD"
  days_ahead: number // 1-7
}
Response: {
  restaurant_id: number
  predictions: [
    {
      date: "YYYY-MM-DD"
      hour: number
      time: "HH:00"
      predicted_demand: number // 0-100
      recommended_discount: number // 0-30
    }
  ]
  model_version: string
  generated_at: string
}
```

For complete API documentation, see [API_ENDPOINTS.md](API_ENDPOINTS.md).

## Machine Learning Integration

### Model Training

#### Data Preparation

Training data is generated from historical bookings:

```python
# Features extracted per booking
features = {
    'day_of_week': 0-6,      # Monday=0, Sunday=6
    'hour': 0-23,            # Hour of booking start
    'month': 1-12,           # Seasonal patterns
    'is_weekend': 0|1,       # Friday-Sunday flag
    'past_occupancy': 0-100  # Historical occupancy rate
}

# Target variable
target = occupancy_percentage  # 0-100
```

#### Training Process

Located in `services/model-server/train.ipynb`:

```python
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split
import joblib

# Load historical booking data
df = load_booking_history(restaurant_id)

# Feature engineering
X = extract_features(df)
y = df['occupancy_percentage']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train HGBR model
model = HistGradientBoostingRegressor(
    max_iter=200,
    max_depth=10,
    learning_rate=0.1,
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate
score = model.score(X_test, y_test)  # R² score

# Save model
joblib.dump(model, f'models/{restaurant_slug}/model.pkl')
```

#### Model Files

```
services/model-server/models/
├── sushi-house/
│   ├── model.pkl          # Trained HGBR model
│   └── metadata.json      # Training date, R² score, feature names
├── pasta-place/
│   └── ...
└── sunset-grill/
    └── ...
```

### Prediction Workflow

#### 1. API Request

Admin triggers discount generation:

```bash
curl -X POST http://localhost:3000/api/admin/refresh-discounts \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-10-25",
    "days": 7
  }'
```

#### 2. Next.js → Python Communication

```typescript
// apps/web/app/api/admin/refresh-discounts/route.ts
const response = await fetch('http://model-server:8000/v1/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    restaurant_id: 1,
    start_date: '2025-10-25',
    days_ahead: 7
  })
});

const predictions = await response.json();
```

#### 3. Python Prediction

```python
# services/model-server/app.py
@app.post("/v1/generate")
async def generate_discounts(request: GenerateRequest):
    # Load restaurant-specific model
    model = joblib.load(f'models/{restaurant_slug}/model.pkl')

    predictions = []
    for date in date_range(start_date, days_ahead):
        for hour in range(open_hour, close_hour):
            # Extract features
            features = {
                'day_of_week': date.weekday(),
                'hour': hour,
                'month': date.month,
                'is_weekend': date.weekday() >= 5,
                'past_occupancy': get_historical_avg(restaurant_id, hour)
            }

            # Predict demand
            demand = model.predict([features])[0]  # 0-100

            # Map to discount
            discount = map_demand_to_discount(demand)

            predictions.append({
                'date': str(date),
                'hour': hour,
                'time': f'{hour:02d}:00',
                'predicted_demand': round(demand, 2),
                'recommended_discount': discount
            })

    return {'predictions': predictions}
```

#### 4. Discount Mapping Logic

```python
def map_demand_to_discount(demand: float) -> int:
    """
    Convert predicted demand (0-100) to discount percentage (0-30)

    Strategy:
    - Low demand → High discount (fill empty seats)
    - High demand → Low/no discount (maximize revenue)
    """
    if demand < 30:
        return random.randint(25, 30)  # 25-30% discount
    elif demand < 60:
        return random.randint(15, 20)  # 15-20% discount
    elif demand < 80:
        return random.randint(5, 10)   # 5-10% discount
    else:
        return random.randint(0, 5)    # 0-5% discount (peak)
```

#### 5. Database Persistence

```typescript
// Next.js saves predictions to database
await prisma.acceptedDiscount.deleteMany({
  where: { restaurantId, date }
});

await prisma.acceptedDiscount.createMany({
  data: predictions.map(p => ({
    restaurantId,
    date: new Date(p.date + 'T00:00:00Z'),
    time: p.time,
    discount: p.recommended_discount
  }))
});
```

### Model Performance

- **R² Score**: 0.75-0.85 (typical for time-series occupancy prediction)
- **MAE**: 8-12% (mean absolute error in demand prediction)
- **Training Time**: ~30 seconds per restaurant on historical data
- **Prediction Time**: <100ms for 7 days × 14 hours = 98 predictions

### Retraining Schedule

Models should be retrained monthly or when:
- Significant booking pattern changes detected
- New holidays/events added
- Seasonal transitions occur

## Development Workflow

### Hot Reload

All services support hot reload during development:

- **Next.js**: File changes trigger fast refresh (React components) or full reload (API routes)
- **Python FastAPI**: File changes auto-restart uvicorn with `--reload` flag
- **Database**: Schema changes require migration (see below)

### Making Code Changes

#### Frontend/API Changes

1. Edit files in `apps/web/app/` or `apps/web/src/`
2. Save file
3. Browser auto-refreshes (if frontend) or API route reloads (if backend)

No container rebuild needed.

#### Python Service Changes

1. Edit `services/model-server/app.py`
2. Save file
3. uvicorn detects change and restarts

No container rebuild needed.

### Database Migrations

#### After modifying `apps/web/prisma/schema.prisma`:

```bash
# Generate and apply migration
docker-compose exec web npx prisma migrate dev --name add_new_field

# Or reset entire database (WARNING: deletes all data)
docker-compose exec web npx prisma migrate reset
```

#### Migration workflow:

1. Edit `schema.prisma`
2. Run `prisma migrate dev --name descriptive_name`
3. Prisma generates SQL migration in `prisma/migrations/`
4. Migration auto-applies to database
5. Prisma Client regenerates TypeScript types

### Environment Variables

#### Web Application (.env in apps/web/)

```bash
DATABASE_URL="postgresql://restaurant_user:restaurant_pass@postgres:5432/restaurant_discounts"
MODEL_SERVER_URL="http://model-server:8000"
CRON_SECRET="your-secret-key-for-scheduled-jobs"
```

#### Docker Compose

Environment variables in `docker-compose.yml` override `.env` files:

```yaml
services:
  web:
    environment:
      - DATABASE_URL=postgresql://restaurant_user:restaurant_pass@postgres:5432/restaurant_discounts
      - MODEL_SERVER_URL=http://model-server:8000
```

### Adding Dependencies

#### Node.js

```bash
# From host machine
cd apps/web
npm install <package-name>

# Rebuild container to install
docker-compose up --build web
```

#### Python

```bash
# Edit services/model-server/requirements.txt
echo "new-package==1.0.0" >> services/model-server/requirements.txt

# Rebuild container
docker-compose up --build model-server
```

### Code Quality

#### Linting

```bash
# Lint Next.js code
docker-compose exec web npm run lint

# Auto-fix linting issues
docker-compose exec web npm run lint -- --fix
```

#### Type Checking

TypeScript type checks automatically during `next dev`. To manually check:

```bash
docker-compose exec web npx tsc --noEmit
```

## Testing

### Sample Data

The seed script (`apps/web/prisma/seed.mjs`) creates:

#### Restaurants (3)

1. **Sushi House**
   - Slug: `sushi-house`
   - Hours: 11 AM - 10 PM
   - Total Seats: 120
   - Category: Japanese
   - 15 tables (2-10 seat capacity)
   - 25 menu items

2. **Pasta Place**
   - Slug: `pasta-place`
   - Hours: 10 AM - 11 PM
   - Total Seats: 100
   - Category: Italian
   - 12 tables
   - 20 menu items

3. **Sunset Grill**
   - Slug: `sunset-grill`
   - Hours: 8 AM - 11 PM
   - Total Seats: 150
   - Category: American
   - 18 tables
   - 30 menu items

#### Menu Items

Each restaurant has diverse menu with:
- Appetizers (3-5 items)
- Main Courses (10-15 items)
- Desserts (3-5 items)
- Beverages (3-5 items)
- Dietary flags: Vegetarian, Vegan, Gluten-Free
- Set menus flagged with `isSetMenu: true`

#### Admin Accounts (3)

One admin per restaurant with credentials listed in [Getting Started](#4-login-with-sample-accounts).

### Test Scenarios

#### 1. Customer Booking Flow

```bash
# 1. Browse restaurants
curl http://localhost:3000/api/restaurants

# 2. Check capacity for specific time
curl "http://localhost:3000/api/restaurants/1/capacity?date=2025-10-25&hour=18"

# 3. Create account (via UI at /signup)
# Then login to get session cookie

# 4. Create booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": 1,
    "bookingDate": "2025-10-25",
    "bookingTime": 18,
    "partySize": 4,
    "menuItems": [
      { "menuItemId": 1, "quantity": 2 },
      { "menuItemId": 5, "quantity": 2 }
    ]
  }'

# 5. View booking
curl http://localhost:3000/api/bookings/1
```

#### 2. Admin Discount Generation

```bash
# 1. Login as admin (via UI at /admin/login)

# 2. Generate discounts for next 7 days
curl -X POST http://localhost:3000/api/admin/refresh-discounts \
  -H "Cookie: session=ADMIN_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-10-25",
    "days": 7
  }'

# 3. View generated discounts
curl "http://localhost:3000/api/admin/discounts?date=2025-10-25" \
  -H "Cookie: session=ADMIN_SESSION_COOKIE"

# 4. Manually adjust discount
curl -X PUT http://localhost:3000/api/admin/discounts/1 \
  -H "Cookie: session=ADMIN_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "discount": 40,
    "overrideReason": "Special event promotion"
  }'
```

#### 3. Table Sharing

Create multiple bookings for same table/time to test capacity limits:

```bash
# Booking 1: 4 guests on Table 1 (capacity 8)
POST /api/bookings { partySize: 4, tableId: 1, ... }

# Booking 2: 3 guests on Table 1 (should succeed, 7/8 seats used)
POST /api/bookings { partySize: 3, tableId: 1, ... }

# Booking 3: 2 guests on Table 1 (should fail, would exceed capacity)
POST /api/bookings { partySize: 2, tableId: 1, ... }
# Expected: 400 error "Insufficient capacity"
```

#### 4. Menu Lock Enforcement

Test set menu consistency across shared bookings:

```bash
# Booking 1 with set menu (menuItemId: 10, isSetMenu: true)
POST /api/bookings { menuItems: [{ menuItemId: 10, quantity: 2 }], ... }

# Booking 2 on same table/time with different menu
POST /api/bookings { menuItems: [{ menuItemId: 15, quantity: 1 }], ... }
# Expected: 400 error "Menu lock violation"

# Booking 3 with same set menu (should succeed)
POST /api/bookings { menuItems: [{ menuItemId: 10, quantity: 1 }], ... }
```

#### 5. ML Prediction Testing

```bash
# Direct ML service call
curl -X POST http://localhost:8000/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": 1,
    "start_date": "2025-10-25",
    "days_ahead": 7
  }'

# Verify predictions are reasonable:
# - Low demand (0-30%) → High discount (25-30%)
# - High demand (80-100%) → Low discount (0-5%)
```

### Automated Testing

Currently, testing is manual. Planned additions:

- **Unit Tests**: Jest for utilities, business logic
- **Integration Tests**: API endpoint testing with test database
- **E2E Tests**: Playwright for critical user flows
- **Load Tests**: Artillery for capacity stress testing

## Deployment

### Production Considerations

#### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=<production_postgres_url>
MODEL_SERVER_URL=https://ml-service.yourdomain.com
CRON_SECRET=<strong_random_secret>
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<strong_random_secret>
```

#### Database

- Use managed PostgreSQL (AWS RDS, Google Cloud SQL, Heroku Postgres)
- Enable connection pooling (PgBouncer)
- Configure automated backups (daily minimum)
- Set up read replicas for analytics queries

#### Next.js Application

```bash
# Build optimized production bundle
docker-compose exec web npm run build

# Start production server
docker-compose exec web npm start
```

Production optimizations:
- Static page generation where possible
- Image optimization via next/image
- API route caching with ISR (Incremental Static Regeneration)
- CDN for static assets

#### Python ML Service

- Use production ASGI server (Gunicorn + uvicorn workers)
- Enable model caching in memory
- Configure request timeouts (30s recommended)
- Set up health check endpoint for load balancers

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app --bind 0.0.0.0:8000
```

#### Security

- **HTTPS**: Enforce TLS/SSL (Let's Encrypt certificates)
- **CORS**: Configure allowed origins for API
- **Rate Limiting**: Implement per-IP rate limits
- **Session Security**: Use secure, httpOnly, sameSite cookies
- **Input Validation**: Zod schemas on all API inputs
- **SQL Injection**: Prevented by Prisma ORM
- **Password Hashing**: bcrypt with salt rounds ≥ 12

#### Monitoring & Logging

- **Application Logs**: Winston or Pino for structured logging
- **Error Tracking**: Sentry for exception monitoring
- **Performance Monitoring**: New Relic or DataDog
- **Database Metrics**: Query performance, connection pool stats
- **ML Service**: Prediction latency, model version tracking

#### Scaling

- **Horizontal Scaling**: Multiple Next.js instances behind load balancer
- **Database**: Connection pooling, read replicas
- **ML Service**: Deploy multiple instances, consider GPU acceleration for larger models
- **Caching**: Redis for session storage and discount lookup caching

### Deployment Platforms

#### Docker-based Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  web:
    build:
      context: ./apps/web
      target: production
    environment:
      - NODE_ENV=production
    ports:
      - "3000:3000"

  model-server:
    build: ./services/model-server
    environment:
      - ENVIRONMENT=production
    ports:
      - "8000:8000"
```

Deploy to:
- **AWS ECS/Fargate**: Container orchestration
- **Google Cloud Run**: Serverless containers
- **DigitalOcean App Platform**: Managed containers
- **Kubernetes**: Full cluster management (overkill for most use cases)

#### Serverless Deployment

- **Vercel**: Deploy Next.js app directly (best DX)
- **AWS Lambda**: API routes as Lambda functions
- **Python ML Service**: AWS Lambda with container support or SageMaker

## Documentation

### Available Guides

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file - complete project overview |
| [API_ENDPOINTS.md](API_ENDPOINTS.md) | Detailed API reference with request/response examples |
| [DB_SCHEMA.md](DB_SCHEMA.md) | Database schema with ERD diagram and constraints |
| [DOCKER_SETUP.md](DOCKER_SETUP.md) | Docker installation and configuration guide |
| [SETUP.md](SETUP.md) | Manual setup without Docker (local development) |
| [BOOKING_SYSTEM_SUMMARY.md](BOOKING_SYSTEM_SUMMARY.md) | Booking architecture and business logic |
| [TABLE_BOOKING_RULES.md](TABLE_BOOKING_RULES.md) | Table assignment algorithm explanation |
| [TABLE_SHARING_RULES.md](TABLE_SHARING_RULES.md) | Capacity sharing mechanics |
| [CAPACITY_API_GUIDE.md](CAPACITY_API_GUIDE.md) | Availability checking implementation |
| [ADMIN_DASHBOARD_SUMMARY.md](ADMIN_DASHBOARD_SUMMARY.md) | Admin features and workflows |
| [ADMIN_BOOKING_OPERATIONS.md](ADMIN_BOOKING_OPERATIONS.md) | Admin booking management guide |
| [BOOKING_STATUS_BEHAVIOR.md](BOOKING_STATUS_BEHAVIOR.md) | Status lifecycle (BOOKED → COMPLETED/CANCELLED) |

### Code Documentation

- **Inline Comments**: Critical business logic documented
- **Type Definitions**: TypeScript interfaces for all data structures
- **Prisma Schema**: Comprehensive comments in schema.prisma
- **API Routes**: JSDoc comments on route handlers

## Troubleshooting

### Common Issues

#### Port Conflicts

**Symptom**: `Error: bind EADDRINUSE :::3000`

**Solution**: Change port in `docker-compose.yml`:

```yaml
services:
  web:
    ports:
      - "3001:3000"  # External:Internal (change external port)
```

Then access at `http://localhost:3001`.

#### Database Connection Errors

**Symptom**: `PrismaClientInitializationError: Can't reach database server`

**Solutions**:

1. Ensure PostgreSQL is running:
   ```bash
   docker-compose ps
   # Should show postgres with "Up" status
   ```

2. Check DATABASE_URL in environment variables:
   ```bash
   docker-compose exec web printenv DATABASE_URL
   ```

3. Reset database:
   ```bash
   docker-compose down -v
   docker-compose up
   ```

#### Migration Errors

**Symptom**: `Migration engine error: P3009 Migration failed`

**Solution**: Reset migrations (WARNING: deletes data):

```bash
docker-compose exec web npx prisma migrate reset
# Confirm with 'y'
```

#### Python Service Not Starting

**Symptom**: `model-server exited with code 1`

**Solutions**:

1. Check logs for error details:
   ```bash
   docker-compose logs model-server
   ```

2. Verify requirements.txt is valid:
   ```bash
   docker-compose exec model-server pip list
   ```

3. Rebuild container:
   ```bash
   docker-compose up --build model-server
   ```

#### Model Not Found Error

**Symptom**: `FileNotFoundError: [Errno 2] No such file or directory: 'models/sushi-house/model.pkl'`

**Solution**: Ensure model files exist in `services/model-server/models/`. If missing, train models using `train.ipynb` or contact maintainers for pre-trained models.

#### Hot Reload Not Working

**Solutions**:

1. **Next.js**: Clear `.next` cache:
   ```bash
   docker-compose exec web rm -rf .next
   docker-compose restart web
   ```

2. **FastAPI**: Ensure `--reload` flag in uvicorn command:
   ```bash
   # In docker-compose.yml
   command: uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

#### Out of Memory

**Symptom**: Container crashes with exit code 137

**Solution**: Increase Docker Desktop memory allocation:

1. Open Docker Desktop → Settings → Resources
2. Increase Memory to 8GB or higher
3. Click "Apply & Restart"

#### Build Failures

**Symptom**: `ERROR [internal] load metadata for docker.io/library/node:20`

**Solutions**:

1. Clear Docker cache:
   ```bash
   docker-compose down
   docker system prune -a
   docker-compose up --build
   ```

2. Check internet connection and Docker Hub access

### Performance Issues

#### Slow Initial Load

First-time setup is slow (2-5 min) due to:
- Downloading base images (~2GB)
- Installing npm packages (~500MB)
- Installing Python packages (~200MB)
- Running migrations and seeding

**Subsequent starts**: 10-30 seconds.

#### Slow API Responses

1. **Database queries**: Check Prisma query logs:
   ```typescript
   // In apps/web/src/lib/prisma.ts
   const prisma = new PrismaClient({
     log: ['query', 'info', 'warn', 'error']
   })
   ```

2. **Missing indexes**: Verify indexes in schema.prisma match query patterns

3. **ML predictions**: Prediction takes ~100ms; consider caching results

### Getting Help

1. **Check logs**: `docker-compose logs -f` shows all service logs
2. **GitHub Issues**: Report bugs at repository issue tracker
3. **Documentation**: Review guides in [Documentation](#documentation)
4. **Database inspection**: Use `psql` to query database directly

## License

This project is for educational and demonstration purposes. Feel free to use as a learning resource or foundation for your own restaurant management system.

## Contributing

Contributions welcome! Planned improvements:

- [ ] Automated testing suite (Jest, Playwright)
- [ ] Real-time booking updates (WebSockets)
- [ ] Email notifications (booking confirmations, reminders)
- [ ] SMS reminders via Twilio
- [ ] Multi-restaurant group bookings
- [ ] Customer loyalty program integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Weather API integration for better predictions
- [ ] Holiday calendar integration

## Acknowledgments

Built as a demonstration of:
- Full-stack TypeScript development with Next.js 15
- Machine learning integration with Python
- Modern database design with Prisma
- Containerized microservices with Docker
- Complex business logic (capacity management, dynamic pricing)

**Technologies Used**: Next.js, React, TypeScript, PostgreSQL, Prisma, Python, FastAPI, scikit-learn, Docker

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Maintained By**: Restaurant Discounts Team
