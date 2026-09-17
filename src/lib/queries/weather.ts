import { sql } from "drizzle-orm";

import { db } from "@/db/client";

export interface WeatherDayRow {
	date: string;
	tempMaxC: number | null;
	tempMinC: number | null;
	tempMeanC: number | null;
	cloudCoverPct: number | null;
	precipitationMm: number | null;
	shortwaveRadiationMjM2: number | null;
	sunshineDurationS: number | null;
}

export function getWeatherDaily(from: string, to: string): WeatherDayRow[] {
	const rows = db.all<{
		date: string;
		temp_max_c: number | null;
		temp_min_c: number | null;
		temp_mean_c: number | null;
		cloud_cover_pct: number | null;
		precipitation_mm: number | null;
		shortwave_radiation_mj_m2: number | null;
		sunshine_duration_s: number | null;
	}>(sql`
    SELECT date, temp_max_c, temp_min_c, temp_mean_c, cloud_cover_pct,
           precipitation_mm, shortwave_radiation_mj_m2, sunshine_duration_s
    FROM weather_daily
    WHERE date BETWEEN ${from} AND ${to}
    ORDER BY date ASC
  `);

	return rows.map((r) => ({
		date: r.date,
		tempMaxC: r.temp_max_c,
		tempMinC: r.temp_min_c,
		tempMeanC: r.temp_mean_c,
		cloudCoverPct: r.cloud_cover_pct,
		precipitationMm: r.precipitation_mm,
		shortwaveRadiationMjM2: r.shortwave_radiation_mj_m2,
		sunshineDurationS: r.sunshine_duration_s,
	}));
}

export interface WeatherStatus {
	dayCount: number;
	minDate: string | null;
	maxDate: string | null;
}

export function getWeatherStatus(): WeatherStatus {
	const row = db.get<{ n: number; min: string | null; max: string | null }>(
		sql`SELECT COUNT(*) AS n, MIN(date) AS min, MAX(date) AS max FROM weather_daily`,
	);
	return {
		dayCount: row?.n ?? 0,
		minDate: row?.min ?? null,
		maxDate: row?.max ?? null,
	};
}
