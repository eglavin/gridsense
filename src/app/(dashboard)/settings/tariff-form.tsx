"use client";

import { format, parseISO, subDays } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatEur } from "@/lib/format";
import type { TariffDirection } from "@/lib/queries/cost";

import { addTariffRate, deleteTariffRate } from "./actions";

interface TariffRate {
	id: number;
	direction: TariffDirection;
	eurPerKwh: number;
	effectiveFrom: string;
}

// Display-only — a rate's end is never stored, only implied by the next
// rate's start date.
function dayBefore(dateStr: string): string {
	return format(subDays(parseISO(dateStr), 1), "yyyy-MM-dd");
}

export function TariffForm({
	direction,
	rates,
}: {
	direction: TariffDirection;
	rates: TariffRate[];
}) {
	const [isPending, startTransition] = useTransition();
	const [rate, setRate] = useState("");
	const [effectiveFrom, setEffectiveFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));

	// Newest first, so each row's "effective to" is just the day before the
	// row above it starts (or "current" for the newest row).
	const sortedRates = [...rates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

	function handleAdd() {
		const parsed = Number(rate);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			toast.error("Enter a valid rate in €/kWh");
			return;
		}

		startTransition(async () => {
			await addTariffRate(direction, parsed, effectiveFrom);
			toast.success(`Rate ${formatEur(parsed, 3)}/kWh added from ${effectiveFrom}`);
			setRate("");
		});
	}

	function handleDelete(id: number) {
		startTransition(async () => {
			await deleteTariffRate(id);
			toast.success("Tariff rate removed");
		});
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col items-end gap-5 sm:flex-row">
				<Field>
					<FieldLabel htmlFor={`rate-${direction}`}>€/kWh</FieldLabel>
					<Input
						id={`rate-${direction}`}
						type="number"
						step="0.001"
						min="0"
						value={rate}
						onChange={(e) => setRate(e.target.value)}
						className="w-28 font-mono"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor={`effective-from-${direction}`}>Effective from</FieldLabel>
					<Input
						id={`effective-from-${direction}`}
						type="date"
						value={effectiveFrom}
						onChange={(e) => setEffectiveFrom(e.target.value)}
						className="w-40 font-mono"
					/>
				</Field>
				<Button onClick={handleAdd} disabled={isPending}>
					Add rate
				</Button>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>€/kWh</TableHead>
						<TableHead>Effective from</TableHead>
						<TableHead>Effective to</TableHead>
						<TableHead className="w-10" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{sortedRates.length === 0 && (
						<TableRow>
							<TableCell colSpan={4} className="text-muted-foreground">
								No rates yet.
							</TableCell>
						</TableRow>
					)}
					{sortedRates.map((r, i) => (
						<TableRow key={r.id}>
							<TableCell className="font-mono tabular-nums">{formatEur(r.eurPerKwh, 3)}</TableCell>
							<TableCell className="font-mono tabular-nums">{r.effectiveFrom}</TableCell>
							<TableCell className="font-mono tabular-nums">
								{i === 0 ? "current" : dayBefore(sortedRates[i - 1].effectiveFrom)}
							</TableCell>
							<TableCell>
								<Button
									variant="ghost"
									size="icon"
									disabled={isPending}
									onClick={() => handleDelete(r.id)}
								>
									<Trash2 className="size-4" />
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
