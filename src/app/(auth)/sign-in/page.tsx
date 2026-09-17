import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export default function SignInPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Sign in</CardTitle>
				<CardDescription>
					Don&apos;t have an account?{" "}
					<Link href="/sign-up" className="text-primary underline underline-offset-4">
						Sign up
					</Link>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SignInForm />
			</CardContent>
		</Card>
	);
}
