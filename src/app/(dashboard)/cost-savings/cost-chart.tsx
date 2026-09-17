"use client";

import { useMemo } from "react";
import { Bar, CartesianGrid, Line, ComposedChart, XAxis, YAxis } from "recharts";

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
import { aggregateByGranularity, formatPeriodLabel } from "@/lib/aggregate";
import type { CostSavingsDayRow } from "@/lib/queries/cost";

const config = {
	importCostEur: { label: "Grid import cost", color: "var(--import-colour)" },
	incomeEur: { label: "Solar income", color: "var(--solar-colour)" },
	netEur: { label: "Net", color: "var(--net-cost-colour)" },
} satisfies ChartConfig;

export function CostChart({ data }: { data: CostSavingsDayRow[] }) {
	const { hidden, toggle, isHidden } = useSeriesVisibility();
	const [granularity, setGranularity] = useGranularity();

	const chartData = useMemo(() => {
		const normalized = data.map((r) => ({
			date: r.date,
			importCostEur: r.importCostEur ?? 0,
			incomeEur: r.incomeEur,
			netEur: r.netEur ?? 0,
		}));

		const aggregated = aggregateByGranularity(normalized, "date", granularity, [
			"importCostEur",
			"incomeEur",
			"netEur",
		]);

		return aggregated.map((row) => ({
			date: formatPeriodLabel(row.period, granularity),
			importCostEur: -Number(row.importCostEur.toFixed(2)),
			incomeEur: Number(row.incomeEur.toFixed(2)),
			netEur: Number(row.netEur.toFixed(2)),
		}));
	}, [data, granularity]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Daily cost vs. income</CardTitle>
				<CardAction>
					{chartData.length === 0 ? null : (
						<GranularitySelect value={granularity} onChange={setGranularity} />
					)}
				</CardAction>
			</CardHeader>

			<CardContent>
				{chartData.length === 0 ? (
					<p className="text-muted-foreground text-sm">No data in this range.</p>
				) : (
					<ChartContainer config={config} className="h-125 w-full">
						<ComposedChart data={chartData}>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
							<YAxis tickLine={false} axisLine={false} width={40} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<ChartLegend
								content={
									<InteractiveLegendContent config={config} hidden={hidden} onToggle={toggle} />
								}
							/>
							<Bar
								dataKey="importCostEur"
								fill="var(--color-importCostEur)"
								radius={2}
								hide={isHidden("importCostEur")}
							/>
							<Bar
								dataKey="incomeEur"
								fill="var(--color-incomeEur)"
								radius={2}
								hide={isHidden("incomeEur")}
							/>
							<Line
								dataKey="netEur"
								stroke="var(--color-netEur)"
								strokeWidth={2}
								dot={false}
								hide={isHidden("netEur")}
							/>
						</ComposedChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
