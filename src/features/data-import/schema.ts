import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const esbGrid30Min = sqliteTable(
	"esb_grid_30min",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		mprn: text("mprn").notNull(),
		meterSerialNumber: text("meter_serial_number"),
		// End of the 30-minute interval, ISO UTC (ESB reports local Europe/Dublin time).
		intervalEnd: text("interval_end").notNull(),
		localDate: text("local_date").notNull(),
		importKwh: real("import_kwh"),
		exportKwh: real("export_kwh"),
		sourceFile: text("source_file"),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text("updated_at"),
	},
	(table) => [
		unique("esb_grid_30min_mprn_interval_end_unique").on(table.mprn, table.intervalEnd),
		index("esb_grid_30min_local_date_idx").on(table.localDate),
	],
);

export const ingestionLog = sqliteTable("ingestion_log", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	sourceType: text("source_type", {
		enum: ["car_charger", "solar", "esb"],
	}).notNull(),
	fileName: text("file_name").notNull(),
	rowsParsed: integer("rows_parsed").notNull(),
	rowsInserted: integer("rows_inserted").notNull(),
	rowsUpdated: integer("rows_updated").notNull(),
	dateRangeStart: text("date_range_start"),
	dateRangeEnd: text("date_range_end"),
	warnings: text("warnings"),
	uploadedAt: text("uploaded_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
});
