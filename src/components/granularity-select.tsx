"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Granularity } from "@/lib/aggregate";

const LABELS: Record<Granularity, string> = {
	day: "Daily",
	month: "Monthly",
	year: "Yearly",
};

export function GranularitySelect({
	value,
	onChange,
}: {
	value: Granularity;
	onChange: (value: Granularity) => void;
}) {
	return (
		<Select value={value} onValueChange={(v) => onChange(v as Granularity)}>
			<SelectTrigger size="sm" className="w-28">
				<SelectValue>{(v: Granularity) => LABELS[v]}</SelectValue>
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="day">Daily</SelectItem>
				<SelectItem value="month">Monthly</SelectItem>
				<SelectItem value="year">Yearly</SelectItem>
			</SelectContent>
		</Select>
	);
}
