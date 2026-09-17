"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { uploadFiles, type UploadFileSummary } from "../actions";

export function UploadForm() {
	const formRef = useRef<HTMLFormElement>(null);
	const [isPending, startTransition] = useTransition();
	const [lastResults, setLastResults] = useState<UploadFileSummary[]>([]);

	function handleSubmit(formData: FormData) {
		startTransition(async () => {
			const results = await uploadFiles(formData);
			setLastResults(results);

			for (const result of results) {
				if (result.status === "error") {
					toast.error(`${result.fileName}: ${result.message}`);
				} else {
					toast.success(
						`${result.fileName}: ${result.rowsParsed} rows (${result.rowsInserted} new, ${result.rowsUpdated} updated)`,
					);
				}
			}

			formRef.current?.reset();
		});
	}

	return (
		<form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
			<Field>
				<FieldLabel htmlFor="files">Zappi CSV, solar XLSX, or ESB HDF (kWh) CSV exports</FieldLabel>
				<Input
					id="files"
					name="files"
					type="file"
					multiple
					accept=".csv,.xlsx"
					disabled={isPending}
				/>
				<FieldDescription>
					Re-uploading an overlapping export is safe — matching rows are updated in place, nothing
					is duplicated.
				</FieldDescription>
			</Field>
			<Button type="submit" disabled={isPending} className="w-fit">
				{isPending ? "Uploading…" : "Upload"}
			</Button>

			{lastResults.length > 0 && (
				<div className="text-muted-foreground text-sm">
					Last upload: {lastResults.length} file(s) processed.
				</div>
			)}
		</form>
	);
}
