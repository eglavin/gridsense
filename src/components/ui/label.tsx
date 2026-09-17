"use client";

import { cn } from "cn";
import * as React from "react";

function Label({ className, ...props }: React.ComponentProps<"label">) {
	return (
		// This is a generic primitive; callers pass htmlFor (or wrap a control)
		// via ...props, which the linter can't trace back to this element.
		// oxlint-disable-next-line jsx-a11y/label-has-associated-control
		<label
			data-slot="label"
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
