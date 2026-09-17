"use server";

import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { count, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import {
	appSettings,
	carChargerHourly,
	esbGrid30Min,
	ingestionLog,
	solarDaily,
	tariffRates,
	weatherDaily,
} from "@/db/schema";
import { parseCarChargerCsv } from "@/lib/ingest/car-charger";
import { detectFileType } from "@/lib/ingest/detect";
import { parseEsbCsv } from "@/lib/ingest/esb";
import { parseSolarXlsx } from "@/lib/ingest/solar";
import { parseTariffCsv } from "@/lib/ingest/tariff";
import { upsertCarChargerRows, upsertEsbGridRows, upsertSolarRows } from "@/lib/ingest/upsert";
import { fetchWeatherDaily } from "@/lib/ingest/weather";
import { getAvailableDateRange } from "@/lib/queries/overview";
import { getWeatherStatus, type WeatherStatus } from "@/lib/queries/weather";
import { getAppSettings, type AppSettings } from "@/lib/settings";

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
	return db.select().from(ingestionLog).orderBy(desc(ingestionLog.uploadedAt)).limit(50);
}

export async function listTariffRates() {
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

export async function listAppSettings(): Promise<AppSettings> {
	return getAppSettings();
}

export async function updateAppSettings(settings: Partial<AppSettings>) {
	const current = getAppSettings();

	await db
		.insert(appSettings)
		.values({ id: 1, ...current, ...settings })
		.onConflictDoUpdate({
			target: appSettings.id,
			set: settings,
		});

	revalidatePath("/", "layout");
}

export async function listWeatherStatus(): Promise<WeatherStatus> {
	return getWeatherStatus();
}

export interface BackfillWeatherResult {
	status: "ok" | "error";
	daysFetched?: number;
	rowsInserted?: number;
	rowsUpdated?: number;
	message?: string;
}

export async function backfillWeather(): Promise<BackfillWeatherResult> {
	const { min, max } = getAvailableDateRange();
	if (!min || !max) {
		return {
			status: "error",
			message:
				"No data uploaded yet — upload an export first so there's a date range to backfill weather for.",
		};
	}

	const { weatherLatitude, weatherLongitude, timezone } = getAppSettings();

	// Uploaded exports can list dates past today (e.g. a solar XLSX's nominal
	// month range even before every day in it has data) — Open-Meteo 400s on
	// a future end_date, so clamp to today rather than asking for weather
	// that hasn't happened yet.
	const today = format(new Date(), "yyyy-MM-dd", { in: tz(timezone) });
	const to = max < today ? max : today;

	let rows;
	try {
		rows = await fetchWeatherDaily(weatherLatitude, weatherLongitude, min, to, timezone);
	} catch (error) {
		return {
			status: "error",
			message: error instanceof Error ? error.message : "Failed to fetch weather data",
		};
	}

	if (rows.length === 0) {
		return {
			status: "error",
			message: "Open-Meteo returned no data for this date range.",
		};
	}

	const existingDates = new Set(
		db
			.select({ date: weatherDaily.date })
			.from(weatherDaily)
			.all()
			.map((r) => r.date),
	);

	let rowsInserted = 0;
	let rowsUpdated = 0;

	db.transaction((tx) => {
		for (const { date, ...fields } of rows) {
			if (existingDates.has(date)) rowsUpdated++;
			else rowsInserted++;

			tx.insert(weatherDaily)
				.values({ date, ...fields })
				.onConflictDoUpdate({
					target: weatherDaily.date,
					set: fields,
				})
				.run();
		}
	});

	revalidatePath("/solar");
	revalidatePath("/settings");

	return { status: "ok", daysFetched: rows.length, rowsInserted, rowsUpdated };
}

export interface DataCounts {
	carCharger: number;
	solar: number;
	esb: number;
}

export async function getDataCounts(): Promise<DataCounts> {
	const [car, solar, esb] = await Promise.all([
		db.select({ n: count() }).from(carChargerHourly),
		db.select({ n: count() }).from(solarDaily),
		db.select({ n: count() }).from(esbGrid30Min),
	]);

	return {
		carCharger: car[0]?.n ?? 0,
		solar: solar[0]?.n ?? 0,
		esb: esb[0]?.n ?? 0,
	};
}

export type ClearableSource = "car_charger" | "solar" | "esb";

export async function clearSourceData(sourceType: ClearableSource) {
	db.transaction((tx) => {
		if (sourceType === "car_charger") {
			tx.delete(carChargerHourly).run();
		} else if (sourceType === "solar") {
			tx.delete(solarDaily).run();
		} else {
			tx.delete(esbGrid30Min).run();
		}
		tx.delete(ingestionLog).where(eq(ingestionLog.sourceType, sourceType)).run();
	});

	revalidatePath("/", "layout");
}

export async function clearAllData() {
	db.transaction((tx) => {
		tx.delete(carChargerHourly).run();
		tx.delete(solarDaily).run();
		tx.delete(esbGrid30Min).run();
		tx.delete(tariffRates).run();
		tx.delete(weatherDaily).run();
		tx.delete(ingestionLog).run();
	});

	revalidatePath("/", "layout");
}
