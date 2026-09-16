import { defaultKit, parseSavedKit, type KitState } from "./kit";
export const LIBRARY_KEY = "gobag:library:v2";
export type SavedKit = { id: string; name: string; state: KitState };
export type KitLibrary = { version: 2; activeId: string; kits: SavedKit[] };
export const initialLibrary: KitLibrary = {
  version: 2,
  activeId: "original",
  kits: [{ id: "original", name: "My GoBag", state: defaultKit }],
};
export const maintenanceSteps = [
  {
    id: "food",
    label: "Check food dates and packaging",
    note: "Review familiar foods and dietary needs; update the review dates below.",
  },
  {
    id: "water",
    label: "Review water storage and dates",
    note: "Follow container and product directions. Check that your household quantity is still right.",
  },
  {
    id: "lights",
    label: "Test lights and spare batteries",
    note: "Confirm devices work and your spare batteries fit.",
  },
  {
    id: "charging",
    label: "Charge power banks and check cables",
    note: "Follow the device’s charging and storage instructions.",
  },
  {
    id: "plan",
    label: "Update personal supplies and your household plan",
    note: "Review contacts, meeting places, maps, clothing sizes, and individual needs.",
  },
] as const;
export function parseLibrary(raw: string): KitLibrary {
  const value = JSON.parse(raw);
  if (
    value?.version !== 2 ||
    !Array.isArray(value.kits) ||
    !value.kits.length ||
    value.kits.length > 20
  )
    throw new Error("This backup must contain 1–20 kits.");
  const ids = new Set<string>();
  const kits: SavedKit[] = value.kits.map((k: unknown) => {
    if (!k || typeof k !== "object") throw new Error("Invalid kit in backup.");
    const item = k as SavedKit;
    if (
      typeof item.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      !item.state ||
      typeof item.state !== "object" ||
      Array.isArray(item.state)
    )
      throw new Error("Invalid or duplicate kit in backup.");
    if (
      !Number.isInteger(item.state.people) ||
      item.state.people < 1 ||
      item.state.people > 50 ||
      ![3, 7, 14].includes(item.state.days) ||
      !item.state.completed ||
      typeof item.state.completed !== "object" ||
      Array.isArray(item.state.completed)
    )
      throw new Error(
        "A kit in this backup has an invalid household or checklist.",
      );
    if (
      item.state.customItems !== undefined &&
      (!Array.isArray(item.state.customItems) ||
        item.state.customItems.length > 100)
    )
      throw new Error("Invalid custom supplies in backup.");
    ids.add(item.id);
    const state = parseSavedKit(JSON.stringify(item.state));
    if (
      item.state.customItems &&
      state.customItems.length !== item.state.customItems.length
    )
      throw new Error("A custom item in this backup is invalid or duplicated.");
    return {
      id: item.id,
      name: item.name.trim().slice(0, 60),
      state,
    };
  });
  return {
    version: 2,
    activeId: ids.has(value.activeId) ? value.activeId : kits[0].id,
    kits,
  };
}
export function exportBackup(library: KitLibrary) {
  return JSON.stringify({ format: "gobag-backup", ...library }, null, 2);
}
export function parseBackup(raw: string) {
  if (raw.length > 10000000)
    throw new Error("Choose a GoBag backup smaller than 10 MB.");
  const value = JSON.parse(raw);
  if (value?.format !== "gobag-backup")
    throw new Error("Choose a GoBag backup JSON file.");
  return parseLibrary(raw);
}
export function appendLibrary(
  current: KitLibrary,
  incoming: KitLibrary,
): KitLibrary {
  if (current.kits.length + incoming.kits.length > 20)
    throw new Error("You can keep up to 20 kits.");
  return {
    ...current,
    kits: [
      ...current.kits,
      ...incoming.kits.map((k) => ({
        ...k,
        id: crypto.randomUUID(),
        name: `${k.name} (imported)`.slice(0, 60),
      })),
    ],
  };
}
export function downloadFile(
  name: string,
  content: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
