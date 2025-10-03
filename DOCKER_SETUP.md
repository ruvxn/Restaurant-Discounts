# Docker Setup Guide (Recommended for Windows)

This is the easiest way to run the project on any platform, especially Windows.

## Prerequisites

- **Docker Desktop** (includes Docker Compose)
  - Windows: https://docs.docker.com/desktop/install/windows-install/
  - macOS: https://docs.docker.com/desktop/install/mac-install/
  - Linux: https://docs.docker.com/desktop/install/linux-install/

## Quick Start (3 Commands)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Restaurant-Discounts

# 2. Start all services (PostgreSQL, Model Server, Next.js)
docker-compose up

# That's it! Wait for services to start...
```

**First time setup:**
- Docker will automatically:
  - Create PostgreSQL database
  - Run migrations
  - Seed sample data
  - Start Next.js dev server
  - Start Python model server

**Access the application:**
- Frontend: http://localhost:3000
- Model Server API: http://localhost:8000/docs
- PostgreSQL: localhost:5432

## Common Commands

```bash
# Start all services
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v

# Rebuild containers (after code changes)
docker-compose up --build

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f web
docker-compose logs -f model-server
docker-compose logs -f postgres

# Run migrations manually
docker-compose exec web npx prisma migrate dev

# Seed database manually
docker-compose exec web npx prisma db seed

# Access PostgreSQL shell
docker-compose exec postgres psql -U restaurant_user -d restaurant_discounts

# Restart a specific service
docker-compose restart web
```

## Development Workflow

**Hot reload is enabled:**
- Changes to Next.js code auto-reload
- Changes to Python code auto-reload
- Database persists between restarts

**Making code changes:**
1. Edit files normally on your host machine
2. Changes sync to containers automatically
3. Services reload automatically

**Database changes:**
1. Edit `apps/web/prisma/schema.prisma`
2. Run: `docker-compose exec web npx prisma migrate dev --name your_migration_name`
3. Prisma will create and apply migration

## Troubleshooting

### Port already in use
If ports 3000, 8000, or 5432 are already taken:

Edit `docker-compose.yml` and change the port mappings:
```yaml
ports:
  - "3001:3000"  # Change 3001 to any available port
```

### Services won't start
```bash
# Check status
docker-compose ps

# View detailed logs
docker-compose logs

# Rebuild everything
docker-compose down -v
docker-compose up --build
```

### Reset everything
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Restart from scratch
docker-compose up --build
```

### Database connection errors
The web service waits for PostgreSQL to be healthy before starting. If you see connection errors:
```bash
# Check PostgreSQL health
docker-compose exec postgres pg_isready -U restaurant_user

# Restart web service
docker-compose restart web
```

## Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml up --build

# Or build individual services
docker build -t restaurant-web ./apps/web
docker build -t restaurant-model-server ./services/model-server
```

## Why Docker?

✅ **No PostgreSQL installation needed** - Runs in container
✅ **No Python virtual environment needed** - Isolated in container
✅ **Identical setup on Windows/Mac/Linux** - Works everywhere
✅ **One command to start everything** - `docker-compose up`
✅ **Easy cleanup** - `docker-compose down -v`
✅ **Team consistency** - Everyone has same environment
