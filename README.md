# UK Wind Forecast Intelligence Platform (WindSight)

## 1. Application Links

* **Live Web Application (Vercel):** [https://uk-windforecast.vercel.app/diurnal](https://uk-windforecast.vercel.app/diurnal)
* **Backend API (Render):** [https://windsight-backend-fuwb.onrender.com](https://windsight-backend-fuwb.onrender.com)
* **API Documentation (Swagger UI):** [https://windsight-backend-fuwb.onrender.com/docs](https://windsight-backend-fuwb.onrender.com/docs)
* **Public GitHub Repository:** [https://github.com/HarshitBagga16/kjhwr](https://github.com/HarshitBagga16/kjhwr)

---

## 2. Details of Files and Directories Present

```text
.
├── docker-compose.yml            # Docker Compose orchestration for frontend, backend & database
├── Dockerfile                    # Container build configuration for frontend Nginx image
├── nginx.conf                    # Nginx reverse proxy, caching, compression & security header config
├── Procfile                      # Heroku deployment process definition for the Python backend
├── render.yaml                   # Render Blueprint infrastructure-as-code deployment configuration
├── vercel.json                   # Root Vercel SPA routing and build configuration
│
├── backend/                      # Python FastAPI Backend Service
│   ├── alembic.ini               # Database migration tool configuration
│   ├── Dockerfile                # Docker container build definition for the FastAPI backend
│   ├── requirements.txt          # Pinned Python package dependencies
│   ├── windsight.db              # SQLite database pre-populated with January 2026 Elexon data
│   │
│   ├── alembic/                  # Database schema migration scripts
│   │   ├── env.py                # Alembic environment and SQLAlchemy model binding
│   │   ├── script.py.mako        # Migration file template
│   │   └── versions/
│   │       └── 0001_initial_tables.py # Initial database schema creation script
│   │
│   ├── app/                      # Application source code
│   │   ├── main.py               # FastAPI entrypoint, lifespan startup/seed, CORS, and routing
│   │   │
│   │   ├── api/
│   │   │   └── routes/           # HTTP API endpoint controllers
│   │   │       ├── admin.py      # On-demand data ingestion trigger and sync audit status
│   │   │       ├── analytics.py  # Summary statistics, diurnal curve, daily metrics & CSV export
│   │   │       ├── contact.py    # In-app trading desk contact inquiry submission
│   │   │       ├── dashboard.py  # Daily dispatch ledger and hourly aligned forecast/actuals
│   │   │       └── forecasts.py  # Historical forecast vintage audit trail by delivery interval
│   │   │
│   │   ├── clients/
│   │   │   └── elexon_client.py  # Elexon BMRS API client with exponential backoff & circuit breaker
│   │   │
│   │   ├── core/
│   │   │   ├── config.py         # App configuration & environment variables via Pydantic BaseSettings
│   │   │   ├── logging.py        # Structured JSON logging configuration
│   │   │   └── middleware.py     # Sliding-window rate limiter (120 req/min) & HTTP cache-headers
│   │   │
│   │   ├── db/
│   │   │   ├── models.py         # SQLAlchemy ORM models (ActualGeneration, WindForecast, IngestionRun)
│   │   │   └── session.py        # Database engine creation, connection pooling & get_db dependency
│   │   │
│   │   ├── schemas/              # Pydantic v2 data validation schemas (DTOs)
│   │   │   ├── analytics.py      # Request/response schemas for summary KPIs, diurnal & pagination
│   │   │   └── forecast.py       # Request/response schemas for dashboard, time-series & vintages
│   │   │
│   │   └── services/             # Core business logic and mathematical processing
│   │       ├── alignment_service.py # Point-in-time forecast selection & 30m-to-1h actuals alignment
│   │       ├── ingestion_service.py # Raw data ingestion, validation & idempotent database upserts
│   │       └── metrics_service.py   # Statistical accuracy metrics calculation (MAE, RMSE, Bias, WAPE)
│   │
│   ├── scripts/
│   │   └── seed_demo_data.py     # Database seeder for January 2026 demonstration records
│   │
│   └── tests/                    # Automated Pytest test suite (22 unit & integration tests)
│       ├── test_alignment.py     # Tests for gate closure cutoffs, lookahead prevention & averaging
│       ├── test_api.py           # Tests for all API routes, status codes, auth & CSV exports
│       ├── test_elexon_client.py # Tests for API retries, circuit breaker tripping & parsing
│       └── test_metrics.py       # Tests for MAE, RMSE, signed bias, and zero-actual MAPE handling
│
└── frontend/                     # React 18 & TypeScript Frontend Application (Vite)
    ├── package.json              # Frontend dependencies and npm scripts
    ├── tsconfig.json             # TypeScript compiler configuration
    ├── vite.config.ts            # Vite bundler, build plugins & test configuration
    ├── vercel.json               # Frontend-specific Vercel SPA routing rewrite configuration
    ├── index.html                # HTML entrypoint with SEO meta tags, OpenGraph & JSON-LD schema
    │
    ├── public/                   # Static web assets
    │   ├── robots.txt            # Search engine crawler permissions
    │   ├── sitemap.xml           # XML sitemap for route discovery
    │   └── og-image.svg          # OpenGraph social share card image
    │
    └── src/
        ├── App.tsx               # Main UI application, router, ErrorBoundary & kinetic turbine
        ├── main.tsx              # React DOM mounting entrypoint
        ├── index.css             # Tailwind CSS styles and custom teletype/farm keyframe animations
        ├── vite-env.d.ts         # Vite client type declarations
        │
        ├── api/
        │   └── client.ts         # Frontend API HTTP client and endpoint fetch functions
        │
        ├── components/
        │   ├── FarmBackground.tsx # Full-viewport animated farm landscape in 60° top-down perspective
        │   ├── charts/           # SVG visualization components (diurnal profile, daily trends)
        │   ├── layout/           # Shared page layout wrappers
        │   └── ui/               # Reusable UI controls (KPI cards, status badges, date selector)
        │
        ├── features/             # Sub-views (dashboard, vintage inspector, analytics, data explorer)
        ├── hooks/                # Custom React data-fetching hooks (useApi)
        ├── types/                # TypeScript interfaces matching backend API schemas
        └── test/                 # Vitest test suite for frontend UI components
```

---

## 3. How to Start the Application

### Option A: Local Development (Without Docker)

#### 1. Start the Backend
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate       # On Linux/macOS
.\venv\Scripts\Activate.ps1    # On Windows PowerShell

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server with hot-reload
python -m uvicorn app.main:app --reload --port 8000
```
* Backend runs at: `http://localhost:8000`
* Interactive API Docs (Swagger): `http://localhost:8000/docs`

#### 2. Start the Frontend
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start Vite development server
npm run dev
```
* Frontend runs at: `http://localhost:5173`

---

### Option B: Docker Compose (Single Command)

To run the complete platform (frontend, backend, database, and reverse proxy) using Docker:

```bash
docker compose up --build
```
* Web Application: `http://localhost`
* Backend API: `http://localhost:8000`
* API Documentation: `http://localhost:8000/docs`

---

### Running Automated Tests

#### Backend Test Suite (Pytest - 22 Tests)
```bash
cd backend
python -m pytest
```

#### Frontend Test Suite (Vitest - 7 Tests)
```bash
cd frontend
npm run test:run
```

---

## 4. AI Tool Usage Disclosure

In compliance with the assignment guidelines, AI tools (Google DeepMind Antigravity / Claude / Cursor) were used as pair-programming assistants during the development of this project for scaffolding boilerplate, refining numerical formulas, and generating test fixtures. All business logic, time-series alignment, and architectural decisions were verified and reviewed.
