# Makefile for frontend
.PHONY: install build start stop restart clean

# install dependencies
install:
	npm install

# build the frontend
build:
	npm run build

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