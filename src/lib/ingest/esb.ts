import { tz } from "@date-fns/tz";
import { parse } from "csv-parse/sync";
import { format, parse as parseDate } from "date-fns";

import type { ParseError } from "./car-charger";
import { esbCsvRowSchema } from "./schemas";

export interface EsbGridRow {
	mprn: string;
	meterSerialNumber: string;
	intervalEnd: string;
	localDate: string;
	importKwh: number | null;
	exportKwh: number | null;
}

export interface ParseEsbResult {
	rows: EsbGridRow[];
	errors: ParseError[];
}

export function parseEsbCsv(buffer: Buffer, timezone: string): ParseEsbResult {
	const records: Record<string, string>[] = parse(buffer, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
	});

	const rowsByKey = new Map<string, EsbGridRow>();
	const errors: ParseError[] = [];

	records.forEach((record, index) => {
		const rowNumber = index + 2; // +1 for header row, +1 for 1-indexing
		const result = esbCsvRowSchema.safeParse(record);
		if (!result.success) {
			errors.push({
				rowNumber,
				message: result.error.issues.map((issue) => issue.message).join("; "),
			});
			return;
		}

		const r = result.data;
		if (!r["Read Type"].includes("(kWh)")) {
			errors.push({
				rowNumber,
				message: `Unsupported read type "${r["Read Type"]}" — expected the calculated kWh export, not the kW export.`,
			});
			return;
		}

		const zoned = parseDate(r["Read Date and End Time"], "dd-MM-yyyy HH:mm", new Date(), {
			in: tz(timezone),
		});
		// `zoned` is a `TZDate`, whose `toISOString()` renders the zone's own
		// offset (e.g. "+01:00" during Irish Standard Time) instead of always
		// normalizing to UTC "Z" — that's fine for display, but this string is
		// stored and sorted with `ORDER BY interval_end`, which needs a format
		// that stays lexically monotonic across DST transitions.
		const intervalEnd = new Date(zoned.getTime()).toISOString();
		const localDate = format(zoned, "yyyy-MM-dd");
		const key = `${r.MPRN}|${intervalEnd}`;

		const existing = rowsByKey.get(key) ?? {
			mprn: r.MPRN,
			meterSerialNumber: r["Meter Serial Number"],
			intervalEnd,
			localDate,
			importKwh: null,
			exportKwh: null,
		};

		if (r["Read Type"].startsWith("Active Import")) {
			existing.importKwh = r["Read Value"];
		} else if (r["Read Type"].startsWith("Active Export")) {
			existing.exportKwh = r["Read Value"];
		}

		rowsByKey.set(key, existing);
	});

	return { rows: Array.from(rowsByKey.values()), errors };
}
