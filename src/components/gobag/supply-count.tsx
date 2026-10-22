"use client";
import type { EmergencyItem } from "@/data/emergency-items";
import { everydayQuantity } from "@/lib/gobag/everyday";
import { itemQuantity, missingQuantity, ownedQuantity, quantityLabel, type KitState } from "@/lib/gobag/kit";
import s from "./guide.module.css";
export function SupplyCount({ item, state, onChange }: { item: EmergencyItem; state: KitState; onChange: (count: number) => void }) {
  const explanation = everydayQuantity(item, state);
  return <div className={s.supplyCount}>
    {explanation && <p className={s.quantityHelp}>{explanation}{item.id === "water" && <> <a href="https://www.cdc.gov/water-emergency/about/how-to-create-and-store-an-emergency-water-supply.html" target="_blank" rel="noopener noreferrer">Water guidance ↗</a></>}</p>}
    <div className={s.countControls}>
      <label htmlFor={`have-${item.id}`}>I have <input id={`have-${item.id}`} aria-label={`Amount I have: ${item.name} (${item.id === "food" ? "full days of food for one person" : item.unit})`} type="number" min={0} max={10000} step={1} value={ownedQuantity(item, state)} onChange={e => onChange(e.target.valueAsNumber || 0)} /> of {quantityLabel(item, itemQuantity(item, state))}</label>
      <span role="status">{missingQuantity(item, state) ? `Still need ${quantityLabel(item, missingQuantity(item, state))}` : "You have enough — put it in place next."}</span>
    </div>
  </div>;
}
