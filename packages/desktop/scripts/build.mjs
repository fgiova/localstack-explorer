import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(desktopDir, "../..");
const bundleDir = path.join(rootDir, "bundle");

// Verify bundle exists
if (!existsSync(path.join(bundleDir, "bundle.cjs"))) {
  console.error("Error: bundle not found. Run 'pnpm run build:bundle' from the root first.");
  process.exit(1);
}

// Copy bundled backend and frontend into the desktop package directory
cpSync(path.join(bundleDir, "bundle.cjs"), path.join(desktopDir, "bundle.cjs"));
cpSync(path.join(bundleDir, "public"), path.join(desktopDir, "public"), { recursive: true });

// Copy desktop icon from shared icons directory
cpSync(path.join(rootDir, "icons", "icon-desktop.png"), path.join(desktopDir, "icon.png"));

console.log("Assets copied. Running electron-builder...");
