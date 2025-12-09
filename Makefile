.PHONY: all install install-backend install-frontend setup-backend run-backend run-frontend dev docker-up docker-down docker-restart clean

# Run everything
all: install docker-up dev

# Install dependencies
install: install-backend install-frontend

install-backend:
	cd backend && python3 -m venv venv || true
	cd backend && . venv/bin/activate && pip install -U pip && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

setup-backend:
	cd backend && python3 -m venv venv
	cd backend && . venv/bin/activate && pip install -U pip && pip install -r requirements.txt

# Run servers
run-backend:
	cd backend && . venv/bin/activate && \
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run-frontend:
	cd frontend && npm run dev

dev:
	@echo "Backend  → http://localhost:8000"
	@echo "Frontend → http://localhost:5173"
	@make -j2 run-backend run-frontend

# Docker
docker-up:
	cd backend && docker-compose up -d

docker-down:
	cd backend && docker-compose down

docker-restart: docker-down docker-up

# Cleanup
clean:
	find . -name "__pycache__" -o -name "*.pyc" -o -name "*.pyo" | xargs rm -rf 2>/dev/null || true
	rm -rf backend/dist backend/build frontend/dist frontend/dist-ssr .pytest_cache .coverage htmlcov 2>/dev/null || true
