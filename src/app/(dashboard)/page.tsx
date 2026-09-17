import { Sun, ArrowDownToLine, ArrowUpFromLine, BatteryCharging, House, Gauge } from "lucide-react";
import Link from "next/link";

import { DateRangePicker } from "@/components/date-range-picker";
import { GranularityProvider } from "@/components/granularity-provider";
import { StatCard } from "@/components/stat-card";
import { daysBetweenInclusive, resolveDateRange } from "@/lib/date-range";
import { formatKwh } from "@/lib/format";
import { getSharedGranularity } from "@/lib/granularity";
import { getAvailableDateRange, getDailyOverview } from "@/lib/queries/overview";

import { OverviewChart } from "./overview-chart";

function fmtKwh(v: number) {
	return `${formatKwh(v)} kWh`;
}

export default async function OverviewPage({
	searchParams,
}: {
	searchParams: Promise<{ from?: string; to?: string }>;
}) {
	const params = await searchParams;
	const { max } = getAvailableDateRange();

	if (!max) {
		return (
			<div>
				<h1 className="text-2xl font-semibold">Overview</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					No data yet — head to{" "}
					<Link href="/settings" className="underline">
						Settings
					</Link>{" "}
					to upload your first Zappi CSV, solar XLSX, or ESB HDF export.
				</p>
			</div>
		);
	}

	const { from, to } = await resolveDateRange(params, max);
	const days = daysBetweenInclusive(from, to);
	const granularity = await getSharedGranularity();

	const rows = getDailyOverview(from, to);
	const hasSolarData = rows.some((r) => r.solarGeneratedKwh !== null);

	const totals = rows.reduce(
		(acc, r) => ({
			gridImportKwh: acc.gridImportKwh + r.gridImportKwh,
			gridExportKwh: acc.gridExportKwh + r.gridExportKwh,
			solarGeneratedKwh: acc.solarGeneratedKwh + (r.solarGeneratedKwh ?? 0),
			evChargeKwh: acc.evChargeKwh + r.evChargeSolarKwh + r.evChargeGridKwh,
		}),
		{
			gridImportKwh: 0,
			gridExportKwh: 0,
			solarGeneratedKwh: 0,
			evChargeKwh: 0,
		},
	);

	// Self-used solar: generated power that wasn't sent back out to the grid.
	// Clamped at 0 — without solar data (e.g. only an ESB export uploaded so far), generation defaults to 0 and this would otherwise go negative.
	const usedFromGeneratedKwh = Math.max(0, totals.solarGeneratedKwh - totals.gridExportKwh);
	// Total household consumption: everything drawn from generation + grid import, minus what was exported.
	const totalUsageKwh = totals.solarGeneratedKwh + totals.gridImportKwh - totals.gridExportKwh;

	// % of generated solar that was self-consumed rather than exported.
	const selfConsumptionRate =
		totals.solarGeneratedKwh > 0 ? usedFromGeneratedKwh / totals.solarGeneratedKwh : 0;
	// % of total usage that was covered by self-consumed solar (the rest came from the grid).
	const selfSufficiencyRate = totalUsageKwh > 0 ? usedFromGeneratedKwh / totalUsageKwh : 0;
	// % of total usage that went to EV charging.
	const evShareOfUsage = totalUsageKwh > 0 ? totals.evChargeKwh / totalUsageKwh : 0;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Overview</h1>
					<p className="text-muted-foreground text-sm">
						House grid exchange, Generation, and EV charging over time.
					</p>
				</div>
				<DateRangePicker from={from} to={to} />
			</div>

			<div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
				<StatCard
					icon={ArrowDownToLine}
					label="Grid import"
					value={totals.gridImportKwh}
					format={fmtKwh}
					days={days}
				/>
				<StatCard
					icon={ArrowUpFromLine}
					label="Grid export"
					value={totals.gridExportKwh}
					format={fmtKwh}
					days={days}
				/>
				<StatCard
					icon={Sun}
					label="Solar generated"
					value={totals.solarGeneratedKwh}
					format={fmtKwh}
					days={days}
				/>
				<StatCard
					icon={BatteryCharging}
					label="EV charged"
					value={totals.evChargeKwh}
					format={fmtKwh}
					days={days}
					percent={evShareOfUsage}
					percentTitle="Share of total household usage that went to EV charging"
				/>
				<StatCard
					icon={Gauge}
					label="Total usage"
					value={totalUsageKwh}
					format={fmtKwh}
					days={days}
					disabled={!hasSolarData}
					hint={hasSolarData ? "Solar generated + Grid import - Grid export" : undefined}
					percent={hasSolarData ? selfSufficiencyRate : undefined}
					percentTitle="Share of total household usage covered by self-consumed solar, rather than grid import"
				/>
				<StatCard
					icon={House}
					label="Used from generated"
					value={usedFromGeneratedKwh}
					format={fmtKwh}
					days={days}
					disabled={!hasSolarData}
					hint={hasSolarData ? "Solar generated - Grid export" : undefined}
					percent={hasSolarData ? selfConsumptionRate : undefined}
					percentTitle="Share of generated solar that was used directly rather than exported to the grid"
				/>
			</div>

			<GranularityProvider initial={granularity}>
				<OverviewChart data={rows} />
			</GranularityProvider>
		</div>
	);
}
