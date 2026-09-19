"use server";

import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { getAppSettings } from "@/features/app-settings/settings";
import { requireSession } from "@/features/auth/session";
import { getAvailableDateRange } from "@/lib/date-coverage";

import { fetchWeatherDaily, fetchWeatherHourly } from "./ingest";
import { getWeatherStatus, type WeatherStatus } from "./queries";
import { weatherDaily, weatherHourly } from "./schema";

export async function listWeatherStatus(): Promise<WeatherStatus> {
	await requireSession();
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
	await requireSession();
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
	let hourlyRows;
	try {
		[rows, hourlyRows] = await Promise.all([
			fetchWeatherDaily(weatherLatitude, weatherLongitude, min, to, timezone),
			fetchWeatherHourly(weatherLatitude, weatherLongitude, min, to, timezone),
		]);
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

		for (const row of hourlyRows) {
			tx.insert(weatherHourly)
				.values(row)
				.onConflictDoUpdate({
					target: [weatherHourly.localDate, weatherHourly.hour],
					set: { cloudCoverPct: row.cloudCoverPct },
				})
				.run();
		}
	});

	revalidatePath("/solar");
	revalidatePath("/car-charging");
	revalidatePath("/settings");

	return { status: "ok", daysFetched: rows.length, rowsInserted, rowsUpdated };
}
