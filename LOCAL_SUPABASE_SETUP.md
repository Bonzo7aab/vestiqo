# Local Supabase Quick Start Guide

## 🚀 Quick Setup (First Time)

```bash
# 1. Install Docker Desktop (if not installed)
# Download from: https://docs.docker.com/desktop/install/mac-install/
# Or: brew install --cask docker

# 2. Start Docker Desktop application

# 3. Set up local Supabase
npm run supabase:setup

# Note: If you get permission errors, the script will try Homebrew first.
# If that fails, you can manually install Supabase CLI:
#   brew install supabase/tap/supabase

# 4. Copy connection details from output to .env.test.local
# Look for:
#   API URL: http://localhost:54321
#   anon key: eyJ...
#   service_role key: eyJ...

# 5. Apply schema (prefer canonical migrations)
npm run supabase:reset
# Legacy alternative (may drift from cloud): npm run supabase:migrate-local

# 6. Run tests
npm run test:e2e:local
```

Cloud test / Preview setup: [docs/environments.md](docs/environments.md).

## 📋 Daily Usage

```bash
# Start Supabase (if not running)
npm run supabase:start

# Run tests
npm run test:e2e

# Or combined
npm run test:e2e:local

# Stop Supabase (when done)
npm run supabase:stop
```

## 🔧 Available Commands

| Command | What it does |
|---------|-------------|
| `npm run supabase:setup` | First-time setup |
| `npm run supabase:start` | Start local Supabase |
| `npm run supabase:stop` | Stop local Supabase |
| `npm run supabase:status` | Show connection details |
| `npm run supabase:reset` | Reset DB + apply `supabase/migrations/` (preferred) |
| `npm run supabase:migrate-local` | Legacy `database/*.sql` path (may drift) |
| `npm run seed:test` | Repair cloud **vestiqo-test** seed users/data |
| `npm run supabase:studio` | Open Supabase Studio in browser (http://localhost:54323) |
| `npm run test:e2e:local` | Start Supabase + run tests |

## 📝 Environment Setup

Create `.env.test.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key from supabase:start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase:start>
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

Get the keys by running: `npm run supabase:start`

## ✅ Benefits

- ✅ **Free** - No cloud costs
- ✅ **Fast** - Runs on your machine
- ✅ **Safe** - Zero risk to production
- ✅ **Isolated** - Complete test environment
- ✅ **Reset** - Easy to start fresh

## 📚 More Information

- Full documentation: [supabase/README.md](supabase/README.md)
- Test setup: [tests/README.md](tests/README.md)
- Database migrations: [database/README.md](database/README.md)

## 🆘 Troubleshooting

**Docker not found?**
- Install Docker Desktop: https://docs.docker.com/desktop/install/mac-install/
- Make sure Docker Desktop is running

**Port already in use?**
- Check if Supabase is running: `npm run supabase:status`
- Stop it: `npm run supabase:stop`

**Can't connect?**
- Verify Supabase is running: `npm run supabase:status`
- Check `.env.test.local` has correct values
- Restart: `npm run supabase:stop && npm run supabase:start`

