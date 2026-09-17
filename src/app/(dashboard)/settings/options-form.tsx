"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Field, FieldLabel, FieldDescription, FieldSeparator } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AppSettings, CostSavingsGridSource, GridSource } from "@/lib/settings";

import { updateAppSettings } from "./actions";

// Grouped by region (the part before the first "/") so the dropdown reads
// like a map rather than a flat list of ~400 IANA zone names.
const TIMEZONE_GROUPS: [string, string[]][] = (() => {
	const groups = new Map<string, string[]>();
	for (const zone of Intl.supportedValuesOf("timeZone")) {
		const region = zone.split("/")[0];
		const list = groups.get(region) ?? [];
		list.push(zone);
		groups.set(region, list);
	}
	return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
})();

function formatZoneLabel(zone: string): string {
	const [, ...rest] = zone.split("/");
	return rest.join(" – ").replace(/_/g, " ") || zone;
}

export function OptionsForm({ settings }: { settings: AppSettings }) {
	const [isPending, startTransition] = useTransition();

	function handleTimezoneChange(timezone: string | null) {
		if (!timezone) return;
		startTransition(async () => {
			await updateAppSettings({ timezone });
			toast.success(`House timezone set to ${timezone}`);
		});
	}

	function handleFallbackToggle(allowZappiGridFallback: boolean) {
		startTransition(async () => {
			await updateAppSettings({ allowZappiGridFallback });
			toast.success(
				allowZappiGridFallback
					? "Zappi fallback enabled for grid import/export"
					: "Grid import/export now uses ESB data only",
			);
		});
	}

	function handleCarChargingSourceChange(carChargingGridSource: GridSource | null) {
		if (!carChargingGridSource) return;
		startTransition(async () => {
			await updateAppSettings({ carChargingGridSource });
			toast.success(
				carChargingGridSource === "esb"
					? "Car Charging page now uses ESB for grid import/export"
					: "Car Charging page now uses the car charger's CT clamp for grid import/export",
			);
		});
	}

	function handleCostSavingsSourceChange(costSavingsGridSource: CostSavingsGridSource | null) {
		if (!costSavingsGridSource) return;
		startTransition(async () => {
			await updateAppSettings({ costSavingsGridSource });
			toast.success(
				costSavingsGridSource === "blended"
					? "Cost & Savings now blends ESB and CT clamp data with transparency notes"
					: costSavingsGridSource === "esb"
						? "Cost & Savings now uses ESB for grid import/export"
						: "Cost & Savings now uses the car charger's CT clamp for grid import/export",
			);
		});
	}

	return (
		<div className="flex flex-col gap-6">
			<Field orientation="horizontal">
				<div className="flex-1">
					<FieldLabel htmlFor="house-timezone">House timezone</FieldLabel>
					<FieldDescription>
						The timezone every &quot;local day&quot; figure is anchored to — which calendar day an
						import reading belongs to, hourly bucketing on the Car Charging page, and what counts as
						&quot;today&quot; when clamping the weather backfill or the tariff history chart.
						Changing this only affects data uploaded from now on — already imported rows keep the
						local day they were assigned at the time.
					</FieldDescription>
				</div>
				<Select value={settings.timezone} onValueChange={handleTimezoneChange} disabled={isPending}>
					<SelectTrigger id="house-timezone" className="w-56">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TIMEZONE_GROUPS.map(([region, zones]) => (
							<SelectGroup key={region}>
								<SelectLabel>{region}</SelectLabel>
								{zones.map((zone) => (
									<SelectItem key={zone} value={zone}>
										{formatZoneLabel(zone)}
									</SelectItem>
								))}
							</SelectGroup>
						))}
					</SelectContent>
				</Select>
			</Field>

			<FieldSeparator />

			<Field orientation="horizontal">
				<div className="flex-1">
					<FieldLabel htmlFor="allow-zappi-grid-fallback">
						Allow Zappi fallback for grid import/export
					</FieldLabel>
					<FieldDescription>
						When enabled, days without an ESB reading fall back to the car charger&apos;s
						whole-house CT clamp for grid import/export figures (Overview, Solar self-consumption,
						Cost &amp; Savings). When disabled, those figures come from ESB data only — days without
						an ESB reading are left out rather than estimated.
					</FieldDescription>
				</div>
				<Switch
					id="allow-zappi-grid-fallback"
					checked={settings.allowZappiGridFallback}
					onCheckedChange={handleFallbackToggle}
					disabled={isPending}
				/>
			</Field>

			<FieldSeparator />

			<Field orientation="horizontal">
				<div className="flex-1">
					<FieldLabel htmlFor="car-charging-grid-source">
						Grid import/export source on Car Charging page
					</FieldLabel>
					<FieldDescription>
						Which source the Car Charging page&apos;s own grid import/export stat cards and hourly
						chart use. This is a straight either/or — no fallback — so an hour with no reading from
						the chosen source shows 0 rather than borrowing from the other one.
					</FieldDescription>
				</div>
				<Select
					value={settings.carChargingGridSource}
					onValueChange={handleCarChargingSourceChange}
					disabled={isPending}
				>
					<SelectTrigger id="car-charging-grid-source" className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="esb">ESB (metered)</SelectItem>
						<SelectItem value="car_charger">Car charger (CT clamp)</SelectItem>
					</SelectContent>
				</Select>
			</Field>

			<FieldSeparator />

			<Field orientation="horizontal">
				<div className="flex-1">
					<FieldLabel htmlFor="cost-savings-grid-source">
						Grid import/export source on Cost &amp; Savings page
					</FieldLabel>
					<FieldDescription>
						Which source Cost &amp; Savings&apos; own grid import/export figures use.
						&quot;Blended&quot; (default) follows the Zappi fallback setting above and shows the
						existing per-day source notes on the page. &quot;ESB&quot; and &quot;Car charger&quot;
						force a single source with no blending, like Car Charging&apos;s option — a day with no
						reading from that source is left out.
					</FieldDescription>
				</div>
				<Select
					value={settings.costSavingsGridSource}
					onValueChange={handleCostSavingsSourceChange}
					disabled={isPending}
				>
					<SelectTrigger id="cost-savings-grid-source" className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="blended">Blended (with notes)</SelectItem>
						<SelectItem value="esb">ESB (metered)</SelectItem>
						<SelectItem value="car_charger">Car charger (CT clamp)</SelectItem>
					</SelectContent>
				</Select>
			</Field>
		</div>
	);
}
