.PHONY: start stop restart \
        docker-up docker-down docker-restart docker-logs \
        docker-postgres-up docker-postgres-down docker-postgres-restart \
        docker-backend-up docker-backend-down docker-backend-restart \
        clean

# Install dependencies
install:
	pip install -r requirements.txt

# Local backend
start:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

stop:
	pkill -f "uvicorn app.main:app.*--port 8000" || true

restart: stop start

# Docker (all)
docker-up: docker-postgres-up docker-backend-up

docker-down: docker-postgres-down docker-backend-down

docker-restart: docker-postgres-restart docker-backend-restart

docker-logs:
	docker compose logs -f

# Docker (Only postgres)
docker-postgres-up:
	docker compose up -d db

docker-postgres-down:
	docker compose stop db

docker-postgres-restart: docker-postgres-down docker-postgres-up

# Docker (Only backend)
docker-backend-up:
	docker compose up -d backend

docker-backend-down:
	docker compose stop backend

docker-backend-restart: docker-backend-down docker-backend-up

clean:
	rm -rf __pycache__ *.pyc *.pyo *.pyd *.pyw *.pyz
