const path = require("node:path");
const fs = require("node:fs");

process.env.EXPO_ROUTER_APP_ROOT = path.resolve("app");

const { regenerateDeclarations } = require("expo-router/build/typed-routes");
const outputDir = path.resolve(".expo/types");

fs.mkdirSync(outputDir, { recursive: true });
regenerateDeclarations(outputDir);

setTimeout(() => undefined, 1200);
