"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { GRANULARITY_COOKIE } from "@/constants/granularity-constants";
import type { Granularity } from "@/lib/aggregate";

type GranularityContextValue = [Granularity, (value: Granularity) => void];

const GranularityContext = createContext<GranularityContextValue | null>(null);

// Scopes a single granularity selection to every chart nested under it, so
// switching one chart's Daily/Monthly/Yearly toggle updates the others on the
// same page immediately, and persists (via cookie) as the default for other
// pages' providers too.
export function GranularityProvider({
	initial,
	children,
}: {
	initial: Granularity;
	children: ReactNode;
}) {
	const [granularity, setGranularityState] = useState(initial);

	function setGranularity(value: Granularity) {
		setGranularityState(value);
		document.cookie = `${GRANULARITY_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
	}

	return (
		<GranularityContext.Provider value={[granularity, setGranularity]}>
			{children}
		</GranularityContext.Provider>
	);
}

export function useGranularity(): GranularityContextValue {
	const value = useContext(GranularityContext);
	if (!value) {
		throw new Error("useGranularity must be used within a GranularityProvider");
	}
	return value;
}
