import { Zap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
			<Link href="/" className="flex items-center gap-2">
				<Zap className="text-primary size-5" />
				<span className="font-semibold">GridSense</span>
			</Link>

			<div className="w-full max-w-sm">{children}</div>
		</div>
	);
}
