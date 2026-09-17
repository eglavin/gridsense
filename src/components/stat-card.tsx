import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";
import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const AVG_DAYS_PER_MONTH = 30.44;

export function StatCard({
	icon: Icon,
	label,
	value,
	format,
	hint,
	percent,
	percentTitle,
	days,
	disabled,
}: {
	icon: LucideIcon;
	label: string;
	/** Raw numeric total for the selected range. */
	value: number;
	/** Formats a raw number (total or average) into display text, unit included. */
	format: (value: number) => string;
	/** Shown via an info icon beside the title, on hover. */
	hint?: string;
	percent?: number;
	percentTitle?: string;
	/** Days spanned by the selected range — when > 1, shows per-day/per-month averages. */
	days?: number;
	/** Dims the card for a value that isn't meaningful yet (e.g. a required data source hasn't been uploaded). */
	disabled?: boolean;
}) {
	return (
		<Card className={cn(disabled && "opacity-50")}>
			<CardHeader>
				<CardTitle className="text-muted-foreground flex items-center gap-1.5 text-sm font-normal">
					<Icon className="size-4 shrink-0" />
					{label}
					{hint && (
						<span title={hint} className="inline-flex shrink-0">
							<Info className="text-muted-foreground/60 size-3.5" />
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<span
					className="font-mono text-2xl font-semibold tabular-nums"
					title={disabled ? hint : undefined}
				>
					{format(value)}
				</span>
				{days !== undefined && days > 1 && (
					<Fragment>
						<p className="text-muted-foreground mt-1 font-mono text-xs tabular-nums">
							{format((value / days) * AVG_DAYS_PER_MONTH)} /mo
						</p>
						<p className="text-muted-foreground mt-1 font-mono text-xs tabular-nums">
							{format(value / days)} /day
						</p>
					</Fragment>
				)}
				{percent !== undefined && (
					<Badge variant="secondary" title={percentTitle} className="mt-1 font-mono tabular-nums">
						{formatPercent(percent)}
					</Badge>
				)}
			</CardContent>
		</Card>
	);
}
