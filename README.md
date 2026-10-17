# HRMS — Human Resource Management System

A complete, production-oriented HRMS for small businesses (up to 50 employees) consisting of:
- **Django REST Backend** — centralized business logic, API, auth, database
- **Desktop App** — Electron + React + TypeScript (Windows)
- **Mobile App** — Flutter (Android / iOS)

---

## Quick Start

### Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Python | 3.11 | python.org |
| Node.js | 20 LTS | nodejs.org |
| PostgreSQL | 14+ | postgresql.org |
| Flutter | 3.x | flutter.dev (Phase 2) |
| Git | 2.x | git-scm.com |

---

## Backend Setup

```powershell
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
py -3.11 -m venv venv

# 3. Activate
.\venv\Scripts\Activate.ps1

# 4. Install dependencies
pip install -r requirements.txt

# 5. Copy environment file and configure
copy .env.example .env
# Edit .env with your PostgreSQL credentials and secret key

# 6. Create PostgreSQL database
# In pgAdmin or psql:
#   CREATE DATABASE hrms_dev;
#   CREATE USER hrms_user WITH PASSWORD 'your_password';
#   GRANT ALL PRIVILEGES ON DATABASE hrms_dev TO hrms_user;

# 7. Run migrations
python manage.py migrate

# 8. Create superuser
python manage.py seed_superuser

# 9. Start development server
python manage.py runserver
```

Backend runs at: http://localhost:8000
API docs: http://localhost:8000/api/schema/swagger-ui/
Health check: http://localhost:8000/api/v1/health/

---

## Desktop Setup (Phase 2)

```powershell
cd desktop
npm install
npm run dev          # Development mode
npm run build        # Production build
npm run dist         # Package Windows installer
```

---

## Mobile Setup (Phase 2) — Requires Flutter SDK

```powershell
cd mobile
flutter pub get
flutter run          # Connect Android device or start emulator
flutter build apk    # Release Android APK
```

---

## Running Tests

```powershell
# Backend
cd backend
.\venv\Scripts\Activate.ps1
python manage.py test
# OR with pytest
pytest

# Desktop
cd desktop
npm test

# Mobile
cd mobile
flutter test
```

---

## Environment Variables

See `.env.example` for all required variables.
**Never commit a real `.env` file to source control.**

Key variables:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for dev, `False` for prod |
| `DATABASE_URL` | PostgreSQL connection string |
| `ALLOWED_HOSTS` | Comma-separated hostnames |
| `CORS_ALLOWED_ORIGINS` | Desktop and mobile origins |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | Default: 15 |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Default: 7 |

---

## Project Structure

```
hrms/
├── backend/        # Django REST API
├── desktop/        # Electron desktop app
├── mobile/         # Flutter mobile app
├── docs/           # Architecture, ERD, API docs
├── scripts/        # Developer utility scripts
├── .env.example    # Environment template
├── .gitignore
├── README.md
└── TASKS.md        # Development progress tracker
```

---

## API

Base URL: `http://localhost:8000/api/v1/`
Authentication: Bearer JWT token

See [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) for full endpoint reference.

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and technology decisions |
| [ERD.md](docs/ERD.md) | Database entity relationships |
| [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) | Phased implementation plan |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | REST API reference |
| [SECURITY.md](docs/SECURITY.md) | Security implementation notes |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |
| [TASKS.md](TASKS.md) | Task tracker |

---

## Development Status

Current phase: **Phase 1 — Backend Foundation** 🔄

See [TASKS.md](TASKS.md) for detailed progress.

