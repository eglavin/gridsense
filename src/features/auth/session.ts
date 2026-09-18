import { headers } from "next/headers";

import { auth } from "./auth";

export async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// Server actions are directly invocable POST endpoints, so the dashboard layout's redirect does not protect them.
export async function requireSession() {
	const session = await getSession();
	if (!session) {
		throw new Error("Unauthorized");
	}
	return session;
}
