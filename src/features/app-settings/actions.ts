"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { requireSession } from "@/features/auth/session";

import { appSettings } from "./schema";
import { getAppSettings, type AppSettings } from "./settings";

export async function listAppSettings(): Promise<AppSettings> {
	await requireSession();
	return getAppSettings();
}

export async function updateAppSettings(settings: Partial<AppSettings>) {
	await requireSession();
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
