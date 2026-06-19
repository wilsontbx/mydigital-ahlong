import { defineConfig } from "vite";

export default defineConfig({
	base: "/mydigital-ahlong/",
	build: {
		outDir: "dist",
	},
	test: {
		environment: "jsdom",
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.test.ts", "src/style.css", "src/types.ts"],
		},
	},
});
