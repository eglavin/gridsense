"use client";

import { addDays as addDaysToDate, format, parseISO } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseDate(value: string): Date {
	return parseISO(value);
}

function formatDate(date: Date): string {
	return format(date, "yyyy-MM-dd");
}

function addDays(value: string, delta: number): string {
	return formatDate(addDaysToDate(parseDate(value), delta));
}

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
});

function formatWeekday(value: string): string {
	return weekdayFormatter.format(parseDate(value));
}

export function DatePicker({ day, paramName = "day" }: { day: string; paramName?: string }) {
	const router = useRouter();
	const pathname = usePathname();
	const [open, setOpen] = useState(false);

	function navigateTo(value: string) {
		const params = new URLSearchParams({ [paramName]: value });
		router.push(`${pathname}?${params.toString()}`);
	}

	function handleSelect(next: Date | undefined) {
		if (!next) return;
		navigateTo(formatDate(next));
	}

	return (
		<div className="flex items-center gap-1">
			<Button
				variant="outline"
				size="icon"
				aria-label="Previous day"
				onClick={() => navigateTo(addDays(day, -1))}
			>
				<ChevronLeft />
			</Button>

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button variant="outline" className="w-fit">
							<CalendarIcon />
							{formatWeekday(day)}, {day}
						</Button>
					}
				/>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={parseDate(day)}
						onSelect={handleSelect}
						defaultMonth={parseDate(day)}
						numberOfMonths={2}
						weekStartsOn={1}
						showWeekNumber
					/>
				</PopoverContent>
			</Popover>

			<Button
				variant="outline"
				size="icon"
				aria-label="Next day"
				onClick={() => navigateTo(addDays(day, 1))}
			>
				<ChevronRight />
			</Button>
		</div>
	);
}
