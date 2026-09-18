import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
	variable: "--font-sans",
	subsets: ["latin"],
});

const description =
	"Self-hosted dashboard for household solar generation, EV charging, grid usage and energy costs.";

export const metadata: Metadata = {
	title: { default: "GridSense", template: "%s | GridSense" },
	description,
	applicationName: "GridSense",
	// Private, login-protected dashboard: keep it out of search indexes.
	robots: { index: false, follow: false },
	openGraph: {
		type: "website",
		siteName: "GridSense",
		title: "GridSense",
		description,
	},
	twitter: { card: "summary", title: "GridSense", description },
	appleWebApp: { title: "GridSense", capable: true },
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
	],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={cn(
				"h-full",
				"antialiased",
				geistSans.variable,
				geistMono.variable,
				"font-sans",
				nunitoSans.variable,
			)}
		>
			<body className="flex min-h-full flex-col">
				<ThemeProvider>
					<TooltipProvider>{children}</TooltipProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
