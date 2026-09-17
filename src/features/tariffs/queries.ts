import { tz } from "@date-fns/tz";
import { addMonths, format, parseISO } from "date-fns";
import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { getAppSettings } from "@/features/app-settings/settings";

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
