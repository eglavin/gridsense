"use client";

import { useMemo } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

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
import type { DailyOverviewRow } from "@/lib/queries/overview";

const chartConfig = {
	gridImportKwh: {
		label: "Grid import",
		color: "var(--import-colour)",
	},
	gridExportKwh: {
		label: "Grid export",
		color: "var(--export-colour)",
	},
	solarGeneratedKwh: {
		label: "Solar generated",
		color: "var(--solar-colour)",
	},
	evCharge: {
		label: "EV charge",
		color: "var(--ev-colour)",
	},
	powerUsedKwh: {
		label: "Power used",
		color: "var(--usage-colour)",
	},
} satisfies ChartConfig;

export function OverviewChart({ data }: { data: DailyOverviewRow[] }) {
	const { hidden, toggle, isHidden } = useSeriesVisibility();
	const [granularity, setGranularity] = useGranularity();

	const chartData = useMemo(() => {
		const normalized = data.map((row) => {
			const solarGeneratedKwh = row.solarGeneratedKwh ?? 0;
			return {
				date: row.date,
				gridImportKwh: row.gridImportKwh,
				gridExportKwh: row.gridExportKwh,
				solarGeneratedKwh,
				evCharge: row.evChargeSolarKwh + row.evChargeGridKwh,
				// Same formula as the "Total usage" stat card above: everything drawn
				// from generation + grid import, minus what was exported.
				powerUsedKwh: solarGeneratedKwh + row.gridImportKwh - row.gridExportKwh,
			};
		});

		const aggregated = aggregateByGranularity(normalized, "date", granularity, [
			"gridImportKwh",
			"gridExportKwh",
			"solarGeneratedKwh",
			"evCharge",
			"powerUsedKwh",
		]);

		return aggregated.map((row) => ({
			date: formatPeriodLabel(row.period, granularity),
			gridImportKwh: Number(row.gridImportKwh.toFixed(2)),
			gridExportKwh: Number(row.gridExportKwh.toFixed(2)),
			solarGeneratedKwh: Number(row.solarGeneratedKwh.toFixed(2)),
			evCharge: Number(row.evCharge.toFixed(2)),
			powerUsedKwh: Number(row.powerUsedKwh.toFixed(2)),
		}));
	}, [data, granularity]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Daily energy flow</CardTitle>
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
					<ChartContainer config={chartConfig} className="h-125 w-full">
						<ComposedChart data={chartData}>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
							<YAxis tickLine={false} axisLine={false} width={40} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<ChartLegend
								content={
									<InteractiveLegendContent
										config={chartConfig}
										hidden={hidden}
										onToggle={toggle}
									/>
								}
							/>
							<Bar
								dataKey="gridImportKwh"
								fill="var(--color-gridImportKwh)"
								radius={2}
								hide={isHidden("gridImportKwh")}
							/>
							<Bar
								dataKey="gridExportKwh"
								fill="var(--color-gridExportKwh)"
								radius={2}
								hide={isHidden("gridExportKwh")}
							/>
							<Area
								dataKey="solarGeneratedKwh"
								fill="var(--color-solarGeneratedKwh)"
								fillOpacity={0.2}
								stroke="var(--color-solarGeneratedKwh)"
								hide={isHidden("solarGeneratedKwh")}
							/>
							<Line
								dataKey="evCharge"
								stroke="var(--color-evCharge)"
								strokeWidth={2}
								dot={false}
								hide={isHidden("evCharge")}
							/>
							<Line
								dataKey="powerUsedKwh"
								stroke="var(--color-powerUsedKwh)"
								strokeWidth={2}
								dot={false}
								hide={isHidden("powerUsedKwh")}
							/>
						</ComposedChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
