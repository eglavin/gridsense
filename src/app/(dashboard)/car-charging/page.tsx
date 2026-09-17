import { ArrowDownToLine, ArrowUpFromLine, Sun, Zap } from "lucide-react";

import { DatePicker } from "@/components/date-picker";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKwh } from "@/lib/format";
import {
	getCarChargerDateRange,
	getChargingTimeline,
	getDaysWithCharging,
	getHourlyForDay,
	getMonthlyChargeTotals,
} from "@/lib/queries/car-charging";

import { ChargeSplitChart, HourlyChart } from "./car-charts";
import { ChargingTimeline } from "./charging-timeline";

function fmtKwh2(v: number) {
	return `${formatKwh(v, 2)} kWh`;
}

export default async function CarChargingPage({
	searchParams,
}: {
	searchParams: Promise<{ day?: string }>;
}) {
	const params = await searchParams;
	const { max } = getCarChargerDateRange();

	if (!max) {
		return (
			<div>
				<h1 className="text-2xl font-semibold">Car Charging</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					No car charger data yet — upload a Zappi export in Settings.
				</p>
			</div>
		);
	}

	const daysWithCharging = getDaysWithCharging(1);
	const day = params.day ?? daysWithCharging[0] ?? max;

	const hourly = getHourlyForDay(day);
	const monthly = getMonthlyChargeTotals();
	const timelineDays = getChargingTimeline(day, 30, 30);

	const dayTotals = hourly.reduce(
		(acc, r) => ({
			import: acc.import + r.netGridImportWh,
			export: acc.export + r.netGridExportWh,
			solarCharge: acc.solarCharge + r.evChargeSolarWh,
			gridCharge: acc.gridCharge + r.evChargeGridWh,
		}),
		{ import: 0, export: 0, solarCharge: 0, gridCharge: 0 },
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Car Charging</h1>
					<p className="text-muted-foreground text-sm">
						Hourly charging detail and solar-vs-grid split.
					</p>
				</div>
				<DatePicker day={day} paramName="day" />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Charging history</CardTitle>
				</CardHeader>
				<CardContent>
					<ChargingTimeline days={timelineDays} selectedDate={day} />
				</CardContent>
			</Card>

			<div className="grid grid-cols-4 gap-4">
				<StatCard
					icon={ArrowDownToLine}
					label="Grid import"
					value={dayTotals.import / 1000}
					format={fmtKwh2}
				/>
				<StatCard
					icon={ArrowUpFromLine}
					label="Grid export"
					value={dayTotals.export / 1000}
					format={fmtKwh2}
				/>
				<StatCard
					icon={Sun}
					label="EV charged (solar)"
					value={dayTotals.solarCharge / 1000}
					format={fmtKwh2}
				/>
				<StatCard
					icon={Zap}
					label="EV charged (boost/grid)"
					value={dayTotals.gridCharge / 1000}
					format={fmtKwh2}
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Hourly grid exchange & EV charging — {day}</CardTitle>
				</CardHeader>
				<CardContent>
					{hourly.length === 0 ? (
						<p className="text-muted-foreground text-sm">No data for this day.</p>
					) : (
						<HourlyChart data={hourly} />
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Monthly EV charging — solar vs grid</CardTitle>
				</CardHeader>
				<CardContent>
					<ChargeSplitChart data={monthly} />
				</CardContent>
			</Card>
		</div>
	);
}
