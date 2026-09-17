import { tz } from "@date-fns/tz";
import { parse } from "csv-parse/sync";
import { format } from "date-fns";

import { carChargerCsvRowSchema } from "./schemas";

export interface CarChargerRow {
	serialNumber: string;
	timestamp: string;
	localDate: string;
	dataCoveragePct: number | null;
	netGridImportWh: number | null;
	netGridExportWh: number | null;
	totalGenerationWh: number | null;
	hybridInverterLoadWh: number | null;
	minFrequencyChz: number | null;
	maxFrequencyChz: number | null;
	avgFrequencyChz: number | null;
	minVoltageL1Dv: number | null;
	maxVoltageL1Dv: number | null;
	avgVoltageL1Dv: number | null;
	minVoltageL2Dv: number | null;
	maxVoltageL2Dv: number | null;
	avgVoltageL2Dv: number | null;
	minVoltageL3Dv: number | null;
	maxVoltageL3Dv: number | null;
	avgVoltageL3Dv: number | null;
	diverterL1Wh: number | null;
	diverterL2Wh: number | null;
	diverterL3Wh: number | null;
	boostedL1Wh: number | null;
	boostedL2Wh: number | null;
	boostedL3Wh: number | null;
	ct1PositiveWh: number | null;
	ct1NegativeWh: number | null;
	ct2PositiveWh: number | null;
	ct2NegativeWh: number | null;
	ct3PositiveWh: number | null;
	ct3NegativeWh: number | null;
}

export interface ParseError {
	rowNumber: number;
	message: string;
}

export interface ParseCarChargerResult {
	rows: CarChargerRow[];
	errors: ParseError[];
}

export function parseCarChargerCsv(buffer: Buffer, timezone: string): ParseCarChargerResult {
	const records: Record<string, string>[] = parse(buffer, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
	});

	const rows: CarChargerRow[] = [];
	const errors: ParseError[] = [];

	records.forEach((record, index) => {
		const result = carChargerCsvRowSchema.safeParse(record);
		if (!result.success) {
			errors.push({
				rowNumber: index + 2, // +1 for header row, +1 for 1-indexing
				message: result.error.issues.map((issue) => issue.message).join("; "),
			});
			return;
		}

		const r = result.data;
		const localDate = format(new Date(r.Timestamp), "yyyy-MM-dd", {
			in: tz(timezone),
		});

		rows.push({
			serialNumber: r["Serial Number"],
			timestamp: r.Timestamp,
			localDate,
			dataCoveragePct: r["Data Coverage (%)"],
			netGridImportWh: r["Net Grid Import (Wh)"],
			netGridExportWh: r["Net Grid Export (Wh)"],
			totalGenerationWh: r["Total Generation (Wh)"],
			hybridInverterLoadWh: r["Hybrid Inverter Load (Wh)"],
			minFrequencyChz: r["Min Frequency (cHz)"],
			maxFrequencyChz: r["Max Frequency (cHz)"],
			avgFrequencyChz: r["Avg Frequency (cHz)"],
			minVoltageL1Dv: r["Min Voltage (L1) (dV)"],
			maxVoltageL1Dv: r["Max Voltage (L1) (dV)"],
			avgVoltageL1Dv: r["Avg Voltage (L1) (dV)"],
			minVoltageL2Dv: r["Min Voltage (L2) (dV)"],
			maxVoltageL2Dv: r["Max Voltage (L2) (dV)"],
			avgVoltageL2Dv: r["Avg Voltage (L2) (dV)"],
			minVoltageL3Dv: r["Min Voltage (L3) (dV)"],
			maxVoltageL3Dv: r["Max Voltage (L3) (dV)"],
			avgVoltageL3Dv: r["Avg Voltage (L3) (dV)"],
			diverterL1Wh: r["Diverter Energy (L1) (Wh)"],
			diverterL2Wh: r["Diverter Energy (L2) (Wh)"],
			diverterL3Wh: r["Diverter Energy (L3) (Wh)"],
			boostedL1Wh: r["Boosted Energy (L1) (Wh)"],
			boostedL2Wh: r["Boosted Energy (L2) (Wh)"],
			boostedL3Wh: r["Boosted Energy (L3) (Wh)"],
			ct1PositiveWh: r["External CT Type 1 Positive (Wh)"],
			ct1NegativeWh: r["External CT Type 1 Negative (Wh)"],
			ct2PositiveWh: r["External CT Type 2 Positive (Wh)"],
			ct2NegativeWh: r["External CT Type 2 Negative (Wh)"],
			ct3PositiveWh: r["External CT Type 3 Positive (Wh)"],
			ct3NegativeWh: r["External CT Type 3 Negative (Wh)"],
		});
	});

	return { rows, errors };
}
