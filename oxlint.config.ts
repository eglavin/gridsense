import { defineConfig } from "oxlint";

export default defineConfig({
	plugins: ["typescript", "unicorn", "oxc", "react", "nextjs", "jsx-a11y"],
	categories: {
		correctness: "error",
	},
	rules: {},
	env: {
		builtin: true,
	},
});
