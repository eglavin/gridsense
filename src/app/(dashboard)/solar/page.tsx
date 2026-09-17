import { Sun, Leaf, TreePine } from "lucide-react";

import { DateRangePicker } from "@/components/date-range-picker";
import { GranularityProvider } from "@/components/granularity-provider";
import { StatCard } from "@/components/stat-card";
import { daysBetweenInclusive, resolveDateRange } from "@/lib/date-range";
import { formatKwh, formatNumber } from "@/lib/format";
import { getSharedGranularity } from "@/lib/granularity";
import { getSolarDaily, getSolarDateRange, getSolarMonthlyByYear } from "@/lib/queries/solar";
import { getWeatherDaily } from "@/lib/queries/weather";

import { GenerationChart, SelfConsumptionChart, YearOverYearChart } from "./solar-charts";

function fmtKwh(v: number) {
	return `${formatKwh(v)} kWh`;
}
function fmtTons(v: number) {
	return `${formatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tons`;
}
function fmtTrees(v: number) {
	return formatNumber(v, {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	});
}

export default async function SolarPage({
	searchParams,
}: {
	searchParams: Promise<{ from?: string; to?: string }>;
}) {
	const params = await searchParams;
	const { max } = getSolarDateRange();

	if (!max) {
		return (
			<div>
				<h1 className="text-2xl font-semibold">Solar</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					No solar data yet — upload an export in Settings.
				</p>
			</div>
		);
	}

	const { from, to } = await resolveDateRange(params, max);
	const days = daysBetweenInclusive(from, to);
	const granularity = await getSharedGranularity();

	const rows = getSolarDaily(from, to);
	const monthlyByYear = getSolarMonthlyByYear();
	const weatherRows = getWeatherDaily(from, to);

	const totals = rows.reduce(
		(acc, r) => ({
			generated: acc.generated + r.energyGeneratedKwh,
			co2: acc.co2 + r.co2SavedTons,
			trees: acc.trees + r.treesSaved,
		}),
		{ generated: 0, co2: 0, trees: 0 },
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Solar</h1>
					<p className="text-muted-foreground text-sm">Generation trends and self-consumption.</p>
				</div>
				<DateRangePicker from={from} to={to} />
			</div>

			<div className="grid grid-cols-3 gap-4">
				<StatCard
					icon={Sun}
					label="Generated"
					value={totals.generated}
					format={fmtKwh}
					days={days}
				/>
				<StatCard icon={Leaf} label="CO2 saved" value={totals.co2} format={fmtTons} days={days} />
				<StatCard
					icon={TreePine}
					label="Trees saved (equiv.)"
					value={totals.trees}
					format={fmtTrees}
					days={days}
				/>
			</div>

			<GranularityProvider initial={granularity}>
				<GenerationChart solar={rows} weather={weatherRows} />

				<SelfConsumptionChart data={rows} />
			</GranularityProvider>

			<YearOverYearChart data={monthlyByYear} />
		</div>
	);
}
