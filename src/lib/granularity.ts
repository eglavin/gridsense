import { cookies } from "next/headers";

import { GRANULARITY_COOKIE } from "../constants/granularity-constants";
import type { Granularity } from "./aggregate";

const VALID_GRANULARITIES: readonly Granularity[] = ["day", "month", "year"];

/** The last chart granularity picked on any page, so switching pages keeps it. */
export async function getSharedGranularity(): Promise<Granularity> {
	const store = await cookies();
	const raw = store.get(GRANULARITY_COOKIE)?.value;

	return VALID_GRANULARITIES.includes(raw as Granularity) ? (raw as Granularity) : "day";
}
