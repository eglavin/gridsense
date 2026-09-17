"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs } from "@/components/ui/tabs";

export function SettingsTabs({ tab, children }: { tab: string; children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();

	return (
		<Tabs
			value={tab}
			onValueChange={(value) => router.push(`${pathname}?tab=${value}`, { scroll: false })}
		>
			{children}
		</Tabs>
	);
}
