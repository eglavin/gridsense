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
