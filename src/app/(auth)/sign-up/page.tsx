import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Create an account</CardTitle>
				<CardDescription>
					Already have an account?{" "}
					<Link href="/sign-in" className="text-primary underline underline-offset-4">
						Sign in
					</Link>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SignUpForm />
			</CardContent>
		</Card>
	);
}
