import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { appSettings } from "@/db/schema";

export type GridSource = "esb" | "car_charger";
export type CostSavingsGridSource = "blended" | GridSource;

export interface AppSettings {
	/** When false, grid import/export figures on Overview/Solar/Cost & Savings (when its own source is "blended") come from ESB metered readings only — days without an ESB reading are left out rather than falling back to the car charger's whole-house CT clamp. */
	allowZappiGridFallback: boolean;
	/** Which source the Car Charging page's own grid import/export figures come from. Independent of allowZappiGridFallback — no blending, whichever source is picked shows 0 for a period it has no reading for. */
	carChargingGridSource: GridSource;
	/** Which source Cost & Savings' grid import/export figures come from. "blended" (default) defers to allowZappiGridFallback and keeps the page's per-source-day transparency notes; "esb"/"car_charger" force a single source with no blending, same as Car Charging's option. */
	costSavingsGridSource: CostSavingsGridSource;
	/** Coordinates the weather backfill queries Open-Meteo for. Defaults to central Dublin. */
	weatherLatitude: number;
	weatherLongitude: number;
	/** IANA timezone every "local day" calculation (ingestion, hourly bucketing, "today") is anchored to. */
	timezone: string;
}

const DEFAULT_SETTINGS: AppSettings = {
	allowZappiGridFallback: true,
	carChargingGridSource: "esb",
	costSavingsGridSource: "blended",
	weatherLatitude: 53.3498,
	weatherLongitude: -6.2603,
	timezone: "Europe/Dublin",
};

export function getAppSettings(): AppSettings {
	const row = db.select().from(appSettings).where(eq(appSettings.id, 1)).get();
	return row
		? {
				allowZappiGridFallback: row.allowZappiGridFallback,
				carChargingGridSource: row.carChargingGridSource,
				costSavingsGridSource: row.costSavingsGridSource,
				weatherLatitude: row.weatherLatitude,
				weatherLongitude: row.weatherLongitude,
				timezone: row.timezone,
			}
		: DEFAULT_SETTINGS;
}
