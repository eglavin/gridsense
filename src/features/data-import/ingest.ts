import { tz } from "@date-fns/tz";
import { parse } from "csv-parse/sync";
import { format, parse as parseDate } from "date-fns";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { z } from "zod";

import * as schema from "@/db/schema";
import type { ParseError } from "@/lib/csv-ingest";
import { chunk } from "@/lib/csv-ingest";

import { esbGrid30Min } from "./schema";

export const esbCsvRowSchema = z.object({
	MPRN: z.string().min(1),
	"Meter Serial Number": z.string().min(1),
	"Read Value": z.coerce.number(),
	"Read Type": z.string().min(1),
	"Read Date and End Time": z.string().regex(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/),
});

export type EsbCsvRow = z.infer<typeof esbCsvRowSchema>;

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

const CHUNK_SIZE = 200;

export interface UpsertResult {
	rowsInserted: number;
	rowsUpdated: number;
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
					.select({ intervalEnd: esbGrid30Min.intervalEnd })
					.from(esbGrid30Min)
					.where(
						and(
							eq(esbGrid30Min.mprn, batch[0].mprn),
							inArray(esbGrid30Min.intervalEnd, intervalEnds),
						),
					)
					.all()
					.map((r) => r.intervalEnd),
			);

			tx.insert(esbGrid30Min)
				.values(batch.map((row) => ({ ...row, sourceFile })))
				.onConflictDoUpdate({
					target: [esbGrid30Min.mprn, esbGrid30Min.intervalEnd],
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
