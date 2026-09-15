"use client";
import { useEffect, useState } from "react";
import type { EmergencyItem } from "@/data/emergency-items";
import {
  defaultKit,
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
  const toggle = (item: EmergencyItem) =>
    setState((current) => {
      const completed = { ...current.completed };
      if (isPacked(item, current)) delete completed[item.id];
      else completed[item.id] = itemQuantity(item, current);
      return { ...current, completed };
    });
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
    togglePersonal,
    loaded,
    storageMessage,
    reset: () => setState({ ...defaultKit, completed: {} }),
  };
}
