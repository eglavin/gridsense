import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const carChargerHourly = sqliteTable(
	"car_charger_hourly",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		serialNumber: text("serial_number").notNull(),
		timestamp: text("timestamp").notNull(),
		localDate: text("local_date").notNull(),
		dataCoveragePct: real("data_coverage_pct"),
		// Whole-house grid exchange, measured by a CT clamp on the incoming powerline.
		netGridImportWh: real("net_grid_import_wh"),
		netGridExportWh: real("net_grid_export_wh"),
		totalGenerationWh: real("total_generation_wh"),
		hybridInverterLoadWh: real("hybrid_inverter_load_wh"),
		// Frequency/voltage diagnostics, stored but not surfaced in v1 UI.
		minFrequencyChz: real("min_frequency_chz"),
		maxFrequencyChz: real("max_frequency_chz"),
		avgFrequencyChz: real("avg_frequency_chz"),
		minVoltageL1Dv: real("min_voltage_l1_dv"),
		maxVoltageL1Dv: real("max_voltage_l1_dv"),
		avgVoltageL1Dv: real("avg_voltage_l1_dv"),
		minVoltageL2Dv: real("min_voltage_l2_dv"),
		maxVoltageL2Dv: real("max_voltage_l2_dv"),
		avgVoltageL2Dv: real("avg_voltage_l2_dv"),
		minVoltageL3Dv: real("min_voltage_l3_dv"),
		maxVoltageL3Dv: real("max_voltage_l3_dv"),
		avgVoltageL3Dv: real("avg_voltage_l3_dv"),
		// EV charging sourced from solar surplus ("eco" divert mode).
		diverterL1Wh: real("diverter_l1_wh"),
		diverterL2Wh: real("diverter_l2_wh"),
		diverterL3Wh: real("diverter_l3_wh"),
		// EV charging force-drawn from the grid ("boost" mode).
		boostedL1Wh: real("boosted_l1_wh"),
		boostedL2Wh: real("boosted_l2_wh"),
		boostedL3Wh: real("boosted_l3_wh"),
		// Unlabeled external CT channels (unconfirmed circuit wiring, e.g. immersion heater).
		ct1PositiveWh: real("ct1_positive_wh"),
		ct1NegativeWh: real("ct1_negative_wh"),
		ct2PositiveWh: real("ct2_positive_wh"),
		ct2NegativeWh: real("ct2_negative_wh"),
		ct3PositiveWh: real("ct3_positive_wh"),
		ct3NegativeWh: real("ct3_negative_wh"),
		sourceFile: text("source_file"),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text("updated_at"),
	},
	(table) => [
		unique("car_charger_hourly_serial_timestamp_unique").on(table.serialNumber, table.timestamp),
		index("car_charger_hourly_local_date_idx").on(table.localDate),
	],
);

export const solarDaily = sqliteTable(
	"solar_daily",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		plantName: text("plant_name").notNull(),
		date: text("date").notNull(),
		energyGeneratedKwh: real("energy_generated_kwh"),
		loadConsumptionKwh: real("load_consumption_kwh"),
		importEnergyKwh: real("import_energy_kwh"),
		exportEnergyKwh: real("export_energy_kwh"),
		selfConsumptionKwh: real("self_consumption_kwh"),
		equivalentHours: real("equivalent_hours"),
		incomeEur: real("income_eur"),
		co2SavedTons: real("co2_saved_tons"),
		treesSaved: real("trees_saved"),
		sourceFile: text("source_file"),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text("updated_at"),
	},
	(table) => [
		unique("solar_daily_plant_date_unique").on(table.plantName, table.date),
		index("solar_daily_date_idx").on(table.date),
	],
);

export const esbGrid30Min = sqliteTable(
	"esb_grid_30min",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		mprn: text("mprn").notNull(),
		meterSerialNumber: text("meter_serial_number"),
		// End of the 30-minute interval, ISO UTC (ESB reports local Europe/Dublin time).
		intervalEnd: text("interval_end").notNull(),
		localDate: text("local_date").notNull(),
		importKwh: real("import_kwh"),
		exportKwh: real("export_kwh"),
		sourceFile: text("source_file"),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text("updated_at"),
	},
	(table) => [
		unique("esb_grid_30min_mprn_interval_end_unique").on(table.mprn, table.intervalEnd),
		index("esb_grid_30min_local_date_idx").on(table.localDate),
	],
);

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

// Daily historical weather, backfilled on demand from Open-Meteo's free
// archive API (no API key) rather than uploaded — see settings/actions.ts
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

export const ingestionLog = sqliteTable("ingestion_log", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	sourceType: text("source_type", {
		enum: ["car_charger", "solar", "esb"],
	}).notNull(),
	fileName: text("file_name").notNull(),
	rowsParsed: integer("rows_parsed").notNull(),
	rowsInserted: integer("rows_inserted").notNull(),
	rowsUpdated: integer("rows_updated").notNull(),
	dateRangeStart: text("date_range_start"),
	dateRangeEnd: text("date_range_end"),
	warnings: text("warnings"),
	uploadedAt: text("uploaded_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
});
