import { sql } from "drizzle-orm";

import { db } from "@/db/client";

/** Overall date coverage across every source — a page only needs to gate on this if it draws from more than one. */
export function getAvailableDateRange(): {
	min: string | null;
	max: string | null;
} {
	const row = db.get<{ min: string | null; max: string | null }>(sql`
    SELECT MIN(date) AS min, MAX(date) AS max FROM (
      SELECT local_date AS date FROM car_charger_hourly
      UNION
      SELECT date FROM solar_daily
      UNION
      SELECT local_date AS date FROM esb_grid_30min
    )
  `);
	return row ?? { min: null, max: null };
}
