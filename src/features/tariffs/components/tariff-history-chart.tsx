"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { InteractiveLegendContent, useSeriesVisibility } from "@/components/interactive-legend";
import {
	ChartContainer,
	ChartLegend,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { formatPeriodLabel } from "@/lib/aggregate";

import type { MonthlyTariffRow } from "../queries";

const config = {
	importRate: { label: "Import rate (€/kWh)", color: "var(--import-colour)" },
	exportRate: { label: "Export rate (€/kWh)", color: "var(--export-colour)" },
} satisfies ChartConfig;

export function TariffHistoryChart({ data }: { data: MonthlyTariffRow[] }) {
	const { hidden, toggle, isHidden } = useSeriesVisibility();

	const chartData = data.map((row) => ({
		month: formatPeriodLabel(row.month, "month"),
		importRate: row.importRate,
		exportRate: row.exportRate,
	}));

	return (
		<ChartContainer config={config} className="h-70 w-full">
			<LineChart data={chartData}>
				<CartesianGrid vertical={false} />
				<XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
				<YAxis
					tickLine={false}
					axisLine={false}
					width={50}
					tickFormatter={(v: number) => `€${v.toFixed(2)}`}
				/>
				<ChartTooltip content={<ChartTooltipContent />} />
				<ChartLegend
					content={<InteractiveLegendContent config={config} hidden={hidden} onToggle={toggle} />}
				/>
				<Line
					type="stepAfter"
					dataKey="importRate"
					stroke="var(--color-importRate)"
					strokeWidth={2}
					dot={false}
					connectNulls
					hide={isHidden("importRate")}
				/>
				<Line
					type="stepAfter"
					dataKey="exportRate"
					stroke="var(--color-exportRate)"
					strokeWidth={2}
					dot={false}
					connectNulls
					hide={isHidden("exportRate")}
				/>
			</LineChart>
		</ChartContainer>
	);
}
