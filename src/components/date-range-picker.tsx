"use client";

import {
	addDays as addDaysToDate,
	differenceInCalendarDays,
	endOfMonth,
	endOfWeek,
	endOfYear,
	format,
	parseISO,
	startOfMonth,
	startOfWeek,
	startOfYear,
	sub,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DATE_RANGE_COOKIE, MIN_SELECTABLE_DATE } from "@/constants/date-range-constants";
import { cn } from "@/lib/utils";

function parseDate(value: string): Date {
	return parseISO(value);
}

function formatDate(date: Date): string {
	return format(date, "yyyy-MM-dd");
}

function setDateRangeCookie(from: string, to: string) {
	document.cookie = `${DATE_RANGE_COOKIE}=${from}_${to}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function addDays(dateStr: string, delta: number): string {
	return formatDate(addDaysToDate(parseDate(dateStr), delta));
}

/** Number of days spanned by [from, to], inclusive of both ends. */
function daysBetweenInclusive(from: string, to: string): number {
	return differenceInCalendarDays(parseDate(to), parseDate(from)) + 1;
}

function getPresetRanges(): { label: string; range: DateRange }[] {
	const now = new Date();

	const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
	const lastWeekStart = sub(thisWeekStart, { weeks: 1 });
	const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

	const thisMonthStart = startOfMonth(now);
	const lastMonthStart = sub(thisMonthStart, { months: 1 });
	const lastMonthEnd = endOfMonth(lastMonthStart);

	const thisYearStart = startOfYear(now);
	const lastYearStart = sub(thisYearStart, { years: 1 });
	const lastYearEnd = endOfYear(lastYearStart);

	return [
		{ label: "This week", range: { from: thisWeekStart, to: now } },
		{ label: "Last week", range: { from: lastWeekStart, to: lastWeekEnd } },
		{ label: "This month", range: { from: thisMonthStart, to: now } },
		{ label: "Last month", range: { from: lastMonthStart, to: lastMonthEnd } },
		{ label: "This year", range: { from: thisYearStart, to: now } },
		{ label: "Last year", range: { from: lastYearStart, to: lastYearEnd } },
	];
}

export function DateRangePicker({ from, to }: { from: string; to: string }) {
	const router = useRouter();
	const pathname = usePathname();
	const [range, setRange] = useState<DateRange | undefined>({
		from: parseDate(from),
		to: parseDate(to),
	});
	const [open, setOpen] = useState(false);

	function navigateToRange(fromStr: string, toStr: string) {
		setDateRangeCookie(fromStr, toStr);
		const params = new URLSearchParams({ from: fromStr, to: toStr });
		router.push(`${pathname}?${params.toString()}`);
	}

	function applyRange(next: DateRange | undefined) {
		setRange(next);
		if (next?.from && next?.to) {
			navigateToRange(formatDate(next.from), formatDate(next.to));
		}
	}

	function shiftRange(direction: 1 | -1) {
		const spanDays = daysBetweenInclusive(from, to) * direction;
		const nextFrom = addDays(from, spanDays);
		const nextTo = addDays(to, spanDays);
		setRange({ from: parseDate(nextFrom), to: parseDate(nextTo) });
		navigateToRange(nextFrom, nextTo);
	}

	const presets = getPresetRanges();

	return (
		<div className="flex items-center gap-1">
			<Button
				variant="outline"
				size="icon"
				aria-label="Previous period"
				onClick={() => shiftRange(-1)}
			>
				<ChevronLeft />
			</Button>

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button variant="outline" className="w-fit">
							<CalendarIcon />
							{from} → {to}
						</Button>
					}
				/>
				<PopoverContent className="w-auto p-0" align="start">
					<div className="flex">
						<div className="flex flex-col gap-1 p-3">
							{presets.map((preset) => (
								<Button
									key={preset.label}
									variant="ghost"
									className={cn("justify-start font-normal")}
									onClick={() => applyRange(preset.range)}
								>
									{preset.label}
								</Button>
							))}
						</div>
						<Separator orientation="vertical" className="h-auto" />
						<Calendar
							mode="range"
							selected={range}
							onSelect={applyRange}
							numberOfMonths={2}
							weekStartsOn={1}
							defaultMonth={range?.from}
							showWeekNumber
							disabled={{ before: MIN_SELECTABLE_DATE }}
							excludeDisabled
						/>
					</div>
				</PopoverContent>
			</Popover>

			<Button variant="outline" size="icon" aria-label="Next period" onClick={() => shiftRange(1)}>
				<ChevronRight />
			</Button>
		</div>
	);
}
