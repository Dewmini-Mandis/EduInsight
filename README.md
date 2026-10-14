# EduInsight

EduInsight Learning Analytics & Adaptive Quiz Platform.

## Database Configuration Setup

The backend supports environment-aware database configuration via environment variables (in `backend/.env`).

### 1. Connection Pooling & Re-use
- `DB_CONN_MAX_AGE`: Set to `600` (seconds) to reuse TCP/TLS database connections across requests.
- `DB_CONN_HEALTH_CHECKS`: Set to `True` to verify connection validity before query execution.

### 2. Local PostgreSQL Development (Recommended for Low Latency)
For local development with ultra-low query latency (< 1ms per query):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eduinsight
DB_CONN_MAX_AGE=600
DB_CONN_HEALTH_CHECKS=True
USE_SQLITE=False
```

### 3. Cloud Neon PostgreSQL (Staging / Production)
For staging or production deployments using Cloud Neon DB:
```env
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/neondb?sslmode=require
DB_CONN_MAX_AGE=600
DB_CONN_HEALTH_CHECKS=True
USE_SQLITE=False
```