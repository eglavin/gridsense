"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { signUp } from "../auth-client";

export function SignUpForm() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const form = new FormData(event.currentTarget);
		const name = form.get("name") as string;
		const email = form.get("email") as string;
		const password = form.get("password") as string;

		startTransition(async () => {
			const { error } = await signUp.email({ name, email, password });
			if (error) {
				setError(error.message ?? "Unable to create an account. Check your details and try again.");
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
					<FieldLabel htmlFor="name">Name</FieldLabel>
					<Input id="name" name="name" type="text" autoComplete="name" required />
				</Field>

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
						autoComplete="new-password"
						minLength={8}
						required
					/>
				</Field>

				{error && <FieldError>{error}</FieldError>}

				<Button type="submit" disabled={isPending} className="w-full">
					{isPending ? "Creating account…" : "Create account"}
				</Button>
			</FieldGroup>
		</form>
	);
}
