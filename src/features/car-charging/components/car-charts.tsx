"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { InteractiveLegendContent, useSeriesVisibility } from "@/components/interactive-legend";
import {
	ChartContainer,
	ChartLegend,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";

import type { HourlyChargeRow, MonthlyChargeRow } from "../queries";

const hourlyConfig = {
	netGridImportWh: { label: "Grid import (Wh)", color: "var(--import-colour)" },
	netGridExportWh: { label: "Grid export (Wh)", color: "var(--export-colour)" },
	evChargeSolarWh: {
		label: "EV charge, solar (Wh)",
		color: "var(--ev-colour)",
	},
	evChargeGridWh: {
		label: "EV charge, boost/grid (Wh)",
		color: "var(--ev-boost-colour)",
	},
} satisfies ChartConfig;

export function HourlyChart({ data }: { data: HourlyChargeRow[] }) {
	const { hidden, toggle, isHidden } = useSeriesVisibility();

	return (
		<ChartContainer config={hourlyConfig} className="h-100 w-full">
			<ComposedChart data={data}>
				<CartesianGrid vertical={false} />
				<XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
				<YAxis tickLine={false} axisLine={false} width={40} />
				<ChartTooltip content={<ChartTooltipContent className="min-w-80" />} />
				<ChartLegend
					content={
						<InteractiveLegendContent config={hourlyConfig} hidden={hidden} onToggle={toggle} />
					}
				/>
				<Bar
					dataKey="netGridImportWh"
					fill="var(--color-netGridImportWh)"
					radius={2}
					hide={isHidden("netGridImportWh")}
				/>
				<Bar
					dataKey="netGridExportWh"
					fill="var(--color-netGridExportWh)"
					radius={2}
					hide={isHidden("netGridExportWh")}
				/>
				<Line
					dataKey="evChargeSolarWh"
					stroke="var(--color-evChargeSolarWh)"
					strokeWidth={2}
					dot={false}
					hide={isHidden("evChargeSolarWh")}
				/>
				<Line
					dataKey="evChargeGridWh"
					stroke="var(--color-evChargeGridWh)"
					strokeWidth={2}
					dot={false}
					hide={isHidden("evChargeGridWh")}
				/>
			</ComposedChart>
		</ChartContainer>
	);
}

const chargeSplitConfig = {
	evChargeSolarKwh: { label: "Solar-powered", color: "var(--ev-colour)" },
	evChargeGridKwh: {
		label: "Grid-powered (boost)",
		color: "var(--ev-boost-colour)",
	},
} satisfies ChartConfig;

export function ChargeSplitChart({ data }: { data: MonthlyChargeRow[] }) {
	const { hidden, toggle, isHidden } = useSeriesVisibility();

	return (
		<ChartContainer config={chargeSplitConfig} className="h-100 w-full">
			<BarChart data={data}>
				<CartesianGrid vertical={false} />
				<XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
				<YAxis tickLine={false} axisLine={false} width={40} />
				<ChartTooltip content={<ChartTooltipContent />} />
				<ChartLegend
					content={
						<InteractiveLegendContent
							config={chargeSplitConfig}
							hidden={hidden}
							onToggle={toggle}
						/>
					}
				/>
				<Bar
					dataKey="evChargeSolarKwh"
					stackId="charge"
					fill="var(--color-evChargeSolarKwh)"
					radius={2}
					hide={isHidden("evChargeSolarKwh")}
				/>
				<Bar
					dataKey="evChargeGridKwh"
					stackId="charge"
					fill="var(--color-evChargeGridKwh)"
					radius={2}
					hide={isHidden("evChargeGridKwh")}
				/>
			</BarChart>
		</ChartContainer>
	);
}
