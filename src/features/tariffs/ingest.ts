import { parse } from "csv-parse/sync";
import { z } from "zod";

import type { ParseError } from "@/lib/csv-ingest";

import type { TariffDirection } from "./queries";

export const tariffCsvRowSchema = z.object({
	rate: z.coerce.number().positive(),
	effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	direction: z.enum(["import", "export"]),
});

export type TariffCsvRow = z.infer<typeof tariffCsvRowSchema>;

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
