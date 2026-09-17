"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";

import { clearAllData, clearSourceData, type ClearableSource, type DataCounts } from "./actions";

const SOURCE_LABELS: Record<ClearableSource, string> = {
	car_charger: "Car charger",
	solar: "Solar",
	esb: "ESB grid",
};

export function DangerZone({ counts }: { counts: DataCounts }) {
	const [isPending, startTransition] = useTransition();
	const [openSource, setOpenSource] = useState<ClearableSource | null>(null);
	const [allDialogOpen, setAllDialogOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");

	const rowCount: Record<ClearableSource, number> = {
		car_charger: counts.carCharger,
		solar: counts.solar,
		esb: counts.esb,
	};

	function handleClearSource(source: ClearableSource) {
		startTransition(async () => {
			await clearSourceData(source);
			toast.success(`${SOURCE_LABELS[source]} data cleared`);
			setOpenSource(null);
		});
	}

	function handleClearAll() {
		startTransition(async () => {
			await clearAllData();
			toast.success("All data cleared");
			setAllDialogOpen(false);
			setConfirmText("");
		});
	}

	return (
		<div className="flex flex-col gap-3">
			{(Object.keys(SOURCE_LABELS) as ClearableSource[]).map((source) => (
				<div key={source} className="flex items-center justify-between rounded-lg border p-3">
					<div>
						<p className="text-sm font-medium">{SOURCE_LABELS[source]} data</p>
						<p className="text-muted-foreground text-xs">
							<span className="font-mono tabular-nums">{formatNumber(rowCount[source])}</span> rows
						</p>
					</div>

					<Dialog
						open={openSource === source}
						onOpenChange={(open) => setOpenSource(open ? source : null)}
					>
						<DialogTrigger
							render={
								<Button variant="destructive" size="sm" disabled={rowCount[source] === 0}>
									<Trash2 />
									Clear
								</Button>
							}
						/>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Clear {SOURCE_LABELS[source]} data?</DialogTitle>
								<DialogDescription>
									This permanently deletes all {formatNumber(rowCount[source])}{" "}
									{SOURCE_LABELS[source]} rows and its upload history. This cannot be undone —
									re-upload the export to restore it.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
								<Button
									variant="destructive"
									disabled={isPending}
									onClick={() => handleClearSource(source)}
								>
									{isPending ? "Clearing…" : "Clear data"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			))}

			<div className="border-destructive/30 bg-destructive/5 flex items-center justify-between rounded-lg border p-3">
				<div>
					<p className="text-sm font-medium">Clear all data</p>
					<p className="text-muted-foreground text-xs">
						Every upload, tariff rate, and synced weather day — full reset.
					</p>
				</div>

				<Dialog
					open={allDialogOpen}
					onOpenChange={(open) => {
						setAllDialogOpen(open);
						if (!open) setConfirmText("");
					}}
				>
					<DialogTrigger
						render={
							<Button variant="destructive" size="sm">
								<Trash2 />
								Clear everything
							</Button>
						}
					/>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Clear all data?</DialogTitle>
							<DialogDescription>
								This permanently deletes every car charger, solar, and ESB row, plus your tariff
								rates and synced weather data. This cannot be undone. Type <strong>DELETE</strong>{" "}
								to confirm.
							</DialogDescription>
						</DialogHeader>
						<Input
							// Intentional: focuses the confirmation field when this destructive
							// dialog opens, since it's the only interactive element that matters.
							// oxlint-disable-next-line jsx-a11y/no-autofocus
							autoFocus
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							placeholder="DELETE"
						/>
						<DialogFooter>
							<DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
							<Button
								variant="destructive"
								disabled={isPending || confirmText !== "DELETE"}
								onClick={handleClearAll}
							>
								{isPending ? "Clearing…" : "Clear everything"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
