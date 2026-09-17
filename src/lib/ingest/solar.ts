import * as XLSX from "xlsx";

import type { ParseError } from "./car-charger";
import { solarDailyRowSchema } from "./schemas";

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

export interface SolarDailyRow {
	date: string;
	energyGeneratedKwh: number | null;
	loadConsumptionKwh: number | null;
	importEnergyKwh: number | null;
	exportEnergyKwh: number | null;
	selfConsumptionKwh: number | null;
	equivalentHours: number | null;
	incomeEur: number | null;
	co2SavedTons: number | null;
	treesSaved: number | null;
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
