#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p ./data/db

# Run database migrations
echo "Running database migrations..."
node src/scripts/migrate.mjs

echo "Starting HD Homey..."

# Start the application (server.js is in apps/web/ due to standalone output structure)
exec node apps/web/server.js
