#!/bin/sh
set -e

# Normalize database path for backwards compatibility
# If HD_HOMEY_DB_PATH is set, use it as-is (respect user config)
# If not set or is relative path starting with './', convert to absolute path
# This ensures migration script and app use the same database file
if [ -z "$HD_HOMEY_DB_PATH" ] || [ "$HD_HOMEY_DB_PATH" = "./data/db/hd_homey.db" ]; then
    export HD_HOMEY_DB_PATH="/app/data/db/hd_homey.db"
    echo "Using default database path: $HD_HOMEY_DB_PATH"
elif echo "$HD_HOMEY_DB_PATH" | grep -q "^\."; then
    # Convert relative path to absolute (from /app)
    export HD_HOMEY_DB_PATH="/app/${HD_HOMEY_DB_PATH#./}"
    echo "Converted relative path to absolute: $HD_HOMEY_DB_PATH"
else
    echo "Using configured database path: $HD_HOMEY_DB_PATH"
fi

# Ensure data directory exists
mkdir -p "$(dirname "$HD_HOMEY_DB_PATH")"

# Run database migrations
echo "Running database migrations..."
node src/scripts/migrate.mjs

echo "Starting HD Homey..."

# Start the application (server.js is in apps/web/ due to standalone output structure)
exec node apps/web/server.js
