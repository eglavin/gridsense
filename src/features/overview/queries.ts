import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { getAppSettings } from "@/features/app-settings/settings";

export interface DailyOverviewRow {
	date: string;
	gridImportKwh: number;
	gridExportKwh: number;
	evChargeSolarKwh: number;
	evChargeGridKwh: number;
	solarGeneratedKwh: number | null;
	houseLoadKwh: number | null;
	/** Where this day's grid import/export figures came from — "none" when neither is available (grid figures default to 0). */
	gridSource: "esb" | "car_charger" | "none";
}

export function getDailyOverview(from: string, to: string): DailyOverviewRow[] {
	const { allowZappiGridFallback } = getAppSettings();

	const rows = db.all<{
		date: string;
		esb_import_kwh: number | null;
		esb_export_kwh: number | null;
		zappi_import_kwh: number | null;
		zappi_export_kwh: number | null;
		ev_charge_solar_kwh: number | null;
		ev_charge_grid_kwh: number | null;
		solar_generated_kwh: number | null;
		house_load_kwh: number | null;
	}>(sql`
    WITH esb_daily AS (
      SELECT local_date AS date, SUM(import_kwh) AS import_kwh, SUM(export_kwh) AS export_kwh
      FROM esb_grid_30min
      WHERE local_date BETWEEN ${from} AND ${to}
      GROUP BY local_date
    ),
    car_daily AS (
      SELECT
        local_date AS date,
        SUM(net_grid_import_wh) / 1000.0 AS grid_import_kwh,
        SUM(net_grid_export_wh) / 1000.0 AS grid_export_kwh,
        SUM(diverter_l1_wh + diverter_l2_wh + diverter_l3_wh) / 1000.0 AS ev_charge_solar_kwh,
        SUM(boosted_l1_wh + boosted_l2_wh + boosted_l3_wh) / 1000.0 AS ev_charge_grid_kwh
      FROM car_charger_hourly
      WHERE local_date BETWEEN ${from} AND ${to}
      GROUP BY local_date
    ),
    solar_agg AS (
      SELECT date, MAX(energy_generated_kwh) AS energy_generated_kwh, MAX(load_consumption_kwh) AS load_consumption_kwh
      FROM solar_daily
      WHERE date BETWEEN ${from} AND ${to}
      GROUP BY date
    ),
    -- Each source may cover a different set of days (e.g. ESB uploaded alone,
    -- no car charger data yet), so the day list is a union of all of them
    -- rather than being anchored on any single source. EV charging always
    -- needs car_daily regardless of the grid-fallback setting below, since
    -- it's the only source for diverter/boosted figures.
    dates AS (
      SELECT date FROM esb_daily
      UNION
      SELECT date FROM car_daily
      UNION
      SELECT date FROM solar_agg
    )
    SELECT
      d.date AS date,
      e.import_kwh AS esb_import_kwh,
      e.export_kwh AS esb_export_kwh,
      c.grid_import_kwh AS zappi_import_kwh,
      c.grid_export_kwh AS zappi_export_kwh,
      c.ev_charge_solar_kwh AS ev_charge_solar_kwh,
      c.ev_charge_grid_kwh AS ev_charge_grid_kwh,
      s.energy_generated_kwh AS solar_generated_kwh,
      s.load_consumption_kwh AS house_load_kwh
    FROM dates d
    LEFT JOIN esb_daily e ON e.date = d.date
    LEFT JOIN car_daily c ON c.date = d.date
    LEFT JOIN solar_agg s ON s.date = d.date
    ORDER BY d.date ASC
  `);

	return rows.map((r) => {
		const usesZappi = allowZappiGridFallback && r.esb_import_kwh === null;
		const gridSource: DailyOverviewRow["gridSource"] =
			r.esb_import_kwh !== null
				? "esb"
				: allowZappiGridFallback && r.zappi_import_kwh !== null
					? "car_charger"
					: "none";

		return {
			date: r.date,
			gridImportKwh: r.esb_import_kwh ?? (usesZappi ? r.zappi_import_kwh : null) ?? 0,
			gridExportKwh: r.esb_export_kwh ?? (usesZappi ? r.zappi_export_kwh : null) ?? 0,
			evChargeSolarKwh: r.ev_charge_solar_kwh ?? 0,
			evChargeGridKwh: r.ev_charge_grid_kwh ?? 0,
			solarGeneratedKwh: r.solar_generated_kwh,
			houseLoadKwh: r.house_load_kwh,
			gridSource,
		};
	});
}
