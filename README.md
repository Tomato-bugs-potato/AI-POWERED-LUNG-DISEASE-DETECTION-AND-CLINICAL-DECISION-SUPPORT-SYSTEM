# 🫁 AI-Powered Lung Disease Detection & Clinical Decision Support System

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io)

**An enterprise-grade, full-stack clinical decision support system** that leverages a multi-model AI ensemble (YOLOv12m + EfficientNet-B0 + Lungmask) for automated chest X-ray analysis, disease classification, and structured PDF report generation — built for real-world radiology workflows.

---

## Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Environment Variables](#-environment-variables)
- [License](#-license)

---

## ✨ Features

### 🤖 AI Inference Pipeline

- **Multi-model ensemble** — YOLOv12m object detection + EfficientNet-B0 classification + Lungmask U-Net segmentation
- **15-class lung disease detection** — including Pneumonia, Tuberculosis, Cardiomegaly, Effusion, and more
- **Confidence scoring** with per-prediction probability distributions
- **Grad-CAM heatmap visualization** for model interpretability
- Deployed on **Hugging Face Spaces** with Docker SDK

### 🏥 Clinical Workflow

- **Patient management** — registration, demographics, medical history tracking
- **Case lifecycle** — upload X-rays → AI inference → radiologist review → doctor diagnosis → PDF report
- **Rich-text diagnosis editor** (TipTap) with treatment recommendations
- **Interactive X-ray annotator** (Konva.js canvas) for radiologist markup
- **Automated PDF report generation** via Celery + WeasyPrint/ReportLab
- **CSV export** for external medical records integration

### 🔐 Security & Compliance

- **Role-Based Access Control (RBAC)** — Doctor, Radiologist, Lab Technician, Admin
- **JWT authentication** with short-lived access + long-lived refresh tokens
- **Two-Factor Authentication (OTP)** via email
- **AES-256-GCM field-level encryption** for sensitive patient data (PII)
- **Full audit logging** — every action (login, upload, diagnosis, report download) is tracked
- **Argon2 password hashing**

### 📊 Operations & Observability

- **Prometheus metrics** with `prometheus-fastapi-instrumentator`
- **Structured JSON logging** via `structlog`
- **Automated database backups** (pg_dump → MinIO/S3) with configurable retention
- **PostgreSQL master-replica** streaming replication
- **Celery Beat** scheduled tasks (backups, cleanup)
- **Health checks** for all services (API, DB, Redis, MinIO)

### 🌐 Frontend Dashboard

- **Next.js 16** with React 19 and App Router
- **Radix UI + TailwindCSS 4** component system (shadcn/ui)
- **Dark/Light theme** support via `next-themes`
- **Internationalization (i18n)** with `next-intl` (English + Amharic)
- **Recharts** analytics dashboards
- **Real-time status polling** for async report generation
- **PDF viewer** with `react-pdf` for in-browser report viewing

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client (Browser)                           │
│               Next.js 16 · React 19 · Radix UI                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Nginx Reverse Proxy                         │
│                (TLS termination · rate limiting)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               FastAPI Application (api)                         │
│   Auth · Patients · Cases · Images · Inference · Diagnoses      │
│   Radiologist Reviews · Reports · Users · Audit Logs · Health   │
├─────────────────┬───────────────────┬───────────────────────────┤
│   SQLAlchemy    │      Redis        │       MinIO / S3          │
│   (asyncpg)     │ (cache · broker)  │  (images · reports ·      │
│                 │                   │   avatars · backups)      │
└────────┬────────┴─────────┬─────────┴───────────────────────────┘
         │                  │
         ▼                  ▼
┌────────────────┐  ┌──────────────────────────────────────────┐
│  PostgreSQL    │  │             Celery Workers                │
│  Master ←→     │  │  Queues: inference · reports · emails ·  │
│  Replica       │  │          backups · celery (default)      │
└────────────────┘  └──────────────┬───────────────────────────┘
                                   │ HTTP
                                   ▼
                    ┌──────────────────────────────┐
                    │   Hugging Face Space (Docker) │
                    │   YOLOv12m + EfficientNet-B0  │
                    │       + Lungmask U-Net        │
                    └──────────────────────────────┘
```

### Service Map (Docker Compose)

| Service | Container | Port | Role |
|---|---|---|---|
| `api` | `lung_api` | 8000 | FastAPI application server |
| `postgres` | `lung_db` | 5432 | Primary PostgreSQL database |
| `postgres-replica` | `lung_db_replica` | 5433 | Read replica (streaming replication) |
| `redis` | `lung_redis` | 6379 | Cache, Celery broker, session store |
| `minio` | `lung_minio` | 9000 / 9001 | S3-compatible object storage |
| `celery_worker` | `lung_celery_worker` | — | Async task execution |
| `celery_beat` | `lung_celery_beat` | — | Scheduled task orchestrator |
| `nginx` | `lung_nginx` | 80 / 443 | Reverse proxy + TLS |

---

## 🚀 Quick Start

### Prerequisites

- **Docker** ≥ 24.0 with Docker Compose V2
- **Node.js** ≥ 20 (for frontend development)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/AI-POWERED-LUNG-DISEASE-DETECTION-AND-CLINICAL-DECISION-SUPPORT-SYSTEM.git
cd AI-POWERED-LUNG-DISEASE-DETECTION-AND-CLINICAL-DECISION-SUPPORT-SYSTEM
```

### 2. Configure Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials (JWT secret, DB password, MinIO keys, etc.)

# Frontend
cp Frontend/env.example Frontend/.env.local
# Edit Frontend/.env.local with your API URL
```

> **Key variables to set:**
> - `DATABASE_URL` — PostgreSQL connection string
> - `JWT_SECRET_KEY` — Minimum 64-character secret
> - `FIELD_ENCRYPTION_KEY` — Base64-encoded 32-byte AES key
> - `AI_SERVICE_URL` — Hugging Face Space URL for inference
> - `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` — Object storage credentials
> - `SMTP_USER` / `SMTP_PASSWORD` — Email relay for OTP

### 3. Start Backend Services

```bash
cd backend
docker compose up -d --build
```

This spins up all 8 services: API, PostgreSQL (master + replica), Redis, MinIO, Celery Worker, Celery Beat, and Nginx.

**Verify everything is healthy:**

```bash
docker compose ps
curl http://localhost:8000/health/
```

### 4. Start Frontend (Development)

```bash
cd Frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Default Test Users

When `SEED_TEST_USERS=true` is set in `backend/.env`, the following accounts are auto-created on startup:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@test.com` | `password` |
| Doctor | `doctor@test.com` | `password` |

> Set `SKIP_OTP=true` in development to bypass email-based two-factor authentication.

---

## 📡 API Reference

**Base URL:** `http://localhost:8000/api/v1`

Interactive docs available at:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Authenticate & receive JWT tokens |
| `POST` | `/auth/verify-otp` | Verify OTP for 2FA |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/forgot-password` | Request password reset OTP |
| `POST` | `/auth/reset-password` | Reset password with OTP |

### Patients

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/patients/` | Register a new patient |
| `GET` | `/patients/` | List patients with pagination |
| `GET` | `/patients/{id}` | Get patient details |
| `PUT` | `/patients/{id}` | Update patient record |

### Cases & Imaging

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/cases/` | Create a new diagnostic case |
| `GET` | `/cases/` | List cases for current doctor |
| `GET` | `/cases/{id}` | Get case with all relationships |
| `POST` | `/images/upload` | Upload chest X-ray (DICOM/PNG/JPEG) |
| `POST` | `/inference/{case_id}/run` | Trigger AI ensemble inference |
| `GET` | `/inference/{case_id}/results` | Get inference results |

### Clinical Workflow

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/reviews/` | Submit radiologist review |
| `POST` | `/diagnoses/` | Submit doctor diagnosis |
| `POST` | `/reports/{case_id}/regenerate` | Generate / regenerate PDF report |
| `GET` | `/reports/{case_id}` | Download generated report |
| `GET` | `/reports/{case_id}/status` | Check report generation status |
| `GET` | `/reports/export/csv` | Export all reports as CSV |

### Administration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users/` | List all users (Admin) |
| `PATCH` | `/users/{id}/role` | Update user role |
| `GET` | `/logs/` | Query audit trail |
| `GET` | `/health/` | System health check |

---

## 🧪 Testing

### API Tests (Postman / Newman)

A comprehensive end-to-end Postman collection is included covering the full clinical workflow:

```bash
cd postman
npm install
npx newman run LungDx_E2E_Workflow.postman_collection.json \
  -e LungDx_Local.postman_environment.json \
  --reporters cli,htmlextra
```

See [`postman/README.md`](postman/README.md) for detailed test documentation.

### Backend Unit Tests

```bash
cd backend
python -m pytest tests/ -v --asyncio-mode=auto
```

---

## 🚢 Deployment

### Docker Compose (Production)

```bash
cd backend
docker compose -f docker-compose.prod.yml up -d --build
```

The production compose file includes the frontend container and excludes dev-only services like the PostgreSQL replica and MinIO console.

### Kubernetes

Full K8s manifests are in the [`k8s/`](k8s/) directory:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/minio-statefulset.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/celery-deployment.yaml
kubectl apply -f k8s/ai-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

### AI Inference Service (Hugging Face)

The AI ensemble is deployed as a Docker-based Hugging Face Space:

```bash
cd backend/hf-space
# Push to your Hugging Face Space repo
git push hf main
```

**Models included:**

| Model | Task | Architecture |
|---|---|---|
| YOLOv12m | Object detection (lesion localization) | Ultralytics YOLO |
| EfficientNet-B0 | Classification (15 diseases) | PyTorch / timm |
| Lungmask | Lung segmentation | U-Net (R231) |

---

## 📁 Project Structure

```
AI-POWERED-LUNG-DISEASE-DETECTION/
│
├── backend/                          # FastAPI backend monolith
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── auth.py               # Authentication & 2FA
│   │   │   ├── patients.py           # Patient CRUD
│   │   │   ├── cases.py              # Diagnostic case management
│   │   │   ├── images.py             # X-ray upload & DICOM handling
│   │   │   ├── inference.py          # AI inference orchestration
│   │   │   ├── diagnoses.py          # Doctor diagnosis submission
│   │   │   ├── reviews.py            # Radiologist review submission
│   │   │   ├── reports.py            # PDF report generation & export
│   │   │   ├── users.py              # User management (Admin)
│   │   │   ├── logs.py               # Audit trail queries
│   │   │   └── health.py             # Health & readiness probes
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── patient.py            # Patient demographics (encrypted)
│   │   │   ├── case.py
│   │   │   ├── image.py
│   │   │   ├── inference_result.py
│   │   │   ├── diagnosis.py
│   │   │   ├── radiologist_review.py
│   │   │   ├── report.py
│   │   │   ├── audit_log.py
│   │   │   ├── hospital.py
│   │   │   └── session.py
│   │   ├── core/
│   │   │   ├── security.py           # JWT, Argon2, AES encryption
│   │   │   ├── rbac.py               # Role-based access control
│   │   │   ├── audit.py              # Audit logging helper
│   │   │   └── redis.py              # Redis connection manager
│   │   ├── workers/                  # Celery async tasks
│   │   │   ├── celery_app.py
│   │   │   ├── celery_beat.py
│   │   │   ├── inference_tasks.py
│   │   │   ├── report_tasks.py
│   │   │   ├── email_tasks.py
│   │   │   └── backup_tasks.py
│   │   ├── services/                 # External service integrations
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── db/                       # Database session & base config
│   │   ├── config.py                 # Pydantic Settings (env-driven)
│   │   ├── main.py                   # FastAPI app factory & middleware
│   │   └── dependencies.py           # Shared DI (auth, DB session)
│   ├── alembic/                      # Database migrations
│   ├── hf-space/                     # Hugging Face AI inference service
│   │   ├── ai_service/
│   │   │   ├── main.py               # Ensemble inference API
│   │   │   └── model/                # Model weights & loaders
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── nginx/                        # Reverse proxy configuration
│   ├── tests/                        # pytest test suite
│   ├── docker-compose.yml            # Development orchestration
│   ├── docker-compose.prod.yml       # Production orchestration
│   ├── Dockerfile
│   └── requirements.txt
│
├── Frontend/                         # Next.js clinical dashboard
│   ├── app/
│   │   ├── (auth)/                   # Login, register, password reset
│   │   ├── (dashboard)/
│   │   │   ├── admin/                # Admin panel (user management)
│   │   │   ├── doctor/
│   │   │   │   ├── cases/            # Case list & detail views
│   │   │   │   ├── patients/         # Patient registry
│   │   │   │   ├── reports/          # Report management & PDF viewer
│   │   │   │   └── profile/
│   │   │   ├── radiologist/          # Radiologist review workspace
│   │   │   └── help/
│   │   └── landing-page/
│   ├── components/                   # Reusable UI components (93 files)
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # API client, utilities
│   ├── store/                        # Zustand state management
│   ├── messages/                     # i18n translations (en, am)
│   ├── middleware.ts                  # Auth middleware & route protection
│   └── Dockerfile
│
├── k8s/                              # Kubernetes manifests
│   ├── namespace.yaml
│   ├── secrets.yaml
│   ├── postgres-statefulset.yaml
│   ├── redis-deployment.yaml
│   ├── minio-statefulset.yaml
│   ├── api-deployment.yaml
│   ├── celery-deployment.yaml
│   ├── ai-deployment.yaml
│   ├── frontend-deployment.yaml
│   └── ingress.yaml
│
├── postman/                          # API test suite
│   ├── LungDx_E2E_Workflow.postman_collection.json
│   ├── LungDx_Local.postman_environment.json
│   └── newman/                       # HTML test reports
│
├── Docs/                             # Project documentation & research
├── evaluate_ensemble.ipynb           # Model evaluation notebook
├── final-project-v4 (2).ipynb        # Model training notebook
└── .github/workflows/                # CI/CD pipeline
```

---

## ⚙️ Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **FastAPI** 0.115 | Async REST API framework |
| **SQLAlchemy** 2.0 (async) | ORM with asyncpg driver |
| **Alembic** | Database schema migrations |
| **Celery** + Redis | Distributed task queue |
| **PostgreSQL** 16 | Primary database with streaming replication |
| **Redis** 7 | Cache, message broker, session store |
| **MinIO** | S3-compatible object storage |
| **WeasyPrint** / ReportLab | PDF report generation |
| **Argon2** | Password hashing |
| **python-jose** | JWT token handling |
| **structlog** | Structured JSON logging |
| **Prometheus** | Metrics instrumentation |

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js** 16 | React framework with App Router |
| **React** 19 | UI library |
| **TailwindCSS** 4 | Utility-first styling |
| **Radix UI** | Accessible component primitives |
| **Zustand** | Lightweight state management |
| **Recharts** | Analytics & data visualization |
| **TipTap** | Rich-text diagnosis editor |
| **Konva.js** | Canvas-based X-ray annotation |
| **react-pdf** | In-browser PDF report viewing |
| **next-intl** | Internationalization (EN/AM) |
| **Zod** | Runtime schema validation |

### AI / ML

| Technology | Purpose |
|---|---|
| **YOLOv12m** (Ultralytics) | Lesion detection & localization |
| **EfficientNet-B0** (timm) | 15-class disease classification |
| **Lungmask** (U-Net R231) | Lung region segmentation |
| **PyTorch** | Deep learning framework |
| **Hugging Face Spaces** | Model deployment (Docker SDK) |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker Compose** | Local & production orchestration |
| **Kubernetes** | Production-grade cluster deployment |
| **Nginx** | Reverse proxy, TLS termination |
| **GitHub Actions** | CI/CD pipeline |

---

## 🔧 Environment Variables

See [`backend/.env.example`](backend/.env.example) for the complete reference.

| Group | Variables | Description |
|---|---|---|
| **Database** | `DATABASE_URL`, `DB_POOL_SIZE` | PostgreSQL async connection |
| **Authentication** | `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES` | Token configuration |
| **Security** | `FIELD_ENCRYPTION_KEY`, `OTP_EXPIRE_MINUTES` | AES encryption & OTP |
| **Storage** | `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Object storage (S3/MinIO) |
| **AI Service** | `AI_SERVICE_URL`, `AI_INTERNAL_API_KEY` | Hugging Face inference endpoint |
| **Email** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | OTP & notification delivery |
| **CORS** | `FRONTEND_URL`, `CORS_ORIGIN_REGEX` | Cross-origin configuration |
| **Dev Flags** | `SEED_TEST_USERS`, `SKIP_OTP` | Development shortcuts |

---

## 📄 License

This project is licensed under the **Apache License 2.0** — see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ for clinical excellence*
