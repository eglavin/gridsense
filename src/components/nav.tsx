"use client";

import { Sun, Car, Wallet, LayoutDashboard, Settings, Zap, Moon, Menu, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/features/auth/auth-client";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ href: "/", label: "Overview", icon: LayoutDashboard },
	{ href: "/solar", label: "Solar", icon: Sun },
	{ href: "/car-charging", label: "Car Charging", icon: Car },
	{ href: "/cost-savings", label: "Cost & Savings", icon: Wallet },
];

export function TopNav() {
	const pathname = usePathname();
	const router = useRouter();
	const { resolvedTheme, setTheme } = useTheme();
	const { data: session } = useSession();
	const mounted = useMounted();

	async function handleSignOut() {
		await signOut();
		router.push("/sign-in");
		router.refresh();
	}

	return (
		<header className="bg-background sticky top-0 z-40 border-b">
			<div className="flex h-14 items-center gap-2 px-4 sm:gap-4">
				<Link href="/" className="flex shrink-0 items-center gap-2">
					<Zap className="text-primary size-5" />
					<span className="font-semibold">GridSense</span>
				</Link>

				<nav className="hidden flex-1 items-center gap-1 md:flex">
					{NAV_ITEMS.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Button
								key={item.href}
								variant="link"
								size="default"
								className={cn(isActive ? "bg-muted text-foreground" : "text-muted-foreground")}
								render={<Link href={item.href} />}
								nativeButton={false}
							>
								<item.icon className="size-4" />
								{item.label}
							</Button>
						);
					})}
				</nav>

				<div className="flex flex-1 md:hidden">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-lg"
									className="shrink-0 cursor-pointer"
									aria-label="Open navigation menu"
								>
									<Menu />
								</Button>
							}
						/>
						<DropdownMenuContent align="start">
							{NAV_ITEMS.map((item) => {
								const isActive = pathname === item.href;
								return (
									<DropdownMenuItem
										key={item.href}
										render={<Link href={item.href} />}
										className={cn(
											"py-2 cursor-pointer mb-1",
											isActive && "bg-accent text-accent-foreground",
										)}
									>
										<item.icon className="size-4" />
										{item.label}
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<Button
					variant="ghost"
					size="icon-lg"
					className={cn(
						"shrink-0",
						pathname.startsWith("/settings") ? "bg-muted text-foreground" : "text-muted-foreground",
					)}
					aria-label="Settings"
					render={<Link href="/settings" />}
					nativeButton={false}
				>
					<Settings />
				</Button>

				<Button
					variant="ghost"
					size="icon-lg"
					className="shrink-0 cursor-pointer"
					aria-label="Toggle theme"
					onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
				>
					{mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
				</Button>

				{session && (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-lg"
									className="shrink-0 cursor-pointer"
									aria-label="Account menu"
								>
									<LogOut />
								</Button>
							}
						/>
						<DropdownMenuContent align="end" className="min-w-60">
							<div className="text-muted-foreground px-2 py-1.5 text-sm">{session.user.email}</div>
							<DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
								<LogOut className="size-4" />
								Sign out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</header>
	);
}
