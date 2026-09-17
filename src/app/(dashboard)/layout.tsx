import { TopNav } from "@/components/nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col">
			<TopNav />
			<main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
		</div>
	);
}
