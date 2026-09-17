"use client";

import { useCallback, useState } from "react";

import type { ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export function useSeriesVisibility() {
	const [hidden, setHidden] = useState<Set<string>>(new Set());

	const toggle = useCallback((key: string) => {
		setHidden((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}, []);

	const isHidden = useCallback((key: string) => hidden.has(key), [hidden]);

	return { hidden, toggle, isHidden };
}

interface LegendPayloadItem {
	dataKey?: string | number;
	value?: string;
	color?: string;
}

export function InteractiveLegendContent({
	config,
	hidden,
	onToggle,
	payload,
}: {
	config: ChartConfig;
	hidden: Set<string>;
	onToggle: (key: string) => void;
	payload?: LegendPayloadItem[];
}) {
	if (!payload?.length) return null;

	return (
		<div className="flex flex-wrap items-center justify-center gap-4 pt-3">
			{payload.map((item) => {
				const key = String(item.dataKey ?? item.value ?? "");
				const itemConfig = config[key];
				const off = hidden.has(key);

				return (
					<button
						key={key}
						type="button"
						onClick={() => onToggle(key)}
						className={cn(
							"flex cursor-pointer items-center gap-1.5 text-sm transition-opacity hover:opacity-100 p-1",
							off ? "opacity-40" : "opacity-100",
						)}
					>
						<span className="h-2 w-2 shrink-0 rounded-xs" style={{ backgroundColor: item.color }} />
						<span className={cn(off && "line-through")}>{itemConfig?.label ?? key}</span>
					</button>
				);
			})}
		</div>
	);
}
