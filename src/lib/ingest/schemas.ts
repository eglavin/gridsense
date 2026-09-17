import { z } from "zod";

const numeric = z.coerce.number().nullable().catch(null);

export const carChargerCsvRowSchema = z.object({
	"Serial Number": z.string().min(1),
	Timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
	"Data Coverage (%)": numeric,
	"Net Grid Import (Wh)": numeric,
	"Net Grid Export (Wh)": numeric,
	"Total Generation (Wh)": numeric,
	"Hybrid Inverter Load (Wh)": numeric,
	"Min Frequency (cHz)": numeric,
	"Max Frequency (cHz)": numeric,
	"Avg Frequency (cHz)": numeric,
	"Min Voltage (L1) (dV)": numeric,
	"Max Voltage (L1) (dV)": numeric,
	"Avg Voltage (L1) (dV)": numeric,
	"Min Voltage (L2) (dV)": numeric,
	"Max Voltage (L2) (dV)": numeric,
	"Avg Voltage (L2) (dV)": numeric,
	"Min Voltage (L3) (dV)": numeric,
	"Max Voltage (L3) (dV)": numeric,
	"Avg Voltage (L3) (dV)": numeric,
	"Diverter Energy (L1) (Wh)": numeric,
	"Diverter Energy (L2) (Wh)": numeric,
	"Diverter Energy (L3) (Wh)": numeric,
	"Boosted Energy (L1) (Wh)": numeric,
	"Boosted Energy (L2) (Wh)": numeric,
	"Boosted Energy (L3) (Wh)": numeric,
	"External CT Type 1 Positive (Wh)": numeric,
	"External CT Type 1 Negative (Wh)": numeric,
	"External CT Type 2 Positive (Wh)": numeric,
	"External CT Type 2 Negative (Wh)": numeric,
	"External CT Type 3 Positive (Wh)": numeric,
	"External CT Type 3 Negative (Wh)": numeric,
});

export type CarChargerCsvRow = z.infer<typeof carChargerCsvRowSchema>;

export const solarDailyRowSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	energyGeneratedKwh: numeric,
	loadConsumptionKwh: numeric,
	importEnergyKwh: numeric,
	exportEnergyKwh: numeric,
	selfConsumptionKwh: numeric,
	equivalentHours: numeric,
	incomeEur: numeric,
	co2SavedTons: numeric,
	treesSaved: numeric,
});

export type SolarDailyRow = z.infer<typeof solarDailyRowSchema>;

export const esbCsvRowSchema = z.object({
	MPRN: z.string().min(1),
	"Meter Serial Number": z.string().min(1),
	"Read Value": z.coerce.number(),
	"Read Type": z.string().min(1),
	"Read Date and End Time": z.string().regex(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/),
});

export type EsbCsvRow = z.infer<typeof esbCsvRowSchema>;

export const tariffCsvRowSchema = z.object({
	rate: z.coerce.number().positive(),
	effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	direction: z.enum(["import", "export"]),
});

export type TariffCsvRow = z.infer<typeof tariffCsvRowSchema>;

const numericArray = z.array(z.number().nullable());

export const openMeteoDailyResponseSchema = z.object({
	daily: z.object({
		time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
		temperature_2m_max: numericArray,
		temperature_2m_min: numericArray,
		temperature_2m_mean: numericArray,
		cloud_cover_mean: numericArray,
		precipitation_sum: numericArray,
		shortwave_radiation_sum: numericArray,
		sunshine_duration: numericArray,
	}),
});
