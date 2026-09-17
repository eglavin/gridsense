import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db/client";

import * as schema from "./schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "sqlite", schema }),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [nextCookies()],
});
