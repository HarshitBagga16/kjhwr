# WindSight — Day-Ahead Wind Intelligence Platform

[![CI Pipeline](https://github.com/wind-intel/windsight/actions/workflows/ci.yml/badge.svg)](https://github.com/wind-intel/windsight/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql)](https://www.postgresql.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4.svg?logo=tailwindcss)](https://tailwindcss.com)

A production-grade UK wind generation forecast intelligence and point-in-time accuracy verification platform built for power trading and dispatch desks. Designed for the day-ahead procurement operations of a UK electricity utility.

---

## Table of Contents
1. [Product Overview & Business Problem](#1-product-overview--business-problem)
2. [Point-in-Time Forecast Methodology](#2-point-in-time-forecast-methodology)
3. [Accuracy Metrics Definitions](#3-accuracy-metrics-definitions)
4. [Architecture & System Design](#4-architecture--system-design)
5. [Technology Stack](#5-technology-stack)
6. [Repository Structure](#6-repository-structure)
7. [Data Sources & Time Windows](#7-data-sources--time-windows)
8. [Data Quality Assumptions & Limitations](#8-data-quality-assumptions--limitations)
9. [Local Setup & Docker Instructions](#9-local-setup--docker-instructions)
10. [Database Migrations & Data Ingestion](#10-database-migrations--data-ingestion)
11. [Environment Variables](#11-environment-variables)
12. [API Documentation](#12-api-documentation)
13. [Test Execution & Verification Results](#13-test-execution--verification-results)
14. [Deployment Guide](#14-deployment-guide)
15. [AI Tool Usage Disclosure](#15-ai-tool-usage-disclosure)
16. [Known Limitations & Future Roadmap](#16-known-limitations--future-roadmap)
17. [10-Minute Video Demonstration Outline](#17-10-minute-video-demonstration-outline)

---

## 1. Product Overview & Business Problem

### The Business Context
In the UK electricity market (Great Britain National Electricity Transmission System), energy suppliers and utilities must balance power demand with generation. Electricity cannot be stored economically in vast quantities at grid scale, so purchase decisions must be locked in advance on wholesale day-ahead auctions (e.g., EPEX SPOT, Nord Pool UK).

Wind generation in the UK is weather-dependent and volatile. To meet consumer demand, utility dispatchers must procure thermal, hydro, or imported power for the net deficit:
$$\text{Procurement Target} = \text{Consumer Demand} - \text{Renewable Generation}$$

When day-ahead wind forecasts are inaccurate:
- **Overforecasting wind** leaves the utility short, forcing emergency purchases in the Balancing Mechanism at penal cash-out prices.
- **Underforecasting wind** causes over-procurement, incurring unnecessary hedging commitments and selling excess power at distress imbalance discounts.

### What WindSight Solves
WindSight provides the energy desk with:
1. **Point-in-Time Traceability**: Reconstructs the exact forecast vintage available at the decision cutoff (e.g., 09:00 Europe/London) to prevent evaluation bias using future information.
2. **Quantitative Benchmarking**: Systematically quantifies MAE, RMSE, signed bias, and WAPE across January 2026 delivery intervals.
3. **Diurnal & Fleet Profiling**: Identifies systematic daily and hourly error tendencies across the GB generation fleet.
4. **Data Coverage & Integrity Audit**: Explicitly tracks missing intervals, reporting sample sizes beside every aggregate metric.

> **Trading Desk Limitation Notice**: WindSight strictly isolates wind outturn and forecasts. The platform does not incorporate system demand, imbalance cash-out prices, or financial trading losses because Elexon outturn feeds do not furnish procurement volumes.

---

## 2. Point-in-Time Forecast Methodology

The cornerstone of WindSight is **Point-in-Time (PIT) Forecast Selection**:

```
Forecast Vintages Published for Delivery Interval [T]
           Vintage A                  Vintage B           [Decision Cutoff]        Vintage C (Future)
               |                          |                       |                        |
------o--------+--------------------------+-----------------------+------------------------+--------> Time
   2026-01-14 18:00            2026-01-15 07:30           2026-01-15 09:00          2026-01-15 11:30
                                      ▲
                           [SELECTED ACTIVE VINTAGE]
```

### Selection Rules:
1. **Timezone Awareness**: The operational cutoff is defined in the `Europe/London` timezone (default `09:00 Europe/London`) and converted to UTC for database comparison.
2. **Eligibility Filter**: For delivery interval starting at $T_{\text{start}}$, all forecast records with $\text{publishTime} \le T_{\text{cutoff}}$ are eligible. Forecasts with $\text{publishTime} > T_{\text{cutoff}}$ are strictly excluded as *future information*.
3. **Latest Information Principle**: From all eligible vintages, WindSight selects the record with $\max(\text{publishTime})$, representing the most refined forecast available when the trader submitted day-ahead orders.
4. **Immutability**: All historical vintages are permanently stored in PostgreSQL without overwriting.
5. **Configurability**: The operational cutoff hour is configurable (`09:00` by default), enabling desks to simulate 10:00, 11:00 or custom gate closures.

### Resolution Alignment:
- **Forecasts (`WINDFOR`)**: Published at **1-hour** delivery resolution.
- **Actuals (`FUELHH`)**: Published at **30-minute** settlement resolution.
- **Alignment Strategy**: Each hourly interval $[H:00, H+1:00)$ is matched by computing the arithmetic mean of the two half-hourly actual outturns ($H:00$ and $H:30$):
$$\text{Actual}_{H} = \frac{\text{Actual}_{H:00} + \text{Actual}_{H:30}}{2}$$
If only one half-hour is recorded, that value is used; if neither is recorded, the interval is marked `missing_actual`.

---

## 3. Accuracy Metrics Definitions

All metrics are evaluated exclusively on valid, matched observations where both forecast and actual exist ($n = \text{matched intervals}$).

| Metric | Mathematical Formula | Units | Desk Interpretation |
|---|---|---|---|
| **Signed Error** | $e_i = \hat{y}_i - y_i$ | MW | Positive = Overforecast; Negative = Underforecast |
| **Absolute Error** | $\|e_i\| = \|\hat{y}_i - y_i\|$ | MW | Non-negative magnitude of forecast deviation |
| **Mean Absolute Error (MAE)** | $\frac{1}{n}\sum_{i=1}^n \|\hat{y}_i - y_i\|$ | MW | Average expected discrepancy in MW output |
| **Root Mean Squared Error (RMSE)**| $\sqrt{\frac{1}{n}\sum_{i=1}^n (\hat{y}_i - y_i)^2}$ | MW | Penalizes large outlier forecast errors heavily |
| **Mean Bias** | $\frac{1}{n}\sum_{i=1}^n (\hat{y}_i - y_i)$ | MW | Systematic over/under-generation skewness |
| **Weighted Absolute Percentage Error (WAPE)** | $\frac{\sum_{i=1}^n \|\hat{y}_i - y_i\|}{\sum_{i=1}^n y_i} \times 100\%$ | % | Volume-weighted error percentage relative to total fleet outturn |
| **Mean Absolute Percentage Error (MAPE)** | $\frac{1}{n}\sum_{i=1}^n \frac{\|\hat{y}_i - y_i\|}{y_i} \times 100\%$ | % | Explicitly omitted when $y_i \le 0.001\text{ MW}$ to avoid division by zero |

---

## 4. Architecture & System Design

```mermaid
flowchart TB
    subgraph DataSources["External Data Feeds (Elexon BMRS)"]
        FUELHH["GET /datasets/FUELHH/stream\n(Actual Outturn by Fuel)"]
        WINDFOR["GET /datasets/WINDFOR/stream\n(Wind Forecast Vintages)"]
    end

    subgraph BackendCore["FastAPI Backend (Modular Monolith)"]
        EClient["ElexonClient\n(HTTPX + Retries + Backoff)"]
        IngestService["IngestionService\n(Chunked Idempotent Upserts)"]
        AlignService["AlignmentService\n(Point-in-Time Selection)"]
        MetricService["MetricsService\n(MAE, RMSE, Bias, WAPE)"]
        
        subgraph API["FastAPI Route Handlers"]
            R_Dash["/api/dashboard"]
            R_Fore["/api/forecasts"]
            R_Anal["/api/analytics"]
            R_Adm["/api/admin"]
            R_Hlt["/api/health"]
        end
    end

    subgraph Storage["Persistence Layer (PostgreSQL)"]
        T_Actual["actual_generation\n(Unique: start_time, fuel_type)"]
        T_Fore["wind_forecasts\n(Unique: start_time, publish_time)"]
        T_Runs["ingestion_runs\n(Audit trail & Status)"]
    end

    subgraph FrontendApp["React 18 TypeScript Frontend (Vite)"]
        F_Dash["Dashboard View\n(KPIs, Line Chart, Error Bars)"]
        F_Insp["Forecast Inspector\n(Hourly Table, Vintage Modal)"]
        F_Anal["Accuracy Analytics\n(Daily Trends, 24h Profile, Histogram)"]
        F_Expl["Data Explorer\n(Sortable Table, CSV Export)"]
    end

    FUELHH --> EClient
    WINDFOR --> EClient
    EClient --> IngestService
    IngestService --> Storage
    Storage --> AlignService
    AlignService --> MetricService
    MetricService --> API
    API --> FrontendApp
```

---

## 5. Technology Stack

### Backend
- **Python**: 3.11 / 3.12
- **Framework**: FastAPI 0.115 + Pydantic v2
- **Database & ORM**: PostgreSQL 16, SQLAlchemy 2.0.36, Alembic 1.14.1
- **Numerical Processing**: NumPy 2.2.1, Pandas 2.2.3
- **HTTP Client**: HTTPX 0.28.1 (with connection pooling and bounded backoff)
- **Timezone**: `zoneinfo` (`Europe/London`), `pytz`, `python-dateutil`
- **Quality & Testing**: Pytest 8.3, pytest-httpx, Ruff 0.8.6

### Frontend
- **Framework**: React 18.3, TypeScript 5.5, Vite 5.4
- **Routing**: React Router v6
- **Styling**: Tailwind CSS v4, Inter & JetBrains Mono typography
- **Data Visualizations**: Recharts 2.15 (Forecast vs Actual, Error bars, Diurnal 24h, Scatter, Histogram)
- **Quality & Testing**: Vitest 1.6, React Testing Library, JSDOM

### Infrastructure
- **Containerization**: Docker, Docker Compose (multi-stage builds, non-root users)
- **CI/CD**: GitHub Actions (linting, type checking, PostgreSQL test suite)
- **Reverse Proxy**: Nginx 1.25 Alpine

---

## 6. Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI matrix
├── backend/
│   ├── alembic/                 # Database migration scripts
│   │   ├── env.py
│   │   └── versions/
│   │       └── 0001_initial_tables.py
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/          # REST endpoints
│   │   │       ├── admin.py     # Protected ingestion trigger
│   │   │       ├── analytics.py  # Summaries, error series, diurnal, CSV
│   │   │       ├── dashboard.py  # Main desk overview
│   │   │       └── forecasts.py  # Hourly audit & vintage history
│   │   ├── clients/
│   │   │   └── elexon_client.py # Robust BMRS API client
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic BaseSettings
│   │   │   └── logging.py       # JSON structured logging
│   │   ├── db/
│   │   │   ├── models.py        # SQLAlchemy Declarative Models
│   │   │   └── session.py       # Engine & SessionLocal
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── alignment_service.py # Core PIT alignment logic
│   │   │   ├── ingestion_service.py # Batch ingestion orchestrator
│   │   │   └── metrics_service.py   # Statistical KPI calculations
│   │   └── main.py              # FastAPI app lifecycle
│   ├── scripts/
│   │   ├── ingest_historical.py # CLI for live Elexon ingestion
│   │   └── seed_demo_data.py    # Explicitly labelled demo seeder
│   ├── tests/                   # 22 comprehensive unit tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.ts        # Typed fetch client
│   │   ├── components/
│   │   │   ├── charts/          # Recharts components (6 custom charts)
│   │   │   ├── layout/          # Top nav & footer
│   │   │   └── ui/              # KpiCard, DateSelector, StatusBadge
│   │   ├── features/
│   │   │   ├── analytics/       # 5-tab analytical deep dive
│   │   │   ├── dashboard/       # Executive desk overview
│   │   │   ├── data-explorer/   # Paginated observation table
│   │   │   └── forecasts/       # Hourly inspector & vintage dialog
│   │   ├── hooks/useApi.ts      # Reactive state hook
│   │   ├── types/index.ts       # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml           # Full-stack composition
├── .env.example                 # Configuration template
├── .gitignore
└── README.md
```

---

## 7. Data Sources & Time Windows

WindSight utilizes exclusively official, open Elexon BMRS streams:

| Dataset | Stream Endpoint | Settlement / Publish Cadence | Filtering Applied |
|---|---|---|---|
| **FUELHH** (Actuals) | `/datasets/FUELHH/stream` | Half-hourly (30 min) | Filtered strictly for `fuelType == "WIND"` |
| **WINDFOR** (Forecasts) | `/datasets/WINDFOR/stream` | Hourly forecasts with multi-vintage updates | Queried over publication window |

- **In-Scope Period**: January 1, 2026 00:00 UTC through January 31, 2026 23:59 UTC (744 hourly delivery intervals).
- **Authentication**: Neither endpoint requires an API token; requests are rate-limited via exponential backoff (2s, 4s, 8s).

---

## 8. Data Quality Assumptions & Limitations

1. **Resolution Reconciliation**: Elexon publishes half-hourly outturn against hourly forecasts. Our pipeline computes the mathematical mean of each half-hour pair without interpolating fabricated timestamps.
2. **Missing Actuals**: If grid telemetry drops an interval, it is explicitly classified as `missing_actual` rather than defaulting to 0 MW.
3. **No External Covariates**: In strict accordance with client requirements, no weather forecasts, thermal power dispatch, or spot prices are ingested.
4. **Demonstration Mode**: For local exploration without a live internet connection, a dedicated synthetic seeding script is provided. All synthetic data is auditable and tagged as `DEMO_SYNTHETIC`.

---

## 9. Local Setup & Docker Instructions

### Prerequisites
- Docker Engine 24+ & Docker Compose v2+
- *Or* Python 3.11+ and Node.js 20+

### Option A: Complete Docker Compose (Recommended)

1. Clone the repository and configure the environment:
   ```bash
   cp .env.example .env
   ```
2. Build and launch the stack:
   ```bash
   docker compose up --build -d
   ```
3. The services will be available at:
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **PostgreSQL**: `localhost:5432` (`windsight` / `windsight`)

### Option B: Local Development Setup

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python -m scripts.seed_demo_data  # Or python -m scripts.ingest_historical
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Accessible at http://localhost:5173
```

---

## 10. Database Migrations & Data Ingestion

### Running Migrations
Alembic manages schema evolution:
```bash
cd backend
alembic upgrade head
```

### Ingesting Live January 2026 Elexon Records
To pull authentic live records directly from Elexon BMRS:
```bash
cd backend
python -m scripts.ingest_historical --date-from 2026-01-01 --date-to 2026-01-31
```

### Protected Admin Ingestion Endpoint
You can also trigger date-bounded ingestion via authenticated HTTP POST:
```bash
curl -X POST http://localhost:8000/api/admin/ingest \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: dev-admin-key" \
  -d '{"date_from": "2026-01-01", "date_to": "2026-01-07"}'
```

---

## 11. Environment Variables

| Variable | Description | Default | Scope |
|---|---|---|---|
| `WINDSIGHT_DATABASE_URL` | PostgreSQL connection string | `postgresql://windsight:windsight@localhost:5432/windsight` | Backend |
| `WINDSIGHT_ELEXON_BASE_URL` | Elexon BMRS API v1 endpoint | `https://data.elexon.co.uk/bmrs/api/v1` | Backend |
| `WINDSIGHT_ELEXON_TIMEOUT` | Request timeout in seconds | `30` | Backend |
| `WINDSIGHT_ELEXON_MAX_RETRIES` | Max retries for failed requests | `3` | Backend |
| `WINDSIGHT_DECISION_CUTOFF_HOUR` | Operational cutoff (Europe/London) | `9` (09:00 AM) | Backend |
| `WINDSIGHT_ADMIN_API_KEY` | Secret key for `/api/admin/*` | `dev-admin-key` | Backend |
| `WINDSIGHT_LOG_LEVEL` | Log verbosity | `INFO` | Backend |
| `VITE_API_URL` | Target backend URL for frontend | `http://localhost:8000` | Frontend |

---

## 12. API Documentation

Interactive OpenAPI documentation is generated automatically by FastAPI:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service liveness and PostgreSQL connection check |
| `GET` | `/api/dashboard?date=2026-01-15` | Single-day KPI metrics, time-series, and data coverage |
| `GET` | `/api/forecasts?date=2026-01-15` | All 24 hourly aligned intervals for the given date |
| `GET` | `/api/forecasts/{start_time}/history` | Historical vintages for a delivery interval, identifying the chosen vintage |
| `GET` | `/api/analytics/summary?from=2026-01-01&to=2026-01-31` | Aggregate MAE, RMSE, bias, WAPE, and coverage |
| `GET` | `/api/analytics/errors?from=2026-01-01&to=2026-01-31` | Hourly error series for distribution and box plots |
| `GET` | `/api/analytics/hourly-profile` | 24-hour diurnal profile of average error by hour of day |
| `GET` | `/api/analytics/daily` | Day-by-day MAE and bias trends across date range |
| `GET` | `/api/analytics/observations` | Paginated observation table with status filter |
| `GET` | `/api/analytics/export?from=...&to=...` | Streamed CSV download of aligned observations |
| `POST`| `/api/admin/ingest` | Protected endpoint to trigger background ingestion |

---

## 13. Test Execution & Verification Results

### Backend Test Suite (Pytest)
Command executed:
```bash
python -m pytest tests -v
```
**Results: 22 passed in 4.33s (100% pass rate)**

```
tests/test_alignment.py::test_get_decision_cutoff PASSED
tests/test_alignment.py::test_select_latest_eligible_forecast PASSED
tests/test_alignment.py::test_select_latest_eligible_forecast_none_eligible PASSED
tests/test_alignment.py::test_build_aligned_observations_averages_half_hourly_actuals PASSED
tests/test_alignment.py::test_error_sign_convention_overforecasting PASSED
tests/test_alignment.py::test_error_sign_convention_underforecasting PASSED
tests/test_alignment.py::test_missing_data_status_flags PASSED
tests/test_api.py::test_health_endpoint PASSED
tests/test_api.py::test_dashboard_endpoint_empty PASSED
tests/test_api.py::test_dashboard_endpoint_with_data PASSED
tests/test_api.py::test_forecast_history_endpoint PASSED
tests/test_api.py::test_analytics_endpoints PASSED
tests/test_api.py::test_paginated_observations_endpoint PASSED
tests/test_api.py::test_admin_ingest_auth_protection PASSED
tests/test_elexon_client.py::test_fetch_actual_generation_filters_wind PASSED
tests/test_elexon_client.py::test_fetch_wind_forecasts PASSED
tests/test_elexon_client.py::test_elexon_client_retries_and_succeeds PASSED
tests/test_elexon_client.py::test_elexon_client_exhausts_retries PASSED
tests/test_metrics.py::test_calculate_metrics_standard PASSED
tests/test_metrics.py::test_calculate_metrics_zero_actual_mape_handling PASSED
tests/test_metrics.py::test_calculate_daily_metrics PASSED
tests/test_metrics.py::test_calculate_hourly_profile PASSED
```

### Python Linting & Formatting (Ruff)
```bash
python -m ruff check .
python -m ruff format --check .
```
**Results: All checks passed! 32 files formatted.**

### Frontend Test Suite (Vitest)
```bash
npm run test:run
```
**Results: 2 test suites, 7 tests passed (100% pass rate)**

### Frontend Type Checking & Build
```bash
npx tsc --noEmit
npm run build
```
**Results: TypeScript check: 0 errors; Vite production bundle built successfully (dist/index.html, dist/assets/).**

---

## 14. Deployment Guide

### Vercel Deployment (Frontend)
1. Fork or push repository to GitHub.
2. In Vercel, import the `frontend` folder as root directory.
3. Configure Environment Variables:
   - `VITE_API_URL`: `https://your-backend-api.onrender.com`
4. Build settings: Framework Preset: `Vite`, Build Command: `npm run build`, Output Directory: `dist`.

### Render Deployment (Backend & Database)
1. In Render, create a new **PostgreSQL Managed Instance**:
   - Name: `windsight-db`, Database: `windsight`, User: `windsight`.
2. Create a new **Web Service**:
   - Environment: `Python 3`, Root Directory: `backend`.
   - Build Command: `pip install -r requirements.txt && alembic upgrade head`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add Environment Variables:
     - `WINDSIGHT_DATABASE_URL`: Internal Connection String from PostgreSQL instance
     - `WINDSIGHT_CORS_ORIGINS`: `["https://your-frontend.vercel.app"]`
     - `WINDSIGHT_ADMIN_API_KEY`: Strong random secret

---

## 15. AI Tool Usage Disclosure

In compliance with technical assessment guidelines:
- **AI Tool Used**: Claude Opus 4.6 and Gemini 3.8 Flash via Google Antigravity.
- **Assisted Areas**:
  1. API documentation inspection and query parameter discovery for Elexon BMRS `FUELHH` and `WINDFOR` streams.
  2. Synthesizing the mathematical specification for point-in-time forecast selection and zero-actual MAPE edge cases.
  3. Generating boilerplate unit test fixtures for mock HTTPX responses and SQLAlchemy database sessions.
  4. Authoring Tailwind CSS layout scaffolding and Recharts visual components.

---

## 16. Known Limitations & Future Roadmap

1. **Intraday Gate Closure Modeling**: The platform currently models day-ahead decision cutoffs. Expanding to 1-hour ahead continuous rolling gate closure would benefit intraday trading desks.
2. **Spatial / Zonal De-aggregation**: GB National Grid operates with Scottish transmission export constraints (B6 boundary). Incorporating zonal BMU-level outturn would allow transmission constraint forecasting.
3. **Automated Cron Ingestion**: Implementing a periodic GitHub Action or Celery-free daemon to poll Elexon every 30 minutes for near-real-time outturn updates.

---

## 17. 10-Minute Video Demonstration Outline

### Part 1: Customer & Commercial Overview (Max 5 minutes)
- **00:00 - 01:00**: *The Day-Ahead Procurement Problem*: Introduce the UK wholesale electricity market, the utility's exposure to wind volatility, and the financial risk of over/under-hedging.
- **01:00 - 02:30**: *The Operational Dashboard*: Walk through the January 15, 2026 date view. Highlight the 09:00 London Cutoff selector, the 5 core KPI cards (MAE, RMSE, Bias, WAPE, Coverage), and the generation profile chart.
- **02:30 - 03:45**: *Forecast Vintage Inspection*: Select a delivery hour (e.g. 14:00) with substantial forecast deviation. Open the Vintage Evolution dialog to show how forecasts changed over time and prove why the pre-cutoff forecast was selected.
- **03:45 - 04:30**: *Accuracy Analytics Deep Dive*: Review the 24-hour diurnal profile showing systematic evening underforecasting and the error distribution histogram.
- **04:30 - 05:00**: *Data Explorer & CSV Export*: Demonstrate filtering, sorting, and exporting audit data for regulatory reporting.

### Part 2: Technical Lead & Architectural Review (Max 5 minutes)
- **05:00 - 06:15**: *Point-in-Time Logic & Temporal Integrity*: Deep dive into `alignment_service.py`. Explain Europe/London timezone handling, filtering `publish_time <= cutoff`, selecting `max(publish_time)`, and mathematical pairing of half-hourly actuals to hourly forecasts.
- **06:15 - 07:15**: *Backend Architecture & Resilience*: Review FastAPI modular monolith design, Alembic database migrations, composite unique indices preventing duplicates, and `ElexonClient` exponential backoff retries.
- **07:15 - 08:15**: *Frontend Architecture & Clean State*: Review React 18 TypeScript structure, Recharts integration, separation of concerns, and defensive handling of loading/empty/error states.
- **08:15 - 09:15**: *Testing & Observability*: Present the test suites (22 backend unit tests covering edge cases like zero-actual MAPE exclusion; 7 frontend RTL tests; Ruff linting; GitHub Actions CI).
- **09:15 - 10:00**: *Deployment, Containerization & Summary*: Review Docker Compose configuration, production multi-stage builds, and deployment readiness on Vercel/Render.
