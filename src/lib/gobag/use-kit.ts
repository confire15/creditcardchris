"use client";
import { useEffect, useState } from "react";
import type { EmergencyItem } from "@/data/emergency-items";
import {
  defaultKit,
  changeQuantity,
  isPacked,
  itemQuantity,
  parseSavedKit,
  STORAGE_KEY,
  setCombinedRadio,
  type KitState,
} from "./kit";

import {
  LIBRARY_KEY,
  initialLibrary,
  parseLibrary,
  appendLibrary,
  type KitLibrary,
} from "./library";
export function useKit() {
  const [library, setLibrary] = useState<KitLibrary>(initialLibrary);
  const active =
    library.kits.find((k) => k.id === library.activeId) ?? library.kits[0];
  const state = active.state;
  const setState = (change: KitState | ((current: KitState) => KitState)) =>
    setLibrary((current) => ({
      ...current,
      kits: current.kits.map((k) =>
        k.id === current.activeId
          ? {
              ...k,
              state: typeof change === "function" ? change(k.state) : change,
            }
          : k,
      ),
    }));
  const [loaded, setLoaded] = useState(false);
  const [canPersist, setCanPersist] = useState(true);
  const [storageMessage, setStorageMessage] = useState(
    "Loading your saved checklist…",
  );
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LIBRARY_KEY);
      if (saved) setLibrary(parseLibrary(saved));
      else {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy)
          setLibrary({
            ...initialLibrary,
            kits: [{ ...initialLibrary.kits[0], state: parseSavedKit(legacy) }],
          });
      }
      setStorageMessage("Saved on this device");
    } catch {
      setCanPersist(false);
      setStorageMessage(
        "Saved data could not be read. Your checklist still works in this session.",
      );
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded || !canPersist) return;
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
      setStorageMessage("Saved on this device");
    } catch {
      setStorageMessage(
        "Device storage is unavailable. Changes will last for this session only.",
      );
    }
  }, [library, loaded, canPersist]);
  const update = (patch: Partial<KitState>) =>
    setState((current) => ({ ...current, ...patch }));
  const setQuantity = (
    item: EmergencyItem,
    kind: "owned" | "completed",
    count: number,
  ) => setState((current) => changeQuantity(current, item, kind, count));
  const toggle = (item: EmergencyItem) =>
    setState((current) =>
      changeQuantity(
        current,
        item,
        "completed",
        isPacked(item, current) ? 0 : itemQuantity(item, current),
      ),
    );
  const togglePersonal = (id: string) =>
    setState((current) => {
      const completed = { ...current.completed };
      if (completed[id]) delete completed[id];
      else completed[id] = 1;
      return { ...current, completed };
    });
  return {
    state,
    library,
    activeName: active.name,
    switchKit: (id: string) =>
      setLibrary((current) =>
        current.kits.some((k) => k.id === id)
          ? { ...current, activeId: id }
          : current,
      ),
    addKit: (name: string) =>
      setLibrary((current) => {
        if (current.kits.length >= 20 || !name.trim()) return current;
        const id = crypto.randomUUID();
        return {
          ...current,
          activeId: id,
          kits: [
            ...current.kits,
            {
              id,
              name: name.trim().slice(0, 60),
              state: {
                ...defaultKit,
                mode: name.toLowerCase().includes("home")
                  ? "stay-home"
                  : "go-bag",
              },
            },
          ],
        };
      }),
    renameKit: (name: string) =>
      setLibrary((current) =>
        name.trim()
          ? {
              ...current,
              kits: current.kits.map((k) =>
                k.id === current.activeId
                  ? { ...k, name: name.trim().slice(0, 60) }
                  : k,
              ),
            }
          : current,
      ),
    deleteKit: () =>
      setLibrary((current) => {
        if (current.kits.length === 1) return current;
        const kits = current.kits.filter((k) => k.id !== current.activeId);
        return { ...current, kits, activeId: kits[0].id };
      }),
    importKits: (incoming: KitLibrary, replace: boolean) => {
      setCanPersist(true);
      setLibrary((current) =>
        replace ? incoming : appendLibrary(current, incoming),
      );
    },
    combineRadio: (combined: boolean) =>
      setState((current) => setCombinedRadio(current, combined)),
    update,
    toggle,
    setQuantity,
    togglePersonal,
    loaded,
    storageMessage,
    reset: () => {
      setCanPersist(true);
      setState({ ...defaultKit, completed: {} });
    },
  };
}
