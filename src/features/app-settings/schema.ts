import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Singleton row (id always 1) holding app-wide configuration — which data
// sources are allowed to feed shared calculations across pages.
export const appSettings = sqliteTable("app_settings", {
	id: integer("id").primaryKey(),
	// Governs the blended fallback used by Overview, Solar self-consumption,
	// and Cost & Savings (when its own source below is "blended"): ESB
	// preferred, Zappi's whole-house CT clamp fills gaps when true.
	allowZappiGridFallback: integer("allow_zappi_grid_fallback", {
		mode: "boolean",
	})
		.notNull()
		.default(true),
	// Which source the Car Charging page's grid import/export figures come
	// from — independent of allowZappiGridFallback. No blending: whichever
	// source is picked, a period with no reading from it shows 0.
	carChargingGridSource: text("car_charging_grid_source", {
		enum: ["esb", "car_charger"],
	})
		.notNull()
		.default("esb"),
	// Same either/or choice for Cost & Savings, plus a "blended" option (the
	// default) that defers to allowZappiGridFallback and keeps the page's
	// existing per-source-day transparency notes.
	costSavingsGridSource: text("cost_savings_grid_source", {
		enum: ["blended", "esb", "car_charger"],
	})
		.notNull()
		.default("blended"),
	// Coordinates the weather backfill queries Open-Meteo for — defaults to
	// central Dublin, matching the timezone below.
	weatherLatitude: real("weather_latitude").notNull().default(53.3498),
	weatherLongitude: real("weather_longitude").notNull().default(-6.2603),
	// IANA timezone every "local day" calculation (ingestion, hourly
	// bucketing, "today") is anchored to.
	timezone: text("timezone").notNull().default("Europe/Dublin"),
});
