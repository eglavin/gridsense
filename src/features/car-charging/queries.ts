import { TZDate } from "@date-fns/tz";
import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { getAppSettings } from "@/features/app-settings/settings";
import { getHourlyCloudCover } from "@/features/weather/queries";

export interface HourlyChargeRow {
	hour: string;
	netGridImportWh: number;
	netGridExportWh: number;
	evChargeSolarWh: number;
	evChargeGridWh: number;
	cloudCoverPct: number | null;
}

/** ESB's half-hour readings bucketed into the local hour each belongs to, keyed the same way car_charger_hourly labels its own hourly rows — by the END of the hour the reading covers (e.g. both the 12:30 and 13:00 readings, covering the 12:00-13:00 period, are keyed "13:00") — so the two sources line up hour-for-hour rather than being off by one. */
function getEsbHourlyBuckets(
	date: string,
	timezone: string,
): Map<string, { importWh: number; exportWh: number }> {
	const rows = db.all<{
		interval_end: string;
		import_kwh: number | null;
		export_kwh: number | null;
	}>(sql`
    SELECT interval_end, import_kwh, export_kwh
    FROM esb_grid_30min
    WHERE local_date = ${date}
    ORDER BY interval_end ASC
  `);

	const buckets = new Map<string, { importWh: number; exportWh: number }>();
	for (const r of rows) {
		const zoned = new TZDate(r.interval_end, timezone);
		// On the half-hour, round up to the next hour label; exactly on the hour
		// already is that hour's label.
		const hour = (zoned.getHours() + (zoned.getMinutes() > 0 ? 1 : 0)) % 24;
		const key = `${String(hour).padStart(2, "0")}:00`;

		const bucket = buckets.get(key) ?? { importWh: 0, exportWh: 0 };
		bucket.importWh += (r.import_kwh ?? 0) * 1000;
		bucket.exportWh += (r.export_kwh ?? 0) * 1000;
		buckets.set(key, bucket);
	}
	return buckets;
}

export function getHourlyForDay(date: string): HourlyChargeRow[] {
	const { carChargingGridSource, timezone } = getAppSettings();

	const rows = db.all<{
		timestamp: string;
		net_grid_import_wh: number | null;
		net_grid_export_wh: number | null;
		ev_charge_solar_wh: number | null;
		ev_charge_grid_wh: number | null;
	}>(sql`
    SELECT
      timestamp,
      net_grid_import_wh,
      net_grid_export_wh,
      (diverter_l1_wh + diverter_l2_wh + diverter_l3_wh) AS ev_charge_solar_wh,
      (boosted_l1_wh + boosted_l2_wh + boosted_l3_wh) AS ev_charge_grid_wh
    FROM car_charger_hourly
    WHERE local_date = ${date}
    ORDER BY timestamp ASC
  `);

	// EV charge (diverter/boosted) always comes from the car charger — ESB has
	// no equivalent breakdown. Only grid import/export swaps source, and only
	// ever shows one source's figure: no blending between the two.
	const esbBuckets = carChargingGridSource === "esb" ? getEsbHourlyBuckets(date, timezone) : null;

	const cloudCover = getHourlyCloudCover(date);

	return rows.map((r) => {
		const hour = r.timestamp.slice(11, 16);
		return {
			hour,
			cloudCoverPct: cloudCover.get(hour) ?? null,
			netGridImportWh:
				carChargingGridSource === "esb"
					? (esbBuckets?.get(hour)?.importWh ?? 0)
					: (r.net_grid_import_wh ?? 0),
			netGridExportWh:
				carChargingGridSource === "esb"
					? (esbBuckets?.get(hour)?.exportWh ?? 0)
					: (r.net_grid_export_wh ?? 0),
			evChargeSolarWh: r.ev_charge_solar_wh ?? 0,
			evChargeGridWh: r.ev_charge_grid_wh ?? 0,
		};
	});
}

export interface MonthlyChargeRow {
	month: string;
	evChargeSolarKwh: number;
	evChargeGridKwh: number;
}

export function getMonthlyChargeTotals(): MonthlyChargeRow[] {
	const rows = db.all<{
		month: string;
		ev_charge_solar_kwh: number | null;
		ev_charge_grid_kwh: number | null;
	}>(sql`
    SELECT
      substr(local_date, 1, 7) AS month,
      SUM(diverter_l1_wh + diverter_l2_wh + diverter_l3_wh) / 1000.0 AS ev_charge_solar_kwh,
      SUM(boosted_l1_wh + boosted_l2_wh + boosted_l3_wh) / 1000.0 AS ev_charge_grid_kwh
    FROM car_charger_hourly
    GROUP BY month
    ORDER BY month ASC
  `);

	return rows.map((r) => ({
		month: r.month,
		evChargeSolarKwh: r.ev_charge_solar_kwh ?? 0,
		evChargeGridKwh: r.ev_charge_grid_kwh ?? 0,
	}));
}

export function getCarChargerDateRange(): {
	min: string | null;
	max: string | null;
} {
	const row = db.get<{ min: string | null; max: string | null }>(
		sql`SELECT MIN(local_date) AS min, MAX(local_date) AS max FROM car_charger_hourly`,
	);
	return row ?? { min: null, max: null };
}

export function getDaysWithCharging(limit = 30): string[] {
	const rows = db.all<{ local_date: string }>(sql`
    SELECT local_date
    FROM car_charger_hourly
    GROUP BY local_date
    -- 5 Wh (0.005 kWh) matches the 2-decimal-place rounding used for kWh on
    -- the day view's stat cards, so we don't land on a day that'd show 0.00.
    HAVING SUM(diverter_l1_wh + diverter_l2_wh + diverter_l3_wh + boosted_l1_wh + boosted_l2_wh + boosted_l3_wh) > 5
    ORDER BY local_date DESC
    LIMIT ${limit}
  `);
	return rows.map((r) => r.local_date);
}

export interface TimelineDay {
	date: string;
	chargedKwh: number;
}

/** Charging totals for every day from `centerDate - daysBefore` to `centerDate + daysAfter`, gaps included as zero. */
export function getChargingTimeline(
	centerDate: string,
	daysBefore = 30,
	daysAfter = 30,
): TimelineDay[] {
	const start = subDays(parseISO(centerDate), daysBefore);
	const end = addDays(parseISO(centerDate), daysAfter);
	const startStr = format(start, "yyyy-MM-dd");
	const endStr = format(end, "yyyy-MM-dd");

	const rows = db.all<{ local_date: string; charged_wh: number | null }>(sql`
    SELECT
      local_date,
      SUM(diverter_l1_wh + diverter_l2_wh + diverter_l3_wh + boosted_l1_wh + boosted_l2_wh + boosted_l3_wh) AS charged_wh
    FROM car_charger_hourly
    WHERE local_date BETWEEN ${startStr} AND ${endStr}
    GROUP BY local_date
  `);

	const byDate = new Map(rows.map((r) => [r.local_date, r.charged_wh ?? 0]));

	const totalDays = differenceInCalendarDays(end, start) + 1;
	return Array.from({ length: totalDays }, (_, i) => {
		const dateStr = format(addDays(start, i), "yyyy-MM-dd");
		return { date: dateStr, chargedKwh: (byDate.get(dateStr) ?? 0) / 1000 };
	});
}
