export const settingsSections = ["Household", "Kits & backups", "Custom supplies", "Budget & sharing", "Review & reminders", "Offline & sources"] as const;
export type SettingsSection = typeof settingsSections[number];
export type PlannerPage = "Home" | "Shopping list" | "Household plan" | "Settings";
export const sectionSlug = (section: string) => section.toLowerCase().replace(/ & /g, "-").replaceAll(" ", "-");
export function readPlannerLocation(url: URL) {
  const view = url.searchParams.get("view");
  const tool = settingsSections.find(t => sectionSlug(t) === url.searchParams.get("section")) ?? "Household";
  const hash = url.hash;
  const review = hash === "#maintenance";
  const planAnchor = ["#plan-editor", "#plan-title", "#household-plan", "#supply-list", "#supplies", "#supplies-heading", "#safety-checks", "#more-preparation", "#personal-essentials", "#preparation-checklist"].includes(hash);
  const page: PlannerPage = planAnchor ? "Home" : review || view === "settings" ? "Settings" : view === "shopping" ? "Shopping list" : "Home";
  return { page, tool: review ? "Review & reminders" as const : tool, editor: ["#plan-editor", "#plan-title", "#household-plan"].includes(hash) };
}
export function plannerURL(current: string, page: PlannerPage, tool: SettingsSection = "Household") {
  const url = new URL(current);
  url.searchParams.set("view", page === "Settings" ? "settings" : page === "Shopping list" ? "shopping" : "plan");
  if (page === "Settings") url.searchParams.set("section", sectionSlug(tool));
  else url.searchParams.delete("section");
  url.hash = page === "Household plan" ? "plan-editor" : "";
  return `${url.pathname}${url.search}${url.hash}`;
}
