import { tz } from "@date-fns/tz";
import { parse } from "csv-parse/sync";
import { format } from "date-fns";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { z } from "zod";

import * as schema from "@/db/schema";
import type { ParseError } from "@/lib/csv-ingest";
import { chunk } from "@/lib/csv-ingest";

import { carChargerHourly } from "./schema";

const numeric = z.coerce.number().nullable().catch(null);

export const carChargerCsvRowSchema = z.object({
	"Serial Number": z.string().min(1),
	Timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
	"Data Coverage (%)": numeric,
	"Net Grid Import (Wh)": numeric,
	"Net Grid Export (Wh)": numeric,
	"Total Generation (Wh)": numeric,
	"Hybrid Inverter Load (Wh)": numeric,
	"Min Frequency (cHz)": numeric,
	"Max Frequency (cHz)": numeric,
	"Avg Frequency (cHz)": numeric,
	"Min Voltage (L1) (dV)": numeric,
	"Max Voltage (L1) (dV)": numeric,
	"Avg Voltage (L1) (dV)": numeric,
	"Min Voltage (L2) (dV)": numeric,
	"Max Voltage (L2) (dV)": numeric,
	"Avg Voltage (L2) (dV)": numeric,
	"Min Voltage (L3) (dV)": numeric,
	"Max Voltage (L3) (dV)": numeric,
	"Avg Voltage (L3) (dV)": numeric,
	"Diverter Energy (L1) (Wh)": numeric,
	"Diverter Energy (L2) (Wh)": numeric,
	"Diverter Energy (L3) (Wh)": numeric,
	"Boosted Energy (L1) (Wh)": numeric,
	"Boosted Energy (L2) (Wh)": numeric,
	"Boosted Energy (L3) (Wh)": numeric,
	"External CT Type 1 Positive (Wh)": numeric,
	"External CT Type 1 Negative (Wh)": numeric,
	"External CT Type 2 Positive (Wh)": numeric,
	"External CT Type 2 Negative (Wh)": numeric,
	"External CT Type 3 Positive (Wh)": numeric,
	"External CT Type 3 Negative (Wh)": numeric,
});

export type CarChargerCsvRow = z.infer<typeof carChargerCsvRowSchema>;

export interface CarChargerRow {
	serialNumber: string;
	timestamp: string;
	localDate: string;
	dataCoveragePct: number | null;
	netGridImportWh: number | null;
	netGridExportWh: number | null;
	totalGenerationWh: number | null;
	hybridInverterLoadWh: number | null;
	minFrequencyChz: number | null;
	maxFrequencyChz: number | null;
	avgFrequencyChz: number | null;
	minVoltageL1Dv: number | null;
	maxVoltageL1Dv: number | null;
	avgVoltageL1Dv: number | null;
	minVoltageL2Dv: number | null;
	maxVoltageL2Dv: number | null;
	avgVoltageL2Dv: number | null;
	minVoltageL3Dv: number | null;
	maxVoltageL3Dv: number | null;
	avgVoltageL3Dv: number | null;
	diverterL1Wh: number | null;
	diverterL2Wh: number | null;
	diverterL3Wh: number | null;
	boostedL1Wh: number | null;
	boostedL2Wh: number | null;
	boostedL3Wh: number | null;
	ct1PositiveWh: number | null;
	ct1NegativeWh: number | null;
	ct2PositiveWh: number | null;
	ct2NegativeWh: number | null;
	ct3PositiveWh: number | null;
	ct3NegativeWh: number | null;
}

export interface ParseCarChargerResult {
	rows: CarChargerRow[];
	errors: ParseError[];
}

export function parseCarChargerCsv(buffer: Buffer, timezone: string): ParseCarChargerResult {
	const records: Record<string, string>[] = parse(buffer, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
	});

	const rows: CarChargerRow[] = [];
	const errors: ParseError[] = [];

	records.forEach((record, index) => {
		const result = carChargerCsvRowSchema.safeParse(record);
		if (!result.success) {
			errors.push({
				rowNumber: index + 2, // +1 for header row, +1 for 1-indexing
				message: result.error.issues.map((issue) => issue.message).join("; "),
			});
			return;
		}

		const r = result.data;
		const localDate = format(new Date(r.Timestamp), "yyyy-MM-dd", {
			in: tz(timezone),
		});

		rows.push({
			serialNumber: r["Serial Number"],
			timestamp: r.Timestamp,
			localDate,
			dataCoveragePct: r["Data Coverage (%)"],
			netGridImportWh: r["Net Grid Import (Wh)"],
			netGridExportWh: r["Net Grid Export (Wh)"],
			totalGenerationWh: r["Total Generation (Wh)"],
			hybridInverterLoadWh: r["Hybrid Inverter Load (Wh)"],
			minFrequencyChz: r["Min Frequency (cHz)"],
			maxFrequencyChz: r["Max Frequency (cHz)"],
			avgFrequencyChz: r["Avg Frequency (cHz)"],
			minVoltageL1Dv: r["Min Voltage (L1) (dV)"],
			maxVoltageL1Dv: r["Max Voltage (L1) (dV)"],
			avgVoltageL1Dv: r["Avg Voltage (L1) (dV)"],
			minVoltageL2Dv: r["Min Voltage (L2) (dV)"],
			maxVoltageL2Dv: r["Max Voltage (L2) (dV)"],
			avgVoltageL2Dv: r["Avg Voltage (L2) (dV)"],
			minVoltageL3Dv: r["Min Voltage (L3) (dV)"],
			maxVoltageL3Dv: r["Max Voltage (L3) (dV)"],
			avgVoltageL3Dv: r["Avg Voltage (L3) (dV)"],
			diverterL1Wh: r["Diverter Energy (L1) (Wh)"],
			diverterL2Wh: r["Diverter Energy (L2) (Wh)"],
			diverterL3Wh: r["Diverter Energy (L3) (Wh)"],
			boostedL1Wh: r["Boosted Energy (L1) (Wh)"],
			boostedL2Wh: r["Boosted Energy (L2) (Wh)"],
			boostedL3Wh: r["Boosted Energy (L3) (Wh)"],
			ct1PositiveWh: r["External CT Type 1 Positive (Wh)"],
			ct1NegativeWh: r["External CT Type 1 Negative (Wh)"],
			ct2PositiveWh: r["External CT Type 2 Positive (Wh)"],
			ct2NegativeWh: r["External CT Type 2 Negative (Wh)"],
			ct3PositiveWh: r["External CT Type 3 Positive (Wh)"],
			ct3NegativeWh: r["External CT Type 3 Negative (Wh)"],
		});
	});

	return { rows, errors };
}

const CHUNK_SIZE = 200;

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
					.select({ timestamp: carChargerHourly.timestamp })
					.from(carChargerHourly)
					.where(
						and(
							eq(carChargerHourly.serialNumber, batch[0].serialNumber),
							inArray(carChargerHourly.timestamp, timestamps),
						),
					)
					.all()
					.map((r) => r.timestamp),
			);

			tx.insert(carChargerHourly)
				.values(batch.map((row) => ({ ...row, sourceFile })))
				.onConflictDoUpdate({
					target: [carChargerHourly.serialNumber, carChargerHourly.timestamp],
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
