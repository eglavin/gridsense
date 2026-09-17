import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { getAppSettings } from "@/features/app-settings/settings";

export interface SolarDayRow {
	date: string;
	energyGeneratedKwh: number;
	/** Generated − exported (clamped at 0), using the same grid export figure as Overview & Cost pages. Null on a day with no grid export figure available under the current fallback setting (Settings → Options) — left out of the self-consumption chart rather than assumed to be 0. */
	selfConsumptionKwh: number | null;
	exportEnergyKwh: number;
	co2SavedTons: number;
	treesSaved: number;
}

export function getSolarDaily(from: string, to: string): SolarDayRow[] {
	const { allowZappiGridFallback } = getAppSettings();

	const rows = db.all<{
		date: string;
		energy_generated_kwh: number | null;
		export_energy_kwh: number | null;
		grid_export_kwh: number | null;
		co2_saved_tons: number | null;
		trees_saved: number | null;
	}>(sql`
    WITH esb_daily AS (
      SELECT local_date AS date, SUM(export_kwh) AS export_kwh
      FROM esb_grid_30min
      WHERE local_date BETWEEN ${from} AND ${to}
      GROUP BY local_date
    ),
    zappi_daily AS (
      SELECT local_date AS date, SUM(net_grid_export_wh) / 1000.0 AS export_kwh
      FROM car_charger_hourly
      WHERE local_date BETWEEN ${from} AND ${to}
      GROUP BY local_date
    )
    SELECT
      s.date AS date,
      s.energy_generated_kwh AS energy_generated_kwh,
      s.export_energy_kwh AS export_energy_kwh,
      ${
				allowZappiGridFallback
					? sql`COALESCE(e.export_kwh, z.export_kwh, s.export_energy_kwh)`
					: sql`e.export_kwh`
			} AS grid_export_kwh,
      s.co2_saved_tons AS co2_saved_tons,
      s.trees_saved AS trees_saved
    FROM solar_daily s
    LEFT JOIN esb_daily e ON e.date = s.date
    LEFT JOIN zappi_daily z ON z.date = s.date
    WHERE s.date BETWEEN ${from} AND ${to}
    ORDER BY s.date ASC
  `);

	return rows.map((r) => {
		const energyGeneratedKwh = r.energy_generated_kwh ?? 0;
		return {
			date: r.date,
			energyGeneratedKwh,
			selfConsumptionKwh:
				r.grid_export_kwh !== null ? Math.max(0, energyGeneratedKwh - r.grid_export_kwh) : null,
			exportEnergyKwh: r.export_energy_kwh ?? 0,
			co2SavedTons: r.co2_saved_tons ?? 0,
			treesSaved: r.trees_saved ?? 0,
		};
	});
}

export interface MonthlyByYearRow {
	month: number;
	year: number;
	energyGeneratedKwh: number;
}

export function getSolarMonthlyByYear(): MonthlyByYearRow[] {
	const rows = db.all<{
		year: string;
		month: string;
		energy_generated_kwh: number | null;
	}>(sql`
    SELECT
      substr(date, 1, 4) AS year,
      substr(date, 6, 2) AS month,
      SUM(energy_generated_kwh) AS energy_generated_kwh
    FROM solar_daily
    GROUP BY year, month
    ORDER BY year ASC, month ASC
  `);

	return rows.map((r) => ({
		year: Number(r.year),
		month: Number(r.month),
		energyGeneratedKwh: r.energy_generated_kwh ?? 0,
	}));
}

export function getSolarDateRange(): {
	min: string | null;
	max: string | null;
} {
	const row = db.get<{ min: string | null; max: string | null }>(
		sql`SELECT MIN(date) AS min, MAX(date) AS max FROM solar_daily`,
	);
	return row ?? { min: null, max: null };
}
