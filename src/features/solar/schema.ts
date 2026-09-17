import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const solarDaily = sqliteTable(
	"solar_daily",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		plantName: text("plant_name").notNull(),
		date: text("date").notNull(),
		energyGeneratedKwh: real("energy_generated_kwh"),
		loadConsumptionKwh: real("load_consumption_kwh"),
		importEnergyKwh: real("import_energy_kwh"),
		exportEnergyKwh: real("export_energy_kwh"),
		selfConsumptionKwh: real("self_consumption_kwh"),
		equivalentHours: real("equivalent_hours"),
		incomeEur: real("income_eur"),
		co2SavedTons: real("co2_saved_tons"),
		treesSaved: real("trees_saved"),
		sourceFile: text("source_file"),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text("updated_at"),
	},
	(table) => [
		unique("solar_daily_plant_date_unique").on(table.plantName, table.date),
		index("solar_daily_date_idx").on(table.date),
	],
);
