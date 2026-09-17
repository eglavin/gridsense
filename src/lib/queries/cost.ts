import { tz } from "@date-fns/tz";
import { addMonths, format, parseISO } from "date-fns";
import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { getAppSettings } from "@/lib/settings";

export type TariffDirection = "import" | "export";

export interface TariffRate {
	direction: TariffDirection;
	eurPerKwh: number;
	effectiveFrom: string;
}

export function getAllTariffRates(): TariffRate[] {
	const rows = db.all<{
		direction: TariffDirection;
		eur_per_kwh: number;
		effective_from: string;
	}>(
		sql`SELECT direction, eur_per_kwh, effective_from FROM tariff_rates ORDER BY effective_from ASC`,
	);

	return rows.map((r) => ({
		direction: r.direction,
		eurPerKwh: r.eur_per_kwh,
		effectiveFrom: r.effective_from,
	}));
}

/** The rate in effect on `date`: whichever rate has the latest effectiveFrom on or before it. */
export function findRateForDate(rates: TariffRate[], date: string): number | null {
	let best: TariffRate | null = null;
	for (const r of rates) {
		if (r.effectiveFrom <= date && (!best || r.effectiveFrom > best.effectiveFrom)) {
			best = r;
		}
	}
	return best?.eurPerKwh ?? null;
}

export interface MonthlyTariffRow {
	month: string; // YYYY-MM
	importRate: number | null;
	exportRate: number | null;
}

/** One point per month, from the earliest configured rate up to the current month — the rate in effect on the 1st of each month. */
export function getMonthlyTariffHistory(): MonthlyTariffRow[] {
	const rates = getAllTariffRates();
	if (rates.length === 0) return [];

	const importRates = rates.filter((r) => r.direction === "import");
	const exportRates = rates.filter((r) => r.direction === "export");

	const earliestFrom = rates.reduce(
		(min, r) => (r.effectiveFrom < min ? r.effectiveFrom : min),
		rates[0].effectiveFrom,
	);
	// "Now" is anchored to the configured house timezone, not the server's,
	// so the current month doesn't flip a day early or late depending on
	// where this happens to be deployed.
	const { timezone } = getAppSettings();
	const endMonth = format(new Date(), "yyyy-MM", { in: tz(timezone) });

	let cursor = parseISO(`${earliestFrom.slice(0, 7)}-01`);
	let monthStr = format(cursor, "yyyy-MM");

	const rows: MonthlyTariffRow[] = [];
	while (monthStr <= endMonth) {
		rows.push({
			month: monthStr,
			importRate: findRateForDate(importRates, `${monthStr}-01`),
			exportRate: findRateForDate(exportRates, `${monthStr}-01`),
		});

		cursor = addMonths(cursor, 1);
		monthStr = format(cursor, "yyyy-MM");
	}

	return rows;
}

export interface CostSavingsDayRow {
	date: string;
	gridImportKwh: number;
	gridExportKwh: number;
	incomeEur: number;
	importCostEur: number | null;
	netEur: number | null;
	/** Whether the grid figures for this day are ESB-metered or estimated from the car charger's whole-house CT clamp. */
	gridSource: "esb" | "car_charger";
	/** "rate" = grid export × the configured export rate; "solar" = the solar export's own reported income, used only when no export rate is configured; "none" = neither is available. */
	incomeSource: "solar" | "rate" | "none";
}

