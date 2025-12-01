# Database Configuration

HD Homey uses SQLite for data storage, managed by Drizzle ORM. This guide covers database setup, maintenance, backups, and troubleshooting.

## Database Overview

### Technology Stack

- **Database**: SQLite 3
- **ORM**: Drizzle ORM
- **Migrations**: Drizzle Kit
- **Driver**: better-sqlite3 (Node.js)

### Why SQLite?

HD Homey chose SQLite for several key advantages:

- ✅ **Zero configuration** - No separate database server required
- ✅ **Single file** - Easy backups and migrations
- ✅ **Excellent performance** - Perfect for <100 concurrent users
- ✅ **ACID compliant** - Data integrity guarantees
- ✅ **Portable** - Works on any platform
- ✅ **Reliable** - Battle-tested for decades

## Database Location

### Default Path

The database file is stored at:
```
${HD_HOMEY_DB_PATH}/hd_homey.db
```

**Default value**: `./data/db/hd_homey.db`

### Docker Volumes

Docker Compose automatically creates persistent volumes:

```yaml
volumes:
  - hd-homey-data:/app/data  # Contains database
```

The database file is stored at:
```
/app/data/db/hd_homey.db
```

### Custom Path

Set a custom database location via environment variable:

```bash
# .env
HD_HOMEY_DB_PATH=/custom/path/to/db
```

::: warning Directory Permissions
The database directory must be:
- Writable by the HD Homey process
- Persistent across restarts (use Docker volumes)
- Backed up regularly
:::

## Database Schema

### Tables

HD Homey's database contains these tables:

#### Authentication Tables (Better-Auth)

- **user** - User accounts with credentials and roles
  - Fields: id, name, email, username, role, isActive, createdAt, etc.
  
- **session** - User login sessions (JWT-based, this table is for future use)
  - Fields: id, token, expiresAt, userId, ipAddress, userAgent
  
- **account** - Authentication credentials and OAuth tokens
  - Fields: id, accountId, providerId, password, accessToken, etc.
  
- **verification** - Email verification and password reset tokens
  - Fields: id, identifier, value, expiresAt

- **invitation** - User invitation tokens
  - Fields: id, email, role, token, expiresAt, invitedBy

#### Application Tables

- **tuners** - HDHomeRun device configurations
  - Fields: id, name, url, friendlyName, modelNumber, tunerCount, createdAt
  
- **channels** - TV channel lineup
  - Fields: id, tunerId, guideNumber, guideName, hd, url
  
- **settings** - Application configuration
  - Fields: key, value

### Schema File

The complete schema is defined in:
```
src/lib/database/schema.ts
```

