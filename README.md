# GridSense

A local dashboard for household solar generation, EV charging, and grid usage — built with Next.js, shadcn/ui, and a local SQLite database.

## Setup

```bash
pnpm install
pnpm db:migrate   # creates data/gridsense.db
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). On first run there's no data yet — go to **Settings → Data Import** and upload your exports.

## Data sources

- **Car charger (Zappi/myenergi)** — hourly CSV export. `Net Grid Import/Export` is whole-house grid exchange from the incoming-powerline CT; `Diverter`/`Boosted Energy` give a direct solar-vs-grid split of EV charging.
- **Solar (Solarman/Deye-style inverter portal)** — one XLSX export per calendar year, daily granularity.

## Re-uploading new exports

Both sources are periodic exports — the Zappi CSV is a rolling 12-month window, the solar XLSX is per calendar year. When you get a new one, just upload it again in **Settings → Data Import**: rows are upserted by their natural key (serial number + timestamp for the car charger, plant + date for solar), so overlapping data updates in place and nothing gets duplicated. The import history table shows how many rows were new vs. updated on each upload.

## Settings

- **Tariff Rates** — add your €/kWh rate (with an effective-from date) so the Cost & Savings page can estimate grid import cost. Rates support changing over time; adding a new open-ended rate automatically closes out the previous one.
- **CT Labels** — the Zappi hub's three external CT clamps can be wired to anything (immersion heater, etc.); label them here once you know what they're measuring.

## Docker

Images are published to GHCR on every push to `main` (`latest`) and on `v*` tags. Migrations run automatically on container start.

```bash
docker run -d -p 3000:3000 -v gridsense-data:/app/data \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  ghcr.io/<owner>/<repo>:latest
```

Use a named volume for `/app/data` (the container runs as the non-root `node` user, so a bind mount must be writable by uid 1000). Set `ENABLE_SIGN_UP=true` to create the first account, then turn it off again.

## Tech stack

Next.js 16 (App Router) · shadcn/ui (base-nova/Base UI preset) · Recharts · Drizzle ORM + better-sqlite3 · csv-parse · SheetJS (xlsx) · Zod

## Scripts

| Command                     | Description                                                   |
| --------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                  | Start the dev server                                          |
| `pnpm build` / `pnpm start` | Production build / run                                        |
| `pnpm lint`                 | Oxlint                                                        |
| `pnpm format`               | Format the codebase with Oxfmt                                |
| `pnpm format:check`         | Check formatting without writing                              |
| `pnpm db:generate`          | Generate a Drizzle migration after editing `src/db/schema.ts` |
| `pnpm db:migrate`           | Apply pending migrations to `data/gridsense.db`               |

## Known limitation

Car charging on a given day can only be split into solar-vs-grid where the Zappi's `Diverter`/`Boosted Energy` fields are populated — if a unit doesn't report those (or reports zero throughout), the Car Charging page's solar/grid split for that period will read as zero even though charging happened.
