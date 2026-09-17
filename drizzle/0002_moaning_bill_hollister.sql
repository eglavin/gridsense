CREATE TABLE `esb_grid_30min` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mprn` text NOT NULL,
	`meter_serial_number` text,
	`interval_end` text NOT NULL,
	`local_date` text NOT NULL,
	`import_kwh` real,
	`export_kwh` real,
	`source_file` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `esb_grid_30min_local_date_idx` ON `esb_grid_30min` (`local_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `esb_grid_30min_mprn_interval_end_unique` ON `esb_grid_30min` (`mprn`,`interval_end`);