export function getCostSavingsDaily(from: string, to: string): CostSavingsDayRow[] {
	const { allowZappiGridFallback, costSavingsGridSource } = getAppSettings();

	// "blended" (default) defers to the shared fallback toggle, same as
	// Overview/Solar. "esb"/"car_charger" force a single source outright —
	// like Car Charging's own source option — with no blending between them.
	const useZappiFallback = costSavingsGridSource === "blended" && allowZappiGridFallback;

	const datesClause =
		costSavingsGridSource === "esb"
			? sql`SELECT date FROM esb_daily`
			: costSavingsGridSource === "car_charger"
				? sql`SELECT date FROM zappi_daily`
				: useZappiFallback
					? sql`SELECT date FROM esb_daily UNION SELECT date FROM zappi_daily`
					: sql`SELECT date FROM esb_daily`;

	const importClause =
		costSavingsGridSource === "car_charger"
			? sql`z.import_kwh`
			: useZappiFallback
				? sql`COALESCE(e.import_kwh, z.import_kwh)`
				: sql`e.import_kwh`;

	const exportClause =
		costSavingsGridSource === "car_charger"
			? sql`z.export_kwh`
			: useZappiFallback
				? sql`COALESCE(e.export_kwh, z.export_kwh)`
				: sql`e.export_kwh`;

	const gridSourceClause =
		costSavingsGridSource === "esb"
			? sql`'esb'`
			: costSavingsGridSource === "car_charger"
				? sql`'car_charger'`
				: sql`CASE WHEN e.date IS NOT NULL THEN 'esb' ELSE 'car_charger' END`;

	const rows = db.all<{
		date: string;
		grid_import_kwh: number | null;
		grid_export_kwh: number | null;
		income_eur: number | null;
		grid_source: "esb" | "car_charger";
	}>(sql`
    WITH esb_daily AS (
      SELECT local_date AS date, SUM(import_kwh) AS import_kwh, SUM(export_kwh) AS export_kwh
      FROM esb_grid_30min
      WHERE local_date BETWEEN ${from} AND ${to}
      GROUP BY local_date
    ),
    zappi_daily AS (
      SELECT local_date AS date, SUM(net_grid_import_wh) / 1000.0 AS import_kwh, SUM(net_grid_export_wh) / 1000.0 AS export_kwh
      FROM car_charger_hourly
      WHERE local_date BETWEEN ${from} AND ${to}
      GROUP BY local_date
    ),
    solar_income AS (
      SELECT date, MAX(income_eur) AS income_eur
      FROM solar_daily
      WHERE date BETWEEN ${from} AND ${to}
      GROUP BY date
    ),
    dates AS ( ${datesClause} )
    SELECT
      d.date AS date,
      ${importClause} AS grid_import_kwh,
      ${exportClause} AS grid_export_kwh,
      s.income_eur AS income_eur,
      ${gridSourceClause} AS grid_source
    FROM dates d
    LEFT JOIN esb_daily e ON e.date = d.date
    LEFT JOIN zappi_daily z ON z.date = d.date
    LEFT JOIN solar_income s ON s.date = d.date
    ORDER BY d.date ASC
  `);

	const rates = getAllTariffRates();
	const importRates = rates.filter((r) => r.direction === "import");
	const exportRates = rates.filter((r) => r.direction === "export");

	return rows.map((r) => {
		const gridImportKwh = r.grid_import_kwh ?? 0;
		const gridExportKwh = r.grid_export_kwh ?? 0;
		const importRate = findRateForDate(importRates, r.date);
		const importCostEur = importRate !== null ? gridImportKwh * importRate : null;

		// Prefer the configured export rate — the solar portal's own reported
		// income can go stale if that export isn't re-uploaded regularly, while
		// the rate reflects whatever you've actually set. Solar income is only
		// used as a fallback for days without an export rate configured.
		let incomeEur: number;
		let incomeSource: CostSavingsDayRow["incomeSource"];
		const exportRate = findRateForDate(exportRates, r.date);
		if (exportRate !== null) {
			incomeEur = gridExportKwh * exportRate;
			incomeSource = "rate";
		} else if (r.income_eur !== null) {
			incomeEur = r.income_eur;
			incomeSource = "solar";
		} else {
			incomeEur = 0;
			incomeSource = "none";
		}

		return {
			date: r.date,
			gridImportKwh,
			gridExportKwh,
			incomeEur,
			importCostEur,
			netEur: importCostEur !== null ? incomeEur - importCostEur : null,
			gridSource: r.grid_source,
			incomeSource,
		};
	});
}
