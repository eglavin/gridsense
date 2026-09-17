import { and, eq, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";

import type { CarChargerRow } from "./car-charger";
import type { EsbGridRow } from "./esb";
import type { SolarDailyRow } from "./solar";

const CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		chunks.push(items.slice(i, i + size));
	}
	return chunks;
}

export interface UpsertResult {
	rowsInserted: number;
	rowsUpdated: number;
}

export function upsertCarChargerRows(
	db: BetterSQLite3Database<typeof schema>,
	rows: CarChargerRow[],
	sourceFile: string,
): UpsertResult {
	let rowsInserted = 0;
	let rowsUpdated = 0;

	db.transaction((tx) => {
		for (const batch of chunk(rows, CHUNK_SIZE)) {
			const timestamps = batch.map((r) => r.timestamp);
			const existingTimestamps = new Set(
				tx
					.select({ timestamp: schema.carChargerHourly.timestamp })
					.from(schema.carChargerHourly)
					.where(
						and(
							eq(schema.carChargerHourly.serialNumber, batch[0].serialNumber),
							inArray(schema.carChargerHourly.timestamp, timestamps),
						),
					)
					.all()
					.map((r) => r.timestamp),
			);

			tx.insert(schema.carChargerHourly)
				.values(batch.map((row) => ({ ...row, sourceFile })))
				.onConflictDoUpdate({
					target: [schema.carChargerHourly.serialNumber, schema.carChargerHourly.timestamp],
					set: {
						dataCoveragePct: sql.raw("excluded.data_coverage_pct"),
						netGridImportWh: sql.raw("excluded.net_grid_import_wh"),
						netGridExportWh: sql.raw("excluded.net_grid_export_wh"),
						totalGenerationWh: sql.raw("excluded.total_generation_wh"),
						hybridInverterLoadWh: sql.raw("excluded.hybrid_inverter_load_wh"),
						minFrequencyChz: sql.raw("excluded.min_frequency_chz"),
						maxFrequencyChz: sql.raw("excluded.max_frequency_chz"),
						avgFrequencyChz: sql.raw("excluded.avg_frequency_chz"),
						minVoltageL1Dv: sql.raw("excluded.min_voltage_l1_dv"),
						maxVoltageL1Dv: sql.raw("excluded.max_voltage_l1_dv"),
						avgVoltageL1Dv: sql.raw("excluded.avg_voltage_l1_dv"),
						minVoltageL2Dv: sql.raw("excluded.min_voltage_l2_dv"),
						maxVoltageL2Dv: sql.raw("excluded.max_voltage_l2_dv"),
						avgVoltageL2Dv: sql.raw("excluded.avg_voltage_l2_dv"),
						minVoltageL3Dv: sql.raw("excluded.min_voltage_l3_dv"),
						maxVoltageL3Dv: sql.raw("excluded.max_voltage_l3_dv"),
						avgVoltageL3Dv: sql.raw("excluded.avg_voltage_l3_dv"),
						diverterL1Wh: sql.raw("excluded.diverter_l1_wh"),
						diverterL2Wh: sql.raw("excluded.diverter_l2_wh"),
						diverterL3Wh: sql.raw("excluded.diverter_l3_wh"),
						boostedL1Wh: sql.raw("excluded.boosted_l1_wh"),
						boostedL2Wh: sql.raw("excluded.boosted_l2_wh"),
						boostedL3Wh: sql.raw("excluded.boosted_l3_wh"),
						ct1PositiveWh: sql.raw("excluded.ct1_positive_wh"),
						ct1NegativeWh: sql.raw("excluded.ct1_negative_wh"),
						ct2PositiveWh: sql.raw("excluded.ct2_positive_wh"),
						ct2NegativeWh: sql.raw("excluded.ct2_negative_wh"),
						ct3PositiveWh: sql.raw("excluded.ct3_positive_wh"),
						ct3NegativeWh: sql.raw("excluded.ct3_negative_wh"),
						sourceFile: sql.raw("excluded.source_file"),
						updatedAt: sql`(CURRENT_TIMESTAMP)`,
					},
				})
				.run();

			// Source exports occasionally repeat a timestamp (seen once in a Zappi
			// export, cause unclear). Dedupe by key so a repeated row in the same
			// upload counts as one insert, not two.
			const uniqueTimestamps = new Set(timestamps);
			const newRows = uniqueTimestamps.size - existingTimestamps.size;
			rowsInserted += newRows;
			rowsUpdated += batch.length - newRows;
		}
	});

	return { rowsInserted, rowsUpdated };
}

