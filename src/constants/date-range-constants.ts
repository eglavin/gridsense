import { startOfYear } from "date-fns";

export const DATE_RANGE_COOKIE = "dashboard_date_range";
export const MIN_SELECTABLE_DATE = startOfYear(new Date(2020, 0, 1, 0, 0, 0));
