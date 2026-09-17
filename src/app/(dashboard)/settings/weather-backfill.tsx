"use client";

import { CloudSun } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { WeatherStatus } from "@/lib/queries/weather";

import { backfillWeather } from "./actions";

export function WeatherBackfill({ status }: { status: WeatherStatus }) {
	const [isPending, startTransition] = useTransition();

	function handleBackfill() {
		startTransition(async () => {
			const result = await backfillWeather();
			if (result.status === "error") {
				toast.error(result.message ?? "Weather backfill failed");
			} else {
				toast.success(
					`Fetched ${result.daysFetched} day(s) of weather: ${result.rowsInserted} new, ${result.rowsUpdated} updated`,
				);
			}
		});
	}

	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex items-start gap-3">
				<CloudSun className="text-muted-foreground mt-0.5 size-5 shrink-0" />
				<div>
					<p className="text-sm font-medium">Historical weather (Open-Meteo)</p>
					<p className="text-muted-foreground text-sm">
						{status.dayCount > 0
							? `${status.dayCount} day(s) synced, ${status.minDate} → ${status.maxDate}.`
							: "Not synced yet."}
					</p>
				</div>
			</div>
			<Button onClick={handleBackfill} disabled={isPending} className="shrink-0">
				{isPending ? "Fetching…" : "Backfill weather"}
			</Button>
		</div>
	);
}
