import { and, eq, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as XLSX from "xlsx";
import { z } from "zod";

import * as schema from "@/db/schema";
import type { ParseError } from "@/lib/csv-ingest";
import { chunk } from "@/lib/csv-ingest";

import { solarDaily } from "./schema";

const numeric = z.coerce.number().nullable().catch(null);

export const solarDailyRowSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	energyGeneratedKwh: numeric,
	loadConsumptionKwh: numeric,
	importEnergyKwh: numeric,
	exportEnergyKwh: numeric,
	selfConsumptionKwh: numeric,
	equivalentHours: numeric,
	incomeEur: numeric,
	co2SavedTons: numeric,
	treesSaved: numeric,
});

export type SolarDailyRow = z.infer<typeof solarDailyRowSchema>;

const HEADER_TO_FIELD: Record<string, string> = {
	Date: "date",
	"Energy Generated (kWh)": "energyGeneratedKwh",
	"load consumption": "loadConsumptionKwh",
	"Import Energy": "importEnergyKwh",
	"Export Energy": "exportEnergyKwh",
	"Self-consumption": "selfConsumptionKwh",
	"Equivalent Hours (h)": "equivalentHours",
	Income: "incomeEur",
	"CO2 Emission Saved (tons)": "co2SavedTons",
	"Trees Saved": "treesSaved",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NBSP = String.fromCharCode(160);

// Some export years use non-breaking spaces inside header labels
// (e.g. "CO2 Emission Saved (tons)" with U+00A0 between CO2 and Emission),
// so normalize before matching.
function normalizeHeader(header: string): string {
	return header.split(NBSP).join(" ").trim();
}

export interface ParseSolarResult {
	rows: SolarDailyRow[];
	errors: ParseError[];
	plantName: string;
}

function toNumberOrNull(value: unknown): number | null {
	if (value === undefined || value === null || value === "") return null;
	const stripped = String(value).replace(/[^0-9.-]/g, "");
	if (stripped === "" || stripped === "-") return null;
	const num = Number(stripped);
	return Number.isFinite(num) ? num : null;
}

export function parseSolarXlsx(buffer: Buffer): ParseSolarResult {
	const workbook = XLSX.read(buffer, { type: "buffer" });
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
		header: 1,
		raw: false,
		defval: null,
	});

	let plantName = "Unknown Plant";
	let headerRowIndex = -1;

	for (let i = 0; i < grid.length; i++) {
		const row = grid[i];
		const first = row?.[0];
		if (first === "Plant Name" && typeof row[1] === "string") {
			plantName = row[1];
		}
		if (typeof first === "string" && normalizeHeader(first) === "Date") {
			headerRowIndex = i;
			break;
		}
	}

	if (headerRowIndex === -1) {
		throw new Error('Could not locate header row (cell "Date") in XLSX file');
	}

	const headerRow = grid[headerRowIndex] as string[];
	const fieldByColumn = headerRow.map((h) => HEADER_TO_FIELD[normalizeHeader(h ?? "")] ?? null);

	const rows: SolarDailyRow[] = [];
	const errors: ParseError[] = [];

	for (let i = headerRowIndex + 1; i < grid.length; i++) {
		const dataRow = grid[i];
		const dateCell = dataRow?.[0];
		if (typeof dateCell !== "string" || !DATE_RE.test(dateCell)) {
			continue;
		}

		const raw: Record<string, unknown> = {};
		fieldByColumn.forEach((field, colIndex) => {
			if (!field) return;
			raw[field] = field === "date" ? dataRow[colIndex] : toNumberOrNull(dataRow[colIndex]);
		});

		const result = solarDailyRowSchema.safeParse(raw);
		if (!result.success) {
			errors.push({
				rowNumber: i + 1,
				message: result.error.issues.map((issue) => issue.message).join("; "),
			});
			continue;
		}

		rows.push(result.data);
	}

	return { rows, errors, plantName };
}

const CHUNK_SIZE = 200;

export interface UpsertResult {
	rowsInserted: number;
	rowsUpdated: number;
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
					.select({ date: solarDaily.date })
					.from(solarDaily)
					.where(and(eq(solarDaily.plantName, plantName), inArray(solarDaily.date, dates)))
					.all()
					.map((r) => r.date),
			);

			tx.insert(solarDaily)
				.values(batch.map((row) => ({ ...row, plantName, sourceFile })))
				.onConflictDoUpdate({
					target: [solarDaily.plantName, solarDaily.date],
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
