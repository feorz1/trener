const { networkInterfaces } = require("node:os");
const { spawnSync, spawn } = require("node:child_process");

const args = process.argv.slice(2);
const isDevClient = args.includes("--dev-client");
const isStorybook = args.includes("--storybook");

function isPrivateIp(address) {
  return (
    address.startsWith("192.168.") ||
    address.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function scoreInterface(name, address) {
  const lowerName = name.toLowerCase();
  let score = 0;

  if (address.startsWith("192.168.")) score += 40;
  if (address.startsWith("10.")) score += 30;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) score += 20;
  if (/ethernet|wi-?fi|wireless|wlan/.test(lowerName)) score += 20;
  if (/tun|tap|vpn|virtual|vbox|vmware|hyper-v|wsl|docker|loopback/.test(lowerName)) score -= 60;

  return score;
}

function findLanIp() {
  const candidates = [];
  const interfaces = networkInterfaces();

  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family !== "IPv4" || entry.internal || !isPrivateIp(entry.address)) {
        continue;
      }

      candidates.push({
        name,
        address: entry.address,
        score: scoreInterface(name, entry.address),
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

const selected = findLanIp();

if (!selected) {
  console.error("No private LAN IPv4 address was found. Use npm.cmd run start:tunnel instead.");
  process.exit(1);
}

console.log(`Using ${selected.address} from ${selected.name} for iPhone LAN testing.`);

const timestampResult = spawnSync("npm.cmd", ["run", "storybook:timestamps"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (timestampResult.error) {
  console.error(timestampResult.error.message);
  process.exit(1);
}

if (timestampResult.status !== 0) {
  process.exit(timestampResult.status || 1);
}

const port = isStorybook ? "8084" : "8081";
const expoArgs = ["expo", "start", "--lan", "--clear", "--port", port];

if (isDevClient) {
  expoArgs.push("--dev-client");
} else {
  expoArgs.push("--go");
}

const env = {
  ...process.env,
  REACT_NATIVE_PACKAGER_HOSTNAME: selected.address,
};

if (isStorybook) {
  env.STORYBOOK_ENABLED = "true";
  env.EXPO_PUBLIC_STORYBOOK_ENABLED = "true";
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, expoArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
