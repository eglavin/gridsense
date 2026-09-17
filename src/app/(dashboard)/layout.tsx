import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TopNav } from "@/components/nav";
import { auth } from "@/features/auth/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		redirect("/sign-in");
	}

	return (
		<div className="flex min-h-screen flex-col">
			<TopNav />
			<main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
		</div>
	);
}
