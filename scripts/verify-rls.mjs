import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["supabase"];
const sqlFiles = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === ".temp" || entry === "archive") continue;
      walk(path);
      continue;
    }
    if (path.endsWith(".sql")) sqlFiles.push(path);
  }
}

for (const root of roots) walk(root);

const sql = sqlFiles.map((file) => readFileSync(file, "utf8")).join("\n").toLowerCase();

const userTables = [
  "audit_logs",
  "card_applications",
  "card_perks",
  "card_subs",
  "household_invites",
  "household_members",
  "households",
  "notification_preferences",
  "push_subscriptions",
  "rewards_goals",
  "spend_challenges",
  "spending_budgets",
  "statement_credits",
  "subscriptions",
  "transactions",
  "user_card_rewards",
  "user_cards",
  "user_category_spend",
];

const publicReferenceTables = new Set([
  "card_downgrade_paths",
  "card_perk_templates",
  "card_template_credits",
  "card_template_rewards",
  "card_templates",
  "public_profiles",
  "spending_categories",
]);

const failures = [];

for (const table of userTables) {
  const enablePattern = new RegExp(`alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`);
  if (!enablePattern.test(sql)) {
    failures.push(`${table}: missing ENABLE ROW LEVEL SECURITY`);
  }

  const broadPolicyPattern = new RegExp(
    `create\\s+policy[\\s\\S]{0,300}?on\\s+(?:public\\.)?${table}[\\s\\S]{0,500}?(using\\s*\\(\\s*true\\s*\\)|with\\s+check\\s*\\(\\s*true\\s*\\))`,
  );
  if (broadPolicyPattern.test(sql)) {
    failures.push(`${table}: broad true policy on user data table`);
  }
}

for (const table of publicReferenceTables) {
  const enablePattern = new RegExp(`alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`);
  if (!enablePattern.test(sql)) {
    failures.push(`${table}: public reference table should still have RLS enabled`);
  }
}

if (failures.length > 0) {
  console.error("RLS verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RLS verification passed.");
