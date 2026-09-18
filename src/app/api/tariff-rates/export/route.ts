import { format } from "date-fns";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { tariffRates } from "@/db/schema";
import { getSession } from "@/features/auth/session";

export async function GET() {
	if (!(await getSession())) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const rows = await db
		.select()
		.from(tariffRates)
		.orderBy(asc(tariffRates.direction), asc(tariffRates.effectiveFrom));

	const lines = [
		"rate,effective_from,direction",
		...rows.map((r) => `${r.eurPerKwh},${r.effectiveFrom},${r.direction}`),
	];

	return new NextResponse(lines.join("\n") + "\n", {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="tariff-rates-${format(new Date(), "yyyy-MM-dd")}.csv"`,
		},
	});
}
