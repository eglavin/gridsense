import { addDays as addDaysToDate, differenceInCalendarDays, format, parseISO } from "date-fns";
import { cookies } from "next/headers";

import { DATE_RANGE_COOKIE } from "../constants/date-range-constants";

export function addDays(date: string, days: number): string {
	return format(addDaysToDate(parseISO(date), days), "yyyy-MM-dd");
}

/** Number of days spanned by [from, to], inclusive of both ends. */
export function daysBetweenInclusive(from: string, to: string): number {
	return differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
}

/** The last date range picked on any page, so switching pages keeps it. */
export async function getSharedDateRange(): Promise<{
	from: string;
	to: string;
} | null> {
	const store = await cookies();
	const raw = store.get(DATE_RANGE_COOKIE)?.value;
	if (!raw) return null;

	const [from, to] = raw.split("_");
	if (!from || !to) return null;

	return { from, to };
}

export async function resolveDateRange(
	params: { from?: string; to?: string },
	fallbackMax: string,
): Promise<{ from: string; to: string }> {
	if (params.from && params.to) {
		return { from: params.from, to: params.to };
	}

	const shared = await getSharedDateRange();
	const to = params.to ?? shared?.to ?? fallbackMax;
	const from = params.from ?? shared?.from ?? addDays(to, -89);

	return { from, to };
}
