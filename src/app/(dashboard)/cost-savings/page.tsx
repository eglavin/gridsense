import { ArrowDownToLine, Sun, Scale } from "lucide-react";
import Link from "next/link";

import { DateRangePicker } from "@/components/date-range-picker";
import { GranularityProvider } from "@/components/granularity-provider";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { daysBetweenInclusive, resolveDateRange } from "@/lib/date-range";
import { formatEur } from "@/lib/format";
import { getSharedGranularity } from "@/lib/granularity";
import { getAllTariffRates, getCostSavingsDaily } from "@/lib/queries/cost";
import { getAvailableDateRange } from "@/lib/queries/overview";

import { CostChart } from "./cost-chart";

const fmtEur = (v: number) => formatEur(v);

export default async function CostSavingsPage({
	searchParams,
}: {
	searchParams: Promise<{ from?: string; to?: string }>;
}) {
	const params = await searchParams;
	const { max } = getAvailableDateRange();
	const rates = getAllTariffRates();

	if (!max) {
		return (
			<div>
				<h1 className="text-2xl font-semibold">Cost & Savings</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					No data yet — upload an export in Settings.
				</p>
			</div>
		);
	}

	const { from, to } = await resolveDateRange(params, max);
	const days = daysBetweenInclusive(from, to);
	const granularity = await getSharedGranularity();
	const rows = getCostSavingsDaily(from, to);
	const hasImportRate = rates.some((r) => r.direction === "import");

	const totals = rows.reduce(
		(acc, r) => ({
			importCost: acc.importCost + (r.importCostEur ?? 0),
			income: acc.income + r.incomeEur,
			net: acc.net + (r.netEur ?? 0),
			unpriced: acc.unpriced + (r.importCostEur === null ? 1 : 0),
		}),
		{ importCost: 0, income: 0, net: 0, unpriced: 0 },
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Cost & Savings</h1>
					<p className="text-muted-foreground text-sm">
						Estimated grid import cost vs. solar export income.
					</p>
				</div>
				<DateRangePicker from={from} to={to} />
			</div>

			{!hasImportRate && (
				<Card>
					<CardContent className="text-muted-foreground pt-6 text-sm">
						No import rate configured — grid import cost can&apos;t be estimated yet.{" "}
						<Link href="/settings?tab=tariff" className="underline">
							Add a €/kWh import rate in Settings
						</Link>
						.
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-3 gap-4">
				<StatCard
					icon={ArrowDownToLine}
					label="Grid import cost (estimated)"
					value={totals.importCost}
					format={fmtEur}
					days={days}
				/>
				<StatCard
					icon={Sun}
					label="Export income"
					value={totals.income}
					format={fmtEur}
					days={days}
					hint="Grid export × your configured export rate; falls back to solar's own reported income only when no export rate is set"
				/>
				<StatCard icon={Scale} label="Net" value={totals.net} format={fmtEur} days={days} />
			</div>

			<GranularityProvider initial={granularity}>
				<CostChart data={rows} />
			</GranularityProvider>
		</div>
	);
}
