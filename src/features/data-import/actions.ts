"use server";

import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { getAppSettings } from "@/features/app-settings/settings";
import { requireSession } from "@/features/auth/session";
import { parseCarChargerCsv, upsertCarChargerRows } from "@/features/car-charging/ingest";
import { parseSolarXlsx, upsertSolarRows } from "@/features/solar/ingest";

import { detectFileType } from "./detect";
import { parseEsbCsv, upsertEsbGridRows } from "./ingest";
import { ingestionLog } from "./schema";

export interface UploadFileSummary {
	fileName: string;
	status: "ok" | "error";
	sourceType?: "car_charger" | "solar" | "esb";
	rowsParsed?: number;
	rowsInserted?: number;
	rowsUpdated?: number;
	parseErrors?: number;
	message?: string;
}

export async function uploadFiles(formData: FormData): Promise<UploadFileSummary[]> {
	await requireSession();
	const files = formData.getAll("files").filter((f): f is File => f instanceof File);
	const summaries: UploadFileSummary[] = [];
	const { timezone } = getAppSettings();

	for (const file of files) {
		const buffer = Buffer.from(await file.arrayBuffer());
		const sourceType = detectFileType(file.name, buffer);

		if (!sourceType) {
			const isEsbPowerExport =
				buffer.subarray(0, 500).toString("utf8").includes("MPRN") &&
				!buffer.subarray(0, 500).toString("utf8").includes("(kWh)");

			summaries.push({
				fileName: file.name,
				status: "error",
				message: isEsbPowerExport
					? "This looks like ESB's power (kW) export — please upload the 'calculated kWh' export instead."
					: "Unrecognized file — expected a Zappi CSV, solar XLSX, or ESB HDF kWh export.",
			});
			continue;
		}

		try {
			if (sourceType === "car_charger") {
				const { rows, errors } = parseCarChargerCsv(buffer, timezone);
				const { rowsInserted, rowsUpdated } = upsertCarChargerRows(db, rows, file.name);
				const dates = rows.map((r) => r.localDate).sort();

				await db.insert(ingestionLog).values({
					sourceType,
					fileName: file.name,
					rowsParsed: rows.length,
					rowsInserted,
					rowsUpdated,
					dateRangeStart: dates[0] ?? null,
					dateRangeEnd: dates[dates.length - 1] ?? null,
					warnings: errors.length ? JSON.stringify(errors) : null,
				});

				summaries.push({
					fileName: file.name,
					status: "ok",
					sourceType,
					rowsParsed: rows.length,
					rowsInserted,
					rowsUpdated,
					parseErrors: errors.length,
				});
			} else if (sourceType === "esb") {
				const { rows, errors } = parseEsbCsv(buffer, timezone);
				const { rowsInserted, rowsUpdated } = upsertEsbGridRows(db, rows, file.name);
				const dates = rows.map((r) => r.localDate).sort();

				await db.insert(ingestionLog).values({
					sourceType,
					fileName: file.name,
					rowsParsed: rows.length,
					rowsInserted,
					rowsUpdated,
					dateRangeStart: dates[0] ?? null,
					dateRangeEnd: dates[dates.length - 1] ?? null,
					warnings: errors.length ? JSON.stringify(errors) : null,
				});

				summaries.push({
					fileName: file.name,
					status: "ok",
					sourceType,
					rowsParsed: rows.length,
					rowsInserted,
					rowsUpdated,
					parseErrors: errors.length,
				});
			} else {
				const { rows, errors, plantName } = parseSolarXlsx(buffer);
				const { rowsInserted, rowsUpdated } = upsertSolarRows(db, rows, plantName, file.name);
				const dates = rows.map((r) => r.date).sort();

				await db.insert(ingestionLog).values({
					sourceType,
					fileName: file.name,
					rowsParsed: rows.length,
					rowsInserted,
					rowsUpdated,
					dateRangeStart: dates[0] ?? null,
					dateRangeEnd: dates[dates.length - 1] ?? null,
					warnings: errors.length ? JSON.stringify(errors) : null,
				});

				summaries.push({
					fileName: file.name,
					status: "ok",
					sourceType,
					rowsParsed: rows.length,
					rowsInserted,
					rowsUpdated,
					parseErrors: errors.length,
				});
			}
		} catch (error) {
			summaries.push({
				fileName: file.name,
				status: "error",
				message: error instanceof Error ? error.message : "Unknown parse error",
			});
		}
	}

	revalidatePath("/", "layout");

	return summaries;
}

export async function listIngestionLog() {
	await requireSession();
	return db.select().from(ingestionLog).orderBy(desc(ingestionLog.uploadedAt)).limit(50);
}
