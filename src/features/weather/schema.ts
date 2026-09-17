import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// Daily historical weather, backfilled on demand from Open-Meteo's free
// archive API (no API key) rather than uploaded — see features/weather's
// backfillWeather(). Used to give context for solar generation dips (cloud
// cover) rather than being treated as an authoritative energy source itself.
export const weatherDaily = sqliteTable(
	"weather_daily",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		date: text("date").notNull(),
		tempMaxC: real("temp_max_c"),
		tempMinC: real("temp_min_c"),
		tempMeanC: real("temp_mean_c"),
		cloudCoverPct: real("cloud_cover_pct"),
		precipitationMm: real("precipitation_mm"),
		shortwaveRadiationMjM2: real("shortwave_radiation_mj_m2"),
		sunshineDurationS: real("sunshine_duration_s"),
		fetchedAt: text("fetched_at")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
	},
	(table) => [
		unique("weather_daily_date_unique").on(table.date),
		index("weather_daily_date_idx").on(table.date),
	],
);
