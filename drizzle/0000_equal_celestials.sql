CREATE TABLE `car_charger_hourly` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`serial_number` text NOT NULL,
	`timestamp` text NOT NULL,
	`local_date` text NOT NULL,
	`data_coverage_pct` real,
	`net_grid_import_wh` real,
	`net_grid_export_wh` real,
	`total_generation_wh` real,
	`hybrid_inverter_load_wh` real,
	`diverter_l1_wh` real,
	`diverter_l2_wh` real,
	`diverter_l3_wh` real,
	`boosted_l1_wh` real,
	`boosted_l2_wh` real,
	`boosted_l3_wh` real,
	`ct1_positive_wh` real,
	`ct1_negative_wh` real,
	`ct2_positive_wh` real,
	`ct2_negative_wh` real,
	`ct3_positive_wh` real,
	`ct3_negative_wh` real,
	`source_file` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `car_charger_hourly_local_date_idx` ON `car_charger_hourly` (`local_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `car_charger_hourly_serial_timestamp_unique` ON `car_charger_hourly` (`serial_number`,`timestamp`);--> statement-breakpoint
CREATE TABLE `ct_channel_labels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`serial_number` text NOT NULL,
	`channel` text NOT NULL,
	`label` text NOT NULL,
	`category` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ct_channel_labels_serial_channel_unique` ON `ct_channel_labels` (`serial_number`,`channel`);--> statement-breakpoint
CREATE TABLE `ingestion_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_type` text NOT NULL,
	`file_name` text NOT NULL,
	`rows_parsed` integer NOT NULL,
	`rows_inserted` integer NOT NULL,
	`rows_updated` integer NOT NULL,
	`date_range_start` text,
	`date_range_end` text,
	`warnings` text,
	`uploaded_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `solar_daily` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plant_name` text NOT NULL,
	`date` text NOT NULL,
	`energy_generated_kwh` real,
	`load_consumption_kwh` real,
	`import_energy_kwh` real,
	`export_energy_kwh` real,
	`self_consumption_kwh` real,
	`equivalent_hours` real,
	`income_eur` real,
	`co2_saved_tons` real,
	`trees_saved` real,
	`source_file` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `solar_daily_date_idx` ON `solar_daily` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `solar_daily_plant_date_unique` ON `solar_daily` (`plant_name`,`date`);--> statement-breakpoint
CREATE TABLE `tariff_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`eur_per_kwh` real NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
