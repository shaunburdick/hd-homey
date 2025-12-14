#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p ./data/db

# Run database migrations
echo "Running database migrations..."
node src/scripts/migrate.mjs

echo "Starting HD Homey..."

# Start the application
exec node server.js
