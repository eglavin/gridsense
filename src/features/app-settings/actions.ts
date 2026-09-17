"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db/client";

import { appSettings } from "./schema";
import { getAppSettings, type AppSettings } from "./settings";

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
