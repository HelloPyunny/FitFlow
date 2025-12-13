# Makefile for backend
.PHONY: start stop restart clean

# Start the backend server
start:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Stop the backend server
stop:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Restart the backend server
restart: stop start

# Clean the backend server
clean:
	rm -rf __pycache__
	rm -rf *.pyc
	rm -rf *.pyo
	rm -rf *.pyd
	rm -rf *.pyw
	rm -rf *.pyz