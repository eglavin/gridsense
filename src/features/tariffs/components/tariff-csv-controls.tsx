"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { importTariffRatesCsv } from "../actions";

export function TariffCsvControls() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isPending, startTransition] = useTransition();

	function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("file", file);

		startTransition(async () => {
			const result = await importTariffRatesCsv(formData);

			if (result.status === "error") {
				toast.error(result.message ?? "Import failed");
			} else {
				toast.success(
					`Imported ${result.rowsParsed} rate(s): ${result.rowsInserted} new, ${result.rowsUpdated} updated` +
						(result.parseErrors ? ` (${result.parseErrors} row(s) skipped)` : ""),
				);
			}

			e.target.value = "";
		});
	}

	return (
		<div className="flex gap-2">
			<Button
				variant="outline"
				size="sm"
				nativeButton={false}
				render={
					// The "Export CSV" label below is merged onto this element by Button's
					// render prop, so the linter can't see that it has an accessible name.
					// oxlint-disable-next-line jsx-a11y/control-has-associated-label
					<a href="/api/tariff-rates/export" download="tariff-rates.csv" />
				}
			>
				<Download />
				Export CSV
			</Button>

			<input
				ref={fileInputRef}
				type="file"
				accept=".csv"
				className="hidden"
				onChange={handleFileSelected}
				disabled={isPending}
			/>
			<Button
				variant="outline"
				size="sm"
				disabled={isPending}
				onClick={() => fileInputRef.current?.click()}
			>
				<Upload />
				{isPending ? "Importing…" : "Import CSV"}
			</Button>
		</div>
	);
}
