import { parse } from "csv-parse/sync";

import type { TariffDirection } from "@/lib/queries/cost";

import type { ParseError } from "./car-charger";
import { tariffCsvRowSchema } from "./schemas";

export interface TariffRateRow {
	direction: TariffDirection;
	eurPerKwh: number;
	effectiveFrom: string;
}

export interface ParseTariffResult {
	rows: TariffRateRow[];
	errors: ParseError[];
}

export function parseTariffCsv(buffer: Buffer): ParseTariffResult {
	const records: Record<string, string>[] = parse(buffer, {
		columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
		skip_empty_lines: true,
		trim: true,
	});

	const rows: TariffRateRow[] = [];
	const errors: ParseError[] = [];

	records.forEach((record, index) => {
		const result = tariffCsvRowSchema.safeParse(record);
		if (!result.success) {
			errors.push({
				rowNumber: index + 2, // +1 for header row, +1 for 1-indexing
				message: result.error.issues.map((issue) => issue.message).join("; "),
			});
			return;
		}

		rows.push({
			direction: result.data.direction,
			eurPerKwh: result.data.rate,
			effectiveFrom: result.data.effective_from,
		});
	});

	return { rows, errors };
}
