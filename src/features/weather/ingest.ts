import { z } from "zod";

const numericArray = z.array(z.number().nullable());

export const openMeteoDailyResponseSchema = z.object({
	daily: z.object({
		time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
		temperature_2m_max: numericArray,
		temperature_2m_min: numericArray,
		temperature_2m_mean: numericArray,
		cloud_cover_mean: numericArray,
		precipitation_sum: numericArray,
		shortwave_radiation_sum: numericArray,
		sunshine_duration: numericArray,
	}),
});

export interface WeatherDailyRow {
	date: string;
	tempMaxC: number | null;
	tempMinC: number | null;
	tempMeanC: number | null;
	cloudCoverPct: number | null;
	precipitationMm: number | null;
	shortwaveRadiationMjM2: number | null;
	sunshineDurationS: number | null;
}

// Open-Meteo's historical archive API — free, no API key. Reanalysis data
// lags a few days behind real time, so the most recent days in `to` may
// come back with null values or simply be absent from the response.
export async function fetchWeatherDaily(
	latitude: number,
	longitude: number,
	from: string,
	to: string,
	timezone: string,
): Promise<WeatherDailyRow[]> {
	const url = new URL("https://archive-api.open-meteo.com/v1/archive");
	url.searchParams.set("latitude", String(latitude));
	url.searchParams.set("longitude", String(longitude));
	url.searchParams.set("start_date", from);
	url.searchParams.set("end_date", to);
	url.searchParams.set("timezone", timezone);
	url.searchParams.set(
		"daily",
		[
			"temperature_2m_max",
			"temperature_2m_min",
			"temperature_2m_mean",
			"cloud_cover_mean",
			"precipitation_sum",
			"shortwave_radiation_sum",
			"sunshine_duration",
		].join(","),
	);

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`Open-Meteo request failed: ${response.status} ${response.statusText}`);
	}

	const result = openMeteoDailyResponseSchema.safeParse(await response.json());
	if (!result.success) {
		throw new Error(`Unexpected Open-Meteo response shape: ${result.error.message}`);
	}

	const { daily } = result.data;

	return daily.time.map((date, i) => ({
		date,
		tempMaxC: daily.temperature_2m_max[i] ?? null,
		tempMinC: daily.temperature_2m_min[i] ?? null,
		tempMeanC: daily.temperature_2m_mean[i] ?? null,
		cloudCoverPct: daily.cloud_cover_mean[i] ?? null,
		precipitationMm: daily.precipitation_sum[i] ?? null,
		shortwaveRadiationMjM2: daily.shortwave_radiation_sum[i] ?? null,
		sunshineDurationS: daily.sunshine_duration[i] ?? null,
	}));
}
