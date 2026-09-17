import * as XLSX from "xlsx";

export type SourceType = "car_charger" | "solar" | "esb";

export function detectFileType(fileName: string, buffer: Buffer): SourceType | null {
	const lower = fileName.toLowerCase();

	if (lower.endsWith(".csv")) {
		const head = buffer.subarray(0, 500).toString("utf8");
		// Check MPRN before the "Serial Number" check below — ESB's "Meter Serial
		// Number" column would otherwise be mistaken for the Zappi CSV's column.
		if (head.includes("MPRN")) {
			return head.includes("(kWh)") ? "esb" : null;
		}
		return head.includes("Serial Number") ? "car_charger" : null;
	}

	if (lower.endsWith(".xlsx")) {
		// XLSX is a zip container, so the metadata text is compressed on disk —
		// parse it properly rather than substring-matching the raw bytes.
		const workbook = XLSX.read(buffer, { type: "buffer", sheetRows: 1 });
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const a1 = sheet?.["A1"]?.v;
		return a1 === "Plant Information" ? "solar" : null;
	}

	return null;
}
