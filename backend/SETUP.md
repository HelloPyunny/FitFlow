# Backend

We are using the following:
- Python 3.11 + FastAPI/Uvicorn (see `app/main.py`)
- PostgreSQL 16 (via Docker Compose)
- `make` for common developer commands

## Prerequisites
1. Install [Python 3.11](https://www.python.org/downloads/)
2. Install [Docker](https://www.docker.com/get-started/) and [Docker Compose](https://docs.docker.com/compose/install/)
3. Install `make` (usually included on macOS/Linux)

## Configuration
Create a `.env` file in `backend/` before running anything. Use `.env.example` as reference.

These keys are used by both Docker Compose (database service) and local runs:
- The database service in `docker-compose.yml` loads `.env` automatically.
- The backend service section in `docker-compose.yml` is currently commented out. Uncomment it if you want to run the API in Docker. (Not recommended for development; we run the backend locally for faster iteration.)

## Running with Docker
```bash
cd backend
make docker-postgres-up   # start Postgres container (only db for now)
make docker-postgres-down # stop Postgres container
make docker-logs          # follow all compose logs
```
- The database listens on `localhost:5432`.
- To bring up both db and backend via Compose, uncomment the backend service first and then use `make docker-up`.

## Running the backend locally
```bash
cd backend
python -m venv .venv 
source .venv/bin/activate # maybe different in Windows
make install
make start  # uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
make stop # run to kill backend server
```
- Ensure Postgres is running (e.g., `make docker-postgres-up`) and `DATABASE_URL` matches your DB host/port.
- Stop/restart with `make stop` / `make restart`.
