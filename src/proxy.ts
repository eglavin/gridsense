import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

// Next injects inline bootstrap scripts, so without a per-request nonce (which would force every page dynamic)
// 'unsafe-inline' is required for scripts. Dev additionally needs 'unsafe-eval' for React's debugging.
const contentSecurityPolicyDirectives = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https://*.tile.openstreetmap.org",
	"font-src 'self'",
	"connect-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
];

const baseHeaders = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

// These break a plain-HTTP deployment (upgrade-insecure-requests rewrites every sub-resource to https://), so they
// are opt-in. Read per request rather than in next.config.ts, whose headers() is frozen at build time and so could
// not be toggled by an env var on a prebuilt Docker image.
export function proxy() {
	const requireHttps = process.env.REQUIRE_HTTPS === "true";
	const response = NextResponse.next();

	const directives = requireHttps
		? [...contentSecurityPolicyDirectives, "upgrade-insecure-requests"]
		: contentSecurityPolicyDirectives;
	response.headers.set("Content-Security-Policy", directives.join("; "));

	for (const [key, value] of Object.entries(baseHeaders)) {
		response.headers.set(key, value);
	}

	if (requireHttps) {
		response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
	}

	return response;
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
