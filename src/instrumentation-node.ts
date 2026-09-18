import { join } from "node:path";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { db } from "@/db/client";

// Dev keeps the manual `pnpm db:migrate` workflow; the container has no drizzle-kit, so it migrates on boot.
if (process.env.NODE_ENV === "production") {
	migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
}
