import { defineConfig } from "oxfmt";

export default defineConfig({
	ignorePatterns: ["drizzle/**"],

	embeddedLanguageFormatting: "auto",
	printWidth: 100,
	sortImports: true,
	sortPackageJson: true,
	sortTailwindcss: true,
	useTabs: true,
});
