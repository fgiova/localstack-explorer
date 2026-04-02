import { cpSync, readdirSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const iconsDir = path.resolve(__dirname, "../../icons");
const webIcons = [
	"favicon-16x16.png",
	"favicon-32x32.png",
	"apple-touch-icon.png",
	"icon-192x192.png",
	"icon-512x512.png",
];

function copyIcons(): Plugin {
	return {
		name: "copy-icons",
		buildStart() {
			const publicDir = path.resolve(__dirname, "public");
			for (const file of webIcons) {
				cpSync(path.join(iconsDir, file), path.join(publicDir, file));
			}
		},
	};
}

export default defineConfig({
	plugins: [TanStackRouterVite(), react(), tailwindcss(), copyIcons()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
		},
	},
});
