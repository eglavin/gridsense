"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { signIn } from "../auth-client";

export function SignInForm() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const form = new FormData(event.currentTarget);
		const email = form.get("email") as string;
		const password = form.get("password") as string;

		startTransition(async () => {
			const { error } = await signIn.email({ email, password });
			if (error) {
				setError(error.message ?? "Unable to sign in. Check your details and try again.");
				return;
			}
			router.push("/");
			router.refresh();
		});
	}

	return (
		<form onSubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input id="email" name="email" type="email" autoComplete="email" required />
				</Field>

				<Field>
					<FieldLabel htmlFor="password">Password</FieldLabel>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
					/>
				</Field>

				{error && <FieldError>{error}</FieldError>}

				<Button type="submit" disabled={isPending} className="w-full">
					{isPending ? "Signing in…" : "Sign in"}
				</Button>
			</FieldGroup>
		</form>
	);
}
