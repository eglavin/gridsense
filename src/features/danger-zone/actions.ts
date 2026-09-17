"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { carChargerHourly } from "@/features/car-charging/schema";
import { esbGrid30Min, ingestionLog } from "@/features/data-import/schema";
import { solarDaily } from "@/features/solar/schema";
import { tariffRates } from "@/features/tariffs/schema";
import { weatherDaily } from "@/features/weather/schema";

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
