"use client";

import { useMemo } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ComposedChart,
	Line,
	XAxis,
	YAxis,
} from "recharts";

import { useGranularity } from "@/components/granularity-provider";
import { GranularitySelect } from "@/components/granularity-select";
import { InteractiveLegendContent, useSeriesVisibility } from "@/components/interactive-legend";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import {
	ChartContainer,
	ChartLegend,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { bucketKey, formatPeriodLabel } from "@/lib/aggregate";
import type { SolarDayRow, MonthlyByYearRow } from "@/lib/queries/solar";
import type { WeatherDayRow } from "@/lib/queries/weather";

const selfConsumptionConfig = {
	selfConsumptionPct: {
		label: "Self-consumption %",
		color: "var(--solar-colour)",
	},
} satisfies ChartConfig;

export function SelfConsumptionChart({ data }: { data: SolarDayRow[] }) {
	const [granularity, setGranularity] = useGranularity();

	const chartData = useMemo(() => {
		// Days with no grid export figure (selfConsumptionKwh === null) are left
		// out of the bucket entirely — including them as 0 would silently pull
		// the % toward 100 (no export assumed) or 0 (no self-consumption assumed)
		// depending on which side defaulted, either way misrepresenting a day we
		// simply have no export reading for.
		const buckets = new Map<string, { generated: number; selfConsumed: number }>();
		for (const row of data) {
			if (row.selfConsumptionKwh === null) continue;
			const key = bucketKey(row.date, granularity);
			const bucket = buckets.get(key) ?? { generated: 0, selfConsumed: 0 };
			bucket.generated += row.energyGeneratedKwh;
			bucket.selfConsumed += row.selfConsumptionKwh;
			buckets.set(key, bucket);
		}

		return Array.from(buckets.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([period, { generated, selfConsumed }]) => ({
				date: formatPeriodLabel(period, granularity),
				selfConsumptionPct:
					generated > 0 ? Number(((selfConsumed / generated) * 100).toFixed(1)) : 0,
			}));
	}, [data, granularity]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Self-consumption %</CardTitle>
				<CardAction>
					<GranularitySelect value={granularity} onChange={setGranularity} />
				</CardAction>
			</CardHeader>

			<CardContent>
				{chartData.length === 0 ? (
					<p className="text-muted-foreground text-sm">No data in this range.</p>
				) : (
					<ChartContainer config={selfConsumptionConfig} className="h-50 w-full">
						<AreaChart data={chartData}>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
							<YAxis tickLine={false} axisLine={false} width={40} domain={[0, 100]} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Area
								dataKey="selfConsumptionPct"
								fill="var(--color-selfConsumptionPct)"
								fillOpacity={0.25}
								stroke="var(--color-selfConsumptionPct)"
							/>
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}

const MONTH_LABELS = [
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

const yoyConfig = {
	"2023": { label: "2023", color: "var(--yoy-2023-colour)" },
	"2024": { label: "2024", color: "var(--yoy-2024-colour)" },
	"2025": { label: "2025", color: "var(--yoy-2025-colour)" },
	"2026": { label: "2026", color: "var(--yoy-2026-colour)" },
} satisfies ChartConfig;

export function YearOverYearChart({ data }: { data: MonthlyByYearRow[] }) {
	const { hidden, toggle, isHidden } = useSeriesVisibility();
	const years = Array.from(new Set(data.map((r) => r.year))).sort();
	const byMonth = new Map<number, Record<string, number>>();

	for (const row of data) {
		const entry = byMonth.get(row.month) ?? {};
		entry[String(row.year)] = Number(row.energyGeneratedKwh.toFixed(1));
		byMonth.set(row.month, entry);
	}

	const chartData = Array.from({ length: 12 }, (_, i) => ({
		month: MONTH_LABELS[i],
		...byMonth.get(i + 1),
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Year over year (monthly generation)</CardTitle>
			</CardHeader>

			<CardContent>
				<ChartContainer config={yoyConfig} className="h-100 w-full">
					<BarChart data={chartData}>
						<CartesianGrid vertical={false} />
						<XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
						<YAxis tickLine={false} axisLine={false} width={40} />
						<ChartTooltip content={<ChartTooltipContent />} />
						<ChartLegend
							content={
								<InteractiveLegendContent config={yoyConfig} hidden={hidden} onToggle={toggle} />
							}
						/>
						{years.map((year) => (
							<Bar
								key={year}
								dataKey={String(year)}
								fill={`var(--color-${year})`}
								radius={2}
								hide={isHidden(String(year))}
							/>
						))}
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

const weatherConfig = {
	energyGeneratedKwh: {
		label: "Generated (kWh)",
		color: "var(--solar-colour)",
	},
	cloudCoverPct: {
		label: "Cloud cover (%)",
		color: "var(--cloud-cover-colour)",
	},
} satisfies ChartConfig;

export function GenerationChart({
	solar,
	weather,
}: {
	solar: SolarDayRow[];
	weather: WeatherDayRow[];
}) {
	const { hidden, toggle, isHidden } = useSeriesVisibility();
	const [granularity, setGranularity] = useGranularity();

	const chartData = useMemo(() => {
		const weatherByDate = new Map(weather.map((w) => [w.date, w]));

		// Cloud cover is averaged per bucket, not summed like generation — a
		// day with no synced weather reading simply doesn't contribute to that
		// average (rather than pulling it toward 0), and a bucket with no
		// synced days at all comes out null so the chart shows a gap there.
		const buckets = new Map<string, { generated: number; cloudSum: number; cloudCount: number }>();
		for (const row of solar) {
			const key = bucketKey(row.date, granularity);
			const bucket = buckets.get(key) ?? {
				generated: 0,
				cloudSum: 0,
				cloudCount: 0,
			};
			bucket.generated += row.energyGeneratedKwh;
			const cloudCoverPct = weatherByDate.get(row.date)?.cloudCoverPct;
			if (cloudCoverPct !== null && cloudCoverPct !== undefined) {
				bucket.cloudSum += cloudCoverPct;
				bucket.cloudCount += 1;
			}
			buckets.set(key, bucket);
		}

		return Array.from(buckets.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([period, { generated, cloudSum, cloudCount }]) => ({
				date: formatPeriodLabel(period, granularity),
				energyGeneratedKwh: Number(generated.toFixed(2)),
				cloudCoverPct: cloudCount > 0 ? Number((cloudSum / cloudCount).toFixed(1)) : null,
			}));
	}, [solar, weather, granularity]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Generation trend</CardTitle>
				<CardAction>
					{solar.length === 0 ? null : (
						<GranularitySelect value={granularity} onChange={setGranularity} />
					)}
				</CardAction>
			</CardHeader>

			<CardContent>
				{solar.length === 0 ? (
					<p className="text-muted-foreground text-sm">No data in this range.</p>
				) : (
					<ChartContainer config={weatherConfig} className="h-100 w-full">
						<ComposedChart data={chartData}>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
							<YAxis yAxisId="left" tickLine={false} axisLine={false} width={40} />
							<YAxis
								yAxisId="right"
								orientation="right"
								tickLine={false}
								axisLine={false}
								width={40}
								domain={[0, 100]}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<ChartLegend
								content={
									<InteractiveLegendContent
										config={weatherConfig}
										hidden={hidden}
										onToggle={toggle}
									/>
								}
							/>
							<Area
								yAxisId="right"
								dataKey="cloudCoverPct"
								fill="var(--color-cloudCoverPct)"
								fillOpacity={0.15}
								stroke="var(--color-cloudCoverPct)"
								connectNulls
								hide={isHidden("cloudCoverPct")}
							/>
							<Line
								yAxisId="left"
								dataKey="energyGeneratedKwh"
								stroke="var(--color-energyGeneratedKwh)"
								strokeWidth={2}
								dot={false}
								hide={isHidden("energyGeneratedKwh")}
							/>
						</ComposedChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
