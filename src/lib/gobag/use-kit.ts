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
  type KitState,
} from "./kit";

export function useKit() {
  const [state, setState] = useState<KitState>(defaultKit);
  const [loaded, setLoaded] = useState(false);
  const [storageMessage, setStorageMessage] = useState(
    "Loading your saved checklist…",
  );
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState(parseSavedKit(saved));
      setStorageMessage("Saved on this device");
    } catch {
      setStorageMessage(
        "Saved data could not be read. Your checklist still works in this session.",
      );
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageMessage("Saved on this device");
    } catch {
      setStorageMessage(
        "Device storage is unavailable. Changes will last for this session only.",
      );
    }
  }, [state, loaded]);
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
    update,
    toggle,
    setQuantity,
    togglePersonal,
    loaded,
    storageMessage,
    reset: () => setState({ ...defaultKit, completed: {} }),
  };
}
