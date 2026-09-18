import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Next injects inline bootstrap scripts, so without a per-request nonce (which would force every page dynamic
// via a proxy) 'unsafe-inline' is required for scripts. Dev additionally needs 'unsafe-eval' for React's debugging.
const contentSecurityPolicy = [
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
	...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
	{ key: "Content-Security-Policy", value: contentSecurityPolicy },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
	},
	{ key: "Cross-Origin-Opener-Policy", value: "same-origin" },
	...(isDev
		? []
		: [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
	output: "standalone",
	poweredByHeader: false,
	experimental: {
		serverActions: {
			// Rolling 12-month Zappi hourly exports run a few MB; give uploads headroom.
			bodySizeLimit: "20mb",
		},
	},
	headers() {
		return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
	},
};

export default nextConfig;
