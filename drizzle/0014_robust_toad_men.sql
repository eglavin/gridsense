CREATE TABLE `weather_hourly` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`local_date` text NOT NULL,
	`hour` text NOT NULL,
	`cloud_cover_pct` real,
	`fetched_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `weather_hourly_date_idx` ON `weather_hourly` (`local_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `weather_hourly_date_hour_unique` ON `weather_hourly` (`local_date`,`hour`);