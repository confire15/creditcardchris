import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.startsWith(".claude/"))
  .filter((file) => !file.endsWith("package-lock.json"))
  .filter((file) => !file.endsWith(".png") && !file.endsWith(".jpg") && !file.endsWith(".jpeg") && !file.endsWith(".gif") && !file.endsWith(".ico"));

const patterns = [
  { name: "Stripe secret key", regex: /sk_(live|test)_[A-Za-z0-9]{20,}/g },
  { name: "Stripe webhook secret", regex: /whsec_[A-Za-z0-9]{20,}/g },
  { name: "AWS access key", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "Google API key", regex: /AIza[0-9A-Za-z_-]{35}/g },
  { name: "Private key", regex: /-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g },
  { name: "Supabase JWT-like token", regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
];

const failures = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    const matches = text.match(pattern.regex);
    if (matches?.length) {
      failures.push(`${file}: ${pattern.name}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Secret scan failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Secret scan passed.");