View the schema using Drizzle Studio (see [Database Tools](#database-tools) below).

## Migrations

### Automatic Migrations

HD Homey automatically runs database migrations on startup:

1. Application starts
2. Checks for pending migrations
3. Applies migrations in order
4. Continues startup

**Docker**: Migrations run automatically via `docker-entrypoint.sh`

**From Source**: Migrations run via `npm run dev` or `npm start`

### Migration Files

Migration SQL files are stored in:
```
migrations/
├── 0000_large_microchip.sql       # Initial schema
├── 0001_plain_junta.sql           # Better-Auth migration
└── meta/
    ├── _journal.json              # Migration history
    ├── 0000_snapshot.json
    └── 0001_snapshot.json
```

### Manual Migration

To manually run migrations:

```bash
# Docker
docker exec hd-homey npm run db:migrate

# From source
npm run db:migrate
```

### Creating New Migrations

If you're developing HD Homey and modifying the schema:

1. **Edit schema**: Modify `src/lib/database/schema.ts`

2. **Generate migration**:
   ```bash
   npm run db:generate
   ```

3. **Review migration**: Check `migrations/` for new SQL file

4. **Apply migration**:
   ```bash
   npm run db:migrate
   ```

::: warning Schema Changes
Modifying the database schema requires understanding of SQL and database design. Always test schema changes in a development environment before applying to production.
:::

## Database Tools

### Drizzle Studio

Drizzle Studio provides a web-based database browser:

```bash
# From source
npm run db:studio

# Opens at http://localhost:4983
```

**Features**:
- Browse all tables and data
- View relationships
- Execute queries (read-only recommended)
- Inspect schema

::: tip Docker Studio Access
Drizzle Studio requires filesystem access to the database. Run it from a source installation or use `docker exec` to access the database file directly.
:::

### SQLite CLI

Access the database directly using SQLite command-line:

```bash
# Docker
docker exec -it hd-homey sqlite3 /app/data/db/hd_homey.db

# From source
sqlite3 ./data/db/hd_homey.db
```

**Common queries**:
```sql
-- List all tables
.tables

-- View table schema
.schema user

-- Count users
SELECT COUNT(*) FROM user;

-- View tuners
SELECT id, name, url FROM tuners;

-- View channels by tuner
SELECT guideName, guideNumber FROM channels 
WHERE tunerId = 'your-tuner-id';
```

**Exit**: Type `.quit`

## Backups

### Why Backup?

Regular backups protect against:
- Hardware failure
- Accidental data deletion
- Database corruption
- Version upgrade issues

### Backup Methods

#### Method 1: File Copy (Recommended)

SQLite databases are single files - simply copy the file:

```bash
# Docker
docker exec hd-homey cp /app/data/db/hd_homey.db /app/data/db/hd_homey.db.backup
docker cp hd-homey:/app/data/db/hd_homey.db.backup ./backup/hd_homey-$(date +%Y%m%d).db

# From source
cp ./data/db/hd_homey.db ./backups/hd_homey-$(date +%Y%m%d).db
```

#### Method 2: SQLite Backup Command

Use SQLite's built-in backup:

```bash
# Docker
docker exec hd-homey sqlite3 /app/data/db/hd_homey.db ".backup /app/data/db/hd_homey.db.backup"

# From source
sqlite3 ./data/db/hd_homey.db ".backup ./backups/hd_homey-$(date +%Y%m%d).db"
```

#### Method 3: Docker Volume Backup

Backup the entire data volume:

```bash
# Stop HD Homey
docker compose stop

# Backup volume
docker run --rm \
  -v hd-homey_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/hd-homey-data-$(date +%Y%m%d).tar.gz /data

# Restart HD Homey
docker compose start
```

### Automated Backups

#### Cron Job Example

```bash
#!/bin/bash
# /usr/local/bin/backup-hd-homey.sh

BACKUP_DIR="/backups/hd-homey"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup database
docker exec hd-homey cp \
  /app/data/db/hd_homey.db \
  /app/data/db/hd_homey.db.backup

docker cp \
  hd-homey:/app/data/db/hd_homey.db.backup \
  "$BACKUP_DIR/hd_homey-$TIMESTAMP.db"

# Keep last 30 days of backups
find "$BACKUP_DIR" -name "hd_homey-*.db" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/hd_homey-$TIMESTAMP.db"
```

**Add to crontab**:
```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-hd-homey.sh
```

### Backup Verification

Verify backup integrity:

```bash
# Test backup can be opened
sqlite3 ./backups/hd_homey-20231115.db "PRAGMA integrity_check;"

# Expected output: ok
```

## Restoring from Backup

### Method 1: Replace Database File

```bash
# Stop HD Homey
docker compose stop

# Replace database
docker cp ./backups/hd_homey-20231115.db hd-homey:/app/data/db/hd_homey.db

# Start HD Homey
docker compose start
```

### Method 2: Volume Restore

```bash
# Stop and remove container
docker compose down

# Remove current data volume
docker volume rm hd-homey_data

# Restore from backup
docker run --rm \
  -v hd-homey_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/hd-homey-data-20231115.tar.gz -C /

# Start HD Homey
docker compose up -d
```

### From Source

```bash
# Stop application (Ctrl+C if running)

# Restore database
cp ./backups/hd_homey-20231115.db ./data/db/hd_homey.db

# Restart application
npm run dev
```

## Database Maintenance

### Optimize Database

Over time, SQLite databases can become fragmented. Optimize with VACUUM:

```bash
# Docker
docker exec hd-homey sqlite3 /app/data/db/hd_homey.db "VACUUM;"

# From source
sqlite3 ./data/db/hd_homey.db "VACUUM;"
```

**Benefits**:
- Reclaims unused space
- Defragments data
- Improves query performance

**When to run**: Monthly or after deleting large amounts of data

### Check Database Integrity

Verify database health:

```bash
# Docker
docker exec hd-homey sqlite3 /app/data/db/hd_homey.db "PRAGMA integrity_check;"

# From source
sqlite3 ./data/db/hd_homey.db "PRAGMA integrity_check;"
```

**Expected output**: `ok`

**If errors appear**: Restore from a recent backup

### View Database Stats

```bash
sqlite3 ./data/db/hd_homey.db << EOF
.print "Database Statistics"
.print "==================="
SELECT 'Database Size: ' || (page_count * page_size / 1024 / 1024) || ' MB' FROM pragma_page_count(), pragma_page_size();
SELECT 'Users: ' || COUNT(*) FROM user;
SELECT 'Tuners: ' || COUNT(*) FROM tuners;
SELECT 'Channels: ' || COUNT(*) FROM channels;
SELECT 'Invitations: ' || COUNT(*) FROM invitation;
EOF
```

## Troubleshooting

### Database Locked Error

**Error**: `database is locked` or `SQLITE_BUSY`

**Causes**:
- Multiple processes accessing database
- Long-running transaction
- Backup in progress

**Solutions**:
1. Ensure only one HD Homey instance is running
2. Increase SQLite timeout (done automatically by HD Homey)
3. Wait for ongoing operations to complete
4. Check for stale lock files: `./data/db/hd_homey.db-wal`

### Database Corruption

**Error**: `database disk image is malformed` or integrity check fails

**Solutions**:
1. **Stop HD Homey immediately**
2. **Restore from backup** (see [Restoring from Backup](#restoring-from-backup))
3. If no backup available:
   ```bash
   # Attempt recovery (may lose recent data)
   sqlite3 ./data/db/hd_homey.db ".dump" | sqlite3 recovered.db
   ```

::: danger Data Loss Risk
Database corruption can result in data loss. Always maintain regular backups.
:::

### Migration Fails

**Error**: Migration fails on startup

**Solutions**:
1. Check logs for specific error: `docker compose logs hd-homey`
2. Verify database is writable
3. Ensure adequate disk space
4. Roll back to previous backup
5. Check GitHub issues for known migration problems

### Database Not Found

**Error**: `no such table: user` or file not found

**Solutions**:
1. Verify `HD_HOMEY_DB_PATH` is correct
2. Ensure database directory exists and is writable
3. Check Docker volume is mounted
4. Allow HD Homey to create database on first run

### Performance Issues

**Symptoms**: Slow queries, high CPU usage, delayed responses

**Solutions**:
1. Run `VACUUM` to optimize database
2. Check database size (should be <100MB for normal use)
3. Review indexes (already optimized in HD Homey)
4. Consider hardware upgrade if >50 concurrent users

## Database Limits

SQLite is ideal for HD Homey's use case, but has some limits:

| Aspect | Limit | HD Homey Typical |
|--------|-------|------------------|
| **Database Size** | 281 TB max | <100 MB |
| **Concurrent Writers** | 1 | 1 (single instance) |
| **Concurrent Readers** | Unlimited | <100 |
| **Table Rows** | 2^64 | <10,000 |
| **String Length** | 1 GB | <1 KB |
| **BLOB Size** | 2 GB | Not used |

**Recommendation**: If you exceed 100 concurrent users or need multiple HD Homey instances, consider migrating to PostgreSQL (not currently supported).

## Next Steps

- **[Environment Variables](/config/environment-variables)** - Configure database path
- **[Installation Guide](/getting-started/installation)** - Setup HD Homey with persistent data
- **[Troubleshooting](/troubleshooting/)** - Solve database-related issues

## Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)
