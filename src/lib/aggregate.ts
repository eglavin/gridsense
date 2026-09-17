export type Granularity = "day" | "month" | "year";

export function bucketKey(date: string, granularity: Granularity): string {
	if (granularity === "day") return date;
	if (granularity === "month") return date.slice(0, 7); // YYYY-MM
	return date.slice(0, 4); // YYYY
}

const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export function formatPeriodLabel(period: string, granularity: Granularity): string {
	if (granularity === "day") return period.slice(5);
	if (granularity === "month") {
		const [year, month] = period.split("-");
		return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
	}
	return period;
}

export type AggregatedRow<K extends string> = { period: string } & Record<K, number>;

/**
 * Sums the given numeric fields into day/month/year buckets. Null/undefined
 * values are treated as 0, so this only suits fields that are meaningfully
 * additive (kWh, Wh, currency) — ratios need to be recomputed from summed
 * inputs rather than passed through here.
 */
export function aggregateByGranularity<T, K extends keyof T & string>(
	rows: T[],
	dateKey: keyof T,
	granularity: Granularity,
	sumKeys: K[],
): AggregatedRow<K>[] {
	function newBucket(): Record<K, number> {
		const bucket = {} as Record<K, number>;
		for (const key of sumKeys) bucket[key] = 0;
		return bucket;
	}

	if (granularity === "day") {
		return rows.map((row) => {
			const values = newBucket();
			for (const key of sumKeys) values[key] = Number(row[key]) || 0;
			return { period: String(row[dateKey]), ...values };
		});
	}

	const buckets = new Map<string, Record<K, number>>();

	for (const row of rows) {
		const key = bucketKey(String(row[dateKey]), granularity);
		const bucket = buckets.get(key) ?? newBucket();

		for (const sumKey of sumKeys) {
			bucket[sumKey] += Number(row[sumKey]) || 0;
		}

		buckets.set(key, bucket);
	}

	return Array.from(buckets.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([period, values]) => ({ period, ...values }));
}
