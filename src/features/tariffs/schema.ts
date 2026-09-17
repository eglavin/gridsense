import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const tariffRates = sqliteTable(
	"tariff_rates",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		direction: text("direction", { enum: ["import", "export"] })
			.notNull()
			.default("import"),
		eurPerKwh: real("eur_per_kwh").notNull(),
		// A rate is in effect from this date until the next rate of the same
		// direction begins (or indefinitely, if it's the most recent one) — no
		// stored end date to keep in sync when rates are added, edited, or removed.
		effectiveFrom: text("effective_from").notNull(),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
	},
	(table) => [
		unique("tariff_rates_direction_effective_from_unique").on(table.direction, table.effectiveFrom),
	],
);
