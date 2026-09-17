export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
	return new Intl.NumberFormat(undefined, options).format(value);
}

export function formatKwh(value: number, fractionDigits = 1): string {
	return formatNumber(value, {
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	});
}

export function formatEur(value: number, fractionDigits = 2): string {
	return formatNumber(value, {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	});
}

/** `value` is a fraction (0.62 -> "62%"), not a 0-100 percentage. */
export function formatPercent(value: number, fractionDigits = 0): string {
	return formatNumber(value, {
		style: "percent",
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	});
}
