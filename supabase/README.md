# Local Supabase Setup Guide

This directory contains configuration for running Supabase locally for development and testing.

## Prerequisites

1. **Docker Desktop** - Required for running Supabase locally
   - Install from: https://docs.docker.com/desktop/install/mac-install/
   - Or via Homebrew: `brew install --cask docker`
   - Make sure Docker Desktop is running before starting Supabase

2. **Supabase CLI** - Will be installed automatically by setup script
   - Preferred method (macOS): `brew install supabase/tap/supabase`
   - Alternative: `npm install -g supabase` (may require fixing npm permissions)

## Quick Start

### First Time Setup

```bash
# 1. Install and start local Supabase
npm run supabase:setup

# 2. Copy connection details from output to .env.test.local
# The output will show:
#   - API URL (http://localhost:54321)
#   - anon key (for NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
#   - service_role key (for SUPABASE_SERVICE_ROLE_KEY)

# 3. Apply schema (canonical)
npm run supabase:reset
# Legacy: npm run supabase:migrate-local

# 4. Run tests
npm run test:e2e
```

For cloud test + Vercel Preview, see [docs/environments.md](../docs/environments.md).

### Daily Usage

```bash
# Start Supabase (if not already running)
npm run supabase:start

# Run tests
npm run test:e2e

# Or use the combined command
npm run test:e2e:local
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run supabase:setup` | First-time setup (installs CLI, initializes, starts) |
| `npm run supabase:start` | Start local Supabase instance |
| `npm run supabase:stop` | Stop local Supabase instance |
| `npm run supabase:status` | Show connection details and status |
| `npm run supabase:reset` | Reset DB + apply `supabase/migrations/` (preferred) |
| `npm run supabase:migrate-local` | Legacy migrations from `database/` (may drift) |
| `npm run seed:test` | Seed/repair **vestiqo-test** (not production) |
| `npm run supabase:studio` | Open Supabase Studio (web UI) |
| `npm run test:e2e:local` | Start Supabase and run tests |

## Configuration

### Environment Variables

Create `.env.test.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ... # anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ... # service_role key
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

Get these values by running `npm run supabase:start` - they're displayed in the output.

### Supabase Studio

Studio is automatically available when Supabase is running. Access it at: **http://localhost:54323**

Or use the npm command to open it in your browser:
```bash
npm run supabase:studio
```

Features:
- View and edit database tables
- Run SQL queries (SQL Editor)
- Manage storage buckets
- Test authentication
- View API documentation

## Database Migrations

Migrations are applied from the `database/` directory. The migration script applies them in the correct order:

1. Core tables (01-04)
2. Sample data (05, 08)
3. Security fixes (09)
4. Additional features (26-40)

### Manual Migration

If you need to apply migrations manually:

1. Open Supabase Studio: `npm run supabase:studio`
2. Go to SQL Editor
3. Copy-paste SQL from `database/*.sql` files in order
4. Execute each file

## Resetting the Database

To start fresh (useful when testing):

```bash
npm run supabase:reset
```

This will:
- Drop all tables
- Reapply all migrations
- Give you a clean slate

## Troubleshooting

### Docker Not Running

```
Error: Cannot connect to Docker daemon
```

**Solution:** Start Docker Desktop application

### Port Already in Use

```
Error: port 54321 already in use
```

**Solution:** 
- Check if Supabase is already running: `npm run supabase:status`
- Stop existing instance: `npm run supabase:stop`
- Or kill the process using the port

### Migrations Fail

```
Error: relation already exists
```

**Solution:**
- Reset database: `npm run supabase:reset`
- Or skip already-applied migrations

### Can't Connect to Database

```
Error: connection refused
```

**Solution:**
1. Check Supabase is running: `npm run supabase:status`
2. Verify Docker is running
3. Restart Supabase: `npm run supabase:stop && npm run supabase:start`

### Tests Can't Connect

If tests fail with connection errors:

1. Verify `.env.test.local` has correct values
2. Run `npm run supabase:status` to get current connection details
3. Ensure Supabase is running: `npm run supabase:start`

## Advantages of Local Supabase

✅ **Free** - No cloud costs  
✅ **Fast** - Runs on your machine  
✅ **Isolated** - Zero risk to production  
✅ **Offline** - Works without internet  
✅ **Reset** - Easy to reset between test runs  
✅ **Full Control** - Same features as cloud Supabase  

## Comparison with Other Options

| Feature | Local Supabase | Cloud Test Project | Database Branching |
|---------|---------------|-------------------|-------------------|
| Cost | Free | Free (with limits) | Pro Plan ($25/mo) |
| Speed | Very fast | Network dependent | Network dependent |
| Isolation | Complete | Complete | Complete |
| Reset | Instant | Manual cleanup | Automatic |
| Offline | Yes | No | No |
| Setup | Requires Docker | Just create project | Requires Pro plan |

## Next Steps

1. ✅ Set up local Supabase (you're here!)
2. ✅ Apply migrations
3. ✅ Configure test environment
4. ✅ Run tests
5. 🔄 Develop and test locally
6. 📝 Deploy to cloud when ready

## Additional Resources

- [Supabase Local Development Docs](https://supabase.com/docs/guides/local-development)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Database Migration Guide](../database/README.md)

