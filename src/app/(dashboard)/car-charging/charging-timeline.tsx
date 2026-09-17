"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { formatKwh } from "@/lib/format";
import type { TimelineDay } from "@/lib/queries/car-charging";
import { cn } from "@/lib/utils";

const CELL_MIN_WIDTH = 8; // px
const CELL_GAP = 3; // px
const MIN_VISIBLE_DAYS = 7;
// The day view's stat cards round to 2 decimal places (fmtKwh2), so a day
// below this rounds to "0.00 kWh" there — don't highlight it here either.
const MIN_HIGHLIGHTED_KWH = 0.005;

export function ChargingTimeline({
	days,
	selectedDate,
}: {
	days: TimelineDay[];
	selectedDate: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const containerRef = useRef<HTMLDivElement>(null);
	const [visibleCount, setVisibleCount] = useState(days.length);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const updateCount = () => {
			const slot = CELL_MIN_WIDTH + CELL_GAP;
			const fit = Math.floor((el.clientWidth + CELL_GAP) / slot);
			setVisibleCount(Math.max(MIN_VISIBLE_DAYS, Math.min(days.length, fit)));
		};

		updateCount();
		const observer = new ResizeObserver(updateCount);
		observer.observe(el);
		return () => observer.disconnect();
	}, [days.length]);

	const selectedIndex = Math.max(
		0,
		days.findIndex((d) => d.date === selectedDate),
	);

	let start = selectedIndex - Math.floor(visibleCount / 2);
	start = Math.max(0, Math.min(start, days.length - visibleCount));
	const visibleDays = days.slice(start, start + visibleCount);

	function goTo(date: string) {
		router.push(`${pathname}?day=${date}`);
	}

	return (
		<div ref={containerRef} className="w-full">
			<div className="flex items-end gap-1">
				{visibleDays.map((day) => {
					const isSelected = day.date === selectedDate;
					const charged = day.chargedKwh >= MIN_HIGHLIGHTED_KWH;

					return (
						<button
							key={day.date}
							type="button"
							title={`${day.date} — ${
								charged ? `${formatKwh(day.chargedKwh)} kWh charged` : "no charging"
							}`}
							aria-label={`${day.date} — ${
								charged ? `${formatKwh(day.chargedKwh)} kWh charged` : "no charging"
							}`}
							onClick={() => goTo(day.date)}
							className={cn(
								"h-9 min-w-0 flex-1 rounded-xs transition-opacity hover:opacity-80",
								charged ? "bg-(--ev-colour)" : "bg-muted",
								isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
							)}
						/>
					);
				})}
			</div>
			<div className="text-muted-foreground mt-1 flex gap-0.75 overflow-visible text-[10px] whitespace-nowrap">
				{visibleDays.map((day, i) => (
					<div key={day.date} className="flex-1 text-center">
						{i % 7 === 0 ? (
							<span className="relative left-1/2 -translate-x-1/2 font-mono">
								{day.date.slice(5)}
							</span>
						) : null}
					</div>
				))}
			</div>
		</div>
	);
}
