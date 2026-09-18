import type { MetadataRoute } from "next";

// Private, login-protected dashboard: nothing here should be crawled.
export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: "*", disallow: "/" },
	};
}
