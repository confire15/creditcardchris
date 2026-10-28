"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import type { EmergencyItem } from "@/data/emergency-items";
import { buyingTips } from "@/data/gobag-guidance";
import { completionSnapshot } from "@/lib/gobag/checklist";
import { getSummary, itemQuantity, missingQuantity, ownedQuantity, quantityLabel } from "@/lib/gobag/kit";
import type { useKit } from "@/lib/gobag/use-kit";
import { AmazonButton } from "./kit-parts";
import s from "./guide.module.css";

type Receipt = ReturnType<typeof completionSnapshot> & { name: string };
type Props = { kit: ReturnType<typeof useKit>; openDetail: (id: string) => void };

// Each completion retains its own receipt; a later click never replaces Undo.
function ShoppingRow({ item, kit, receipt, complete, undo, dismiss, openDetail, moveFocus }: Props & {
  item: EmergencyItem; receipt?: Receipt; complete: () => void; undo: () => void;
  dismiss: () => void; moveFocus: (row: HTMLElement) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const moveFocusRef = useRef(moveFocus);
  useEffect(() => { moveFocusRef.current = moveFocus; });
  const done = !!receipt;
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => {
      if (row.current) moveFocusRef.current(row.current);
      setCollapsed(true);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [done]);
  return <div ref={row} data-shopping-row={item.id}>
    <div className={s.shoppingCollapse} data-collapsed={collapsed || undefined} inert={collapsed}>
      <div className={s.shoppingClip}>
        <section className={s.shoppingItem} data-stocked={done || undefined}>
          <h2>{item.name}</h2>
          <p>{done ? "You have enough." : `Still need ${quantityLabel(item, missingQuantity(item, kit.state))}`}</p>
          <div className={s.shoppingActions}>
            <button className={s.textButton} aria-label={`Edit quantity: ${item.name}`} onClick={() => openDetail(item.id)}>Edit quantity</button>
            <label><input data-shopping-check={item.id} type="checkbox" checked={done} aria-disabled={done} onChange={() => { if (!done) complete(); }} /> {done ? "You have enough" : "I have enough"}<span className={s.srOnly}>: {item.name}</span></label>
            {item.searchTerm && <AmazonButton item={item} compact className={s.shoppingAmazon} />}
          </div>
          <details className={s.shoppingHelp}><summary>Buying tips</summary><p>{buyingTips(item)}</p></details>
        </section>
      </div>
    </div>
    {receipt && <div className={s.shoppingReceipt}>
      <Check size={18} aria-hidden="true" /><span>{item.name} marked as stocked</span>
      <button className={s.textButton} aria-label={`Undo stocking: ${item.name}`} onClick={() => { setCollapsed(false); undo(); }}>Undo</button>
      <button className={s.textButton} aria-label={`Dismiss update: ${item.name}`} onClick={dismiss}>Dismiss</button>
    </div>}
  </div>;
}

export function ShoppingList({ kit, openDetail }: Props) {
  const { state } = kit;
  const summary = getSummary(state);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [receipts, setReceipts] = useState<Record<string, Receipt>>({});
  const locked = useRef(new Set<string>());
  const [announcement, setAnnouncement] = useState("");
  const [stockedOpen, setStockedOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const stockedToggle = useRef<HTMLButtonElement>(null);
  const stocked = summary.items.filter(item => missingQuantity(item, state) === 0);
  const matches = (item: EmergencyItem) => item.name.toLowerCase().includes(search.trim().toLowerCase()) && (category === "All categories" || category === item.category);
  const visible = summary.items.filter(item => (missingQuantity(item, state) > 0 && matches(item)) || receipts[item.id]);
  const moveFocus = (row: HTMLElement) => {
    // Do not steal focus if the user already moved elsewhere or into Undo.
    if (!row.querySelector("section")?.contains(document.activeElement)) return;
    const rows = Array.from(list.current?.querySelectorAll<HTMLElement>("[data-shopping-row]") ?? []);
    const index = rows.indexOf(row);
    const candidates = [...rows.slice(index + 1), ...rows.slice(0, index).reverse()];
    const next = candidates.map(r => r.querySelector<HTMLInputElement>('input[data-shopping-check][aria-disabled="false"]')).find(Boolean);
    (next ?? stockedToggle.current)?.focus({ preventScroll: true });
  };
  const removeReceipt = (id: string) => {
    setReceipts(current => { const next = { ...current }; delete next[id]; return next; });
    locked.current.delete(id);
  };
  const edit = (id: string) => {
    // Editing supersedes this receipt so an old Undo cannot overwrite a correction.
    if (receipts[id]) removeReceipt(id);
    openDetail(id);
  };
  return <>
    <div className={s.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    <div className={s.shoppingFilters}>
      <label className={s.field}>Search supplies<span className={s.search}><Search size={18} aria-hidden="true" /><input aria-label="Search shopping list" placeholder="Find a supply" value={search} onChange={e => setSearch(e.target.value)} /></span></label>
      <label className={s.field}>Category<select value={category} onChange={e => setCategory(e.target.value)}><option>All categories</option>{[...new Set(summary.items.map(i => i.category))].map(c => <option key={c}>{c}</option>)}</select></label>
    </div>
    <div ref={list} className={s.shoppingList}>
      {visible.map(item => <ShoppingRow key={item.id} item={item} kit={kit} openDetail={edit} receipt={receipts[item.id]} moveFocus={moveFocus}
        complete={() => {
          if (locked.current.has(item.id)) return;
          locked.current.add(item.id);
          setReceipts(current => ({ ...current, [item.id]: { ...completionSnapshot(state, item.id), name: item.name } }));
          kit.setQuantity(item, "owned", itemQuantity(item, state));
          setAnnouncement(`${item.name} marked as stocked. ${summary.missing.length - 1} items to get. Undo is available beside the item.`);
        }}
        undo={() => {
          const trigger = document.activeElement;
          kit.restoreSupply(receipts[item.id]);
          removeReceipt(item.id);
          if (!matches(item)) { setSearch(""); setCategory("All categories"); }
          setAnnouncement(`${item.name} restored to your shopping list with its previous quantity.`);
          requestAnimationFrame(() => {
            if (document.activeElement === document.body || document.activeElement === trigger)
              list.current?.querySelector<HTMLInputElement>(`[data-shopping-check="${item.id}"]`)?.focus({ preventScroll: true });
          });
        }}
        dismiss={() => {
          stockedToggle.current?.focus({ preventScroll: true });
          removeReceipt(item.id);
        }} />)}
    </div>
    {summary.missing.length === 0 ? <div className={s.empty}><Check size={28} aria-hidden="true" /><h2>Your supply list is complete</h2><p>You have enough of every supply on your current list. You can review or adjust quantities below as your needs change.</p><button className={s.primary} onClick={() => { setStockedOpen(true); stockedToggle.current?.focus({ preventScroll: true }); stockedToggle.current?.scrollIntoView({ block: "nearest" }); }}>Review stocked items</button></div>
      : !summary.missing.some(matches) && <p role="status">No matching supplies. <button className={s.textButton} onClick={() => { setSearch(""); setCategory("All categories"); }}>Clear filters</button></p>}
    <section className={s.stockedSection}>
      <h2><button id="stocked-toggle" ref={stockedToggle} className={s.stockedToggle} aria-expanded={stockedOpen} aria-controls="stocked-supplies" onClick={() => setStockedOpen(open => !open)}><span aria-hidden="true">{stockedOpen ? "−" : "+"}</span> Already stocked ({stocked.length})</button></h2>
      <div id="stocked-supplies" hidden={!stockedOpen}>
        <p className={s.note}>All stocked supplies, regardless of your search or category. Adjust any quantity to return a supply to your shopping list.</p>
        {stocked.map(item => <section key={item.id} className={s.shoppingItem}><h3>{item.name}</h3><p>You have {quantityLabel(item, ownedQuantity(item, state))} · Need {quantityLabel(item, itemQuantity(item, state))}</p><button className={s.textButton} aria-label={`Edit quantity: ${item.name}`} onClick={() => edit(item.id)}>Edit quantity</button></section>)}
        {!stocked.length && <p>No stocked supplies yet. Items appear here when you have enough.</p>}
      </div>
    </section>
  </>;
}
