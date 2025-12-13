# Makefile for frontend
.PHONY: start stop restart clean

# Start the frontend server
start:
	npm run dev

# Stop the frontend server
stop:
	npm run stop

# Restart the frontend server
restart: stop start

# Clean the frontend server
clean:
	rm -rf node_modules
	rm -rf dist
	rm -rf dist-ssr
	rm -rf .vscode
	rm -rf .idea
	rm -rf .DS_Store
	rm -rf .gitignore
	rm -rf .gitignore