import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			// Rolling 12-month Zappi hourly exports run a few MB; give uploads headroom.
			bodySizeLimit: "20mb",
		},
	},
};

export default nextConfig;
