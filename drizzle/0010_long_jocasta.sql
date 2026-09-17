CREATE TABLE `weather_daily` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`temp_max_c` real,
	`temp_min_c` real,
	`temp_mean_c` real,
	`cloud_cover_pct` real,
	`precipitation_mm` real,
	`shortwave_radiation_mj_m2` real,
	`sunshine_duration_s` real,
	`fetched_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `weather_daily_date_idx` ON `weather_daily` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `weather_daily_date_unique` ON `weather_daily` (`date`);