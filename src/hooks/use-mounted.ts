import { useSyncExternalStore } from "react";

function subscribe() {
	return () => {};
}

// Returns false during SSR and the client's first render, true after
// hydration — the SSR-safe way to gate client-only UI (e.g. theme-dependent
// icons) without a setState-in-effect.
export function useMounted() {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}