export function upsertSolarRows(
	db: BetterSQLite3Database<typeof schema>,
	rows: SolarDailyRow[],
	plantName: string,
	sourceFile: string,
): UpsertResult {
	let rowsInserted = 0;
	let rowsUpdated = 0;

	db.transaction((tx) => {
		for (const batch of chunk(rows, CHUNK_SIZE)) {
			const dates = batch.map((r) => r.date);
			const existingDates = new Set(
				tx
					.select({ date: schema.solarDaily.date })
					.from(schema.solarDaily)
					.where(
						and(eq(schema.solarDaily.plantName, plantName), inArray(schema.solarDaily.date, dates)),
					)
					.all()
					.map((r) => r.date),
			);

			tx.insert(schema.solarDaily)
				.values(batch.map((row) => ({ ...row, plantName, sourceFile })))
				.onConflictDoUpdate({
					target: [schema.solarDaily.plantName, schema.solarDaily.date],
					set: {
						energyGeneratedKwh: sql.raw("excluded.energy_generated_kwh"),
						loadConsumptionKwh: sql.raw("excluded.load_consumption_kwh"),
						importEnergyKwh: sql.raw("excluded.import_energy_kwh"),
						exportEnergyKwh: sql.raw("excluded.export_energy_kwh"),
						selfConsumptionKwh: sql.raw("excluded.self_consumption_kwh"),
						equivalentHours: sql.raw("excluded.equivalent_hours"),
						incomeEur: sql.raw("excluded.income_eur"),
						co2SavedTons: sql.raw("excluded.co2_saved_tons"),
						treesSaved: sql.raw("excluded.trees_saved"),
						sourceFile: sql.raw("excluded.source_file"),
						updatedAt: sql`(CURRENT_TIMESTAMP)`,
					},
				})
				.run();

			const uniqueDates = new Set(dates);
			const newRows = uniqueDates.size - existingDates.size;
			rowsInserted += newRows;
			rowsUpdated += batch.length - newRows;
		}
	});

	return { rowsInserted, rowsUpdated };
}

export function upsertEsbGridRows(
	db: BetterSQLite3Database<typeof schema>,
	rows: EsbGridRow[],
	sourceFile: string,
): UpsertResult {
	let rowsInserted = 0;
	let rowsUpdated = 0;

	db.transaction((tx) => {
		for (const batch of chunk(rows, CHUNK_SIZE)) {
			const intervalEnds = batch.map((r) => r.intervalEnd);
			const existingIntervalEnds = new Set(
				tx
					.select({ intervalEnd: schema.esbGrid30Min.intervalEnd })
					.from(schema.esbGrid30Min)
					.where(
						and(
							eq(schema.esbGrid30Min.mprn, batch[0].mprn),
							inArray(schema.esbGrid30Min.intervalEnd, intervalEnds),
						),
					)
					.all()
					.map((r) => r.intervalEnd),
			);

			tx.insert(schema.esbGrid30Min)
				.values(batch.map((row) => ({ ...row, sourceFile })))
				.onConflictDoUpdate({
					target: [schema.esbGrid30Min.mprn, schema.esbGrid30Min.intervalEnd],
					set: {
						meterSerialNumber: sql.raw("excluded.meter_serial_number"),
						importKwh: sql.raw("excluded.import_kwh"),
						exportKwh: sql.raw("excluded.export_kwh"),
						sourceFile: sql.raw("excluded.source_file"),
						updatedAt: sql`(CURRENT_TIMESTAMP)`,
					},
				})
				.run();

			const newRows = intervalEnds.length - existingIntervalEnds.size;
			rowsInserted += newRows;
			rowsUpdated += batch.length - newRows;
		}
	});

	return { rowsInserted, rowsUpdated };
}
