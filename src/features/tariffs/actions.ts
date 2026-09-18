"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { requireSession } from "@/features/auth/session";

import { parseTariffCsv } from "./ingest";
import { tariffRates } from "./schema";

export async function listTariffRates() {
	await requireSession();
	return db.select().from(tariffRates).orderBy(desc(tariffRates.effectiveFrom));
}

// A rate's end date is never stored — it's implicitly whenever the next rate
// of the same direction starts (or open-ended, if it's the most recent).
// Adding or removing a rate is therefore a single insert/delete with nothing
// else to keep in sync. Re-adding a rate for a date that already has one
// (same direction) updates it in place, rather than erroring or duplicating
// — this is also what makes re-importing a CSV export idempotent.
export async function addTariffRate(
	direction: "import" | "export",
	eurPerKwh: number,
	effectiveFrom: string,
) {
	await requireSession();
	await db
		.insert(tariffRates)
		.values({ direction, eurPerKwh, effectiveFrom })
		.onConflictDoUpdate({
			target: [tariffRates.direction, tariffRates.effectiveFrom],
			set: { eurPerKwh },
		});

	revalidatePath("/settings");
	revalidatePath("/cost-savings");
}

export async function deleteTariffRate(id: number) {
	await requireSession();
	await db.delete(tariffRates).where(eq(tariffRates.id, id));

	revalidatePath("/settings");
	revalidatePath("/cost-savings");
}

export interface ImportTariffRatesResult {
	status: "ok" | "error";
	rowsParsed?: number;
	rowsInserted?: number;
	rowsUpdated?: number;
	parseErrors?: number;
	message?: string;
}

export async function importTariffRatesCsv(formData: FormData): Promise<ImportTariffRatesResult> {
	await requireSession();
	const file = formData.get("file");
	if (!(file instanceof File)) {
		return { status: "error", message: "No file provided." };
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	let rows, errors;
	try {
		({ rows, errors } = parseTariffCsv(buffer));
	} catch (error) {
		return {
			status: "error",
			message: error instanceof Error ? error.message : "Unknown parse error",
		};
	}

	if (rows.length === 0) {
		return {
			status: "error",
			message: "No valid rows found — expected columns: rate, effective_from, direction.",
		};
	}

	const existingKeys = new Set(
		db
			.select({
				direction: tariffRates.direction,
				effectiveFrom: tariffRates.effectiveFrom,
			})
			.from(tariffRates)
			.all()
			.map((r) => `${r.direction}|${r.effectiveFrom}`),
	);

	let rowsInserted = 0;
	let rowsUpdated = 0;

	db.transaction((tx) => {
		for (const row of rows) {
			const key = `${row.direction}|${row.effectiveFrom}`;
			if (existingKeys.has(key)) rowsUpdated++;
			else rowsInserted++;

			tx.insert(tariffRates)
				.values(row)
				.onConflictDoUpdate({
					target: [tariffRates.direction, tariffRates.effectiveFrom],
					set: { eurPerKwh: row.eurPerKwh },
				})
				.run();
		}
	});

	revalidatePath("/settings");
	revalidatePath("/cost-savings");

	return {
		status: "ok",
		rowsParsed: rows.length,
		rowsInserted,
		rowsUpdated,
		parseErrors: errors.length,
	};
}
