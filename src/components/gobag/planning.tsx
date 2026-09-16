"use client";
import { createContext, useContext } from "react";
import { CalendarDays, MapPin, Users, Wallet, ShoppingBag } from "lucide-react";
import type { useKit } from "@/lib/gobag/use-kit";
import {
  householdNeeds,
  personalizedReminders,
  planFields,
  priorityOf,
  storageOf,
  buyingTips,
  guidanceReviewed,
  guidanceSources,
} from "@/data/gobag-guidance";
import {
  dueReviews,
  reviewItems,
  downloadCalendar,
} from "@/lib/gobag/reminders";
import {
  getSummary,
  ownedQuantity,
  itemQuantity,
  missingQuantity,
  priceRange,
  type KitState,
} from "@/lib/gobag/kit";
import type { EmergencyItem } from "@/data/emergency-items";
import styles from "./gobag.module.css";
export const KitContext = createContext<ReturnType<typeof useKit> | null>(null);
const usePlanner = () => {
  const kit = useContext(KitContext);
  if (!kit) throw new Error("Kit provider missing");
  return kit;
};
export function ItemPlanning({ item }: { item: EmergencyItem }) {
  const { state, setQuantity } = usePlanner();
  const required = itemQuantity(item, state);
  return (
    <div className={styles.inventoryPanel}>
      <div className={styles.itemTags}>
        <span>{priorityOf(item)}</span>
        <span>{storageOf(item)}</span>
      </div>
      <details className={styles.why}>
        <summary>
          <ShoppingBag size={14} /> What to look for
        </summary>
        <p>{buyingTips(item)}</p>
      </details>
      <div className={styles.inventoryGrid}>
        <label>
          Owned <span>({item.pluralUnit ?? item.unit})</span>
          <input
            aria-label={`Owned quantity: ${item.name}`}
            type="number"
            min={0}
            max={10000}
            step={1}
            value={ownedQuantity(item, state)}
            onChange={(e) => setQuantity(item, "owned", e.target.valueAsNumber)}
          />
        </label>
        <label>
          Packed / stored
          <input
            aria-label={`Packed quantity: ${item.name}`}
            type="number"
            min={0}
            max={10000}
            step={1}
            value={state.completed[item.id] ?? 0}
            onChange={(e) =>
              setQuantity(item, "completed", e.target.valueAsNumber)
            }
          />
        </label>
      </div>
      <p className={styles.inventoryNote}>
        {ownedQuantity(item, state)} of {required} owned ·{" "}
        {missingQuantity(item, state)} still needed
      </p>
      <label className={styles.owned}>
        <input
          type="checkbox"
          aria-label={`I own the full quantity: ${item.name}`}
          checked={missingQuantity(item, state) === 0}
          onChange={(e) =>
            setQuantity(item, "owned", e.target.checked ? required : 0)
          }
        />{" "}
        I own the full quantity
      </label>
    </div>
  );
}
export function HouseholdNeeds() {
  const { state, update, togglePersonal } = usePlanner();
  return (
    <section className={styles.planningPanel} aria-labelledby="needs-title">
      <div className={styles.panelHeading}>
        <Users size={22} />
        <h3 id="needs-title">A little more personal</h3>
      </div>
      <p>
        Choose what applies. These optional reminders stay on this device and do
        not change the supply estimates.
      </p>
      <div className={styles.needsOptions}>
        {householdNeeds.map((n) => (
          <label key={n.id}>
            <input
              type="checkbox"
              checked={state.needs.includes(n.id)}
              onChange={(e) =>
                update({
                  needs: e.target.checked
                    ? [...state.needs, n.id]
                    : state.needs.filter((id) => id !== n.id),
                })
              }
            />
            {n.label}
          </label>
        ))}
      </div>
      {personalizedReminders(state.needs).length > 0 && (
        <div className={styles.needsReminders}>
          {personalizedReminders(state.needs).map((r) => (
            <label key={r.id}>
              <input
                type="checkbox"
                checked={!!state.completed[r.id]}
                onChange={() => togglePersonal(r.id)}
              />
              {r.name}
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
export function ModeAndBudget({
  priority,
  setPriority,
  placement,
  setPlacement,
}: {
  priority: string;
  setPriority: (v: string) => void;
  placement: string;
  setPlacement: (v: string) => void;
}) {
  const { state } = usePlanner();
  const s = getSummary(state);
  const first = s.missing.filter((i) => priorityOf(i) === "Start here");
  const range = priceRange(
    first.reduce(
      (n, i) => n + (i.estimatedPriceMin ?? 0) * missingQuantity(i, state),
      0,
    ),
    first.reduce(
      (n, i) => n + (i.estimatedPriceMax ?? 0) * missingQuantity(i, state),
      0,
    ),
  );
  return (
    <section
      className={styles.planningPanel}
      aria-label="Storage and budget planning"
    >
      <div className={styles.panelHeading}>
        <Wallet size={22} />
        <h3>
          {state.mode === "go-bag"
            ? "Pack light. Keep reserves ready."
            : "Build your home reserves."}
        </h3>
      </div>
      <p>
        {state.mode === "go-bag"
          ? "Carry essentials appear first. Keep full water and food reserves at home, and choose a manageable portion to take if you leave. The full household target stays visible."
          : "Home reserves appear first. Store water, food, and shelter supplies accessibly; keep carry essentials together for a possible evacuation."}
      </p>
      <p>
        <strong>Start-here shopping estimate: {range}</strong> · {first.length}{" "}
        supply types still needed.
      </p>
      <p>
        Start with water, food, light, first aid, and communication. Add next
        means a later shopping step, not an optional safety item. Personal
        medical and accessibility needs may come first. These priorities are
        GoBag’s suggested shopping order.
      </p>
      <div className={styles.planningFilters}>
        <label>
          Shopping priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option>All priorities</option>
            <option>Start here</option>
            <option>Add next</option>
          </select>
        </label>
        <label>
          Storage group
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
          >
            <option>All supplies</option>
            <option>Carry essentials</option>
            <option>Home reserves</option>
          </select>
        </label>
      </div>
    </section>
  );
}
export function ReviewReminders() {
  const { state, update } = usePlanner();
  const due = dueReviews(state);
  const items = reviewItems(state);
  const count = items.filter((i) => state.reviewDates[i.id]).length;
  return (
    <section className={styles.planningPanel} aria-labelledby="reviews-title">
      <div className={styles.panelHeading}>
        <CalendarDays size={22} />
        <h3 id="reviews-title">Keep your kit up to date</h3>
      </div>
      <p>
        Record the next expiration or review date for food, water, batteries,
        medications, and other supplies. Follow product storage directions and
        your pharmacist’s guidance. Use the earliest date if you have several
        batches.
      </p>
      <p role="status">
        {due.length
          ? `${due.length} ${due.length === 1 ? "supply is" : "supplies are"} due for review.`
          : "No saved reviews are due today."}
      </p>
      {due.length > 0 && (
        <ul>
          {due.map((i) => (
            <li key={i.id}>
              {i.name} — {state.reviewDates[i.id]}
            </li>
          ))}
        </ul>
      )}
      <details className={styles.planningDetails}>
        <summary>Manage review dates ({count} saved)</summary>
        <div className={styles.reviewGrid}>
          {items.map((i) => (
            <label key={i.id}>
              {i.name}
              <input
                type="date"
                aria-label={`Review date: ${i.name}`}
                value={state.reviewDates[i.id] ?? ""}
                onChange={(e) =>
                  update({
                    reviewDates: {
                      ...state.reviewDates,
                      [i.id]: e.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </details>
      <button
        className={styles.secondary}
        disabled={!count}
        onClick={() => downloadCalendar(state)}
      >
        Download calendar reminders
      </button>
      <p className={styles.smallNote}>
        Import the .ics file into your calendar to enable reminders. GoBag shows
        due dates when opened; it does not send background notifications.
        Calendar alerts depend on your calendar settings. Re-importing may
        create duplicates.
      </p>
    </section>
  );
}
export function HouseholdPlan() {
  const { state, update } = usePlanner();
  return (
    <section className={styles.planningPanel} aria-labelledby="plan-title">
      <div className={styles.panelHeading}>
        <MapPin size={22} />
        <h3 id="plan-title">Your household emergency plan</h3>
      </div>
      <p>
        Choose meeting places and contacts together. Obtain current evacuation
        maps from your city or county. Follow local instructions during an
        emergency.
      </p>
      <div className={styles.planGrid}>
        {planFields.map((f) => (
          <label key={f.id}>
            {f.label}
            <textarea
              aria-label={f.label}
              maxLength={500}
              rows={2}
              value={state.plan[f.id] ?? ""}
              onChange={(e) =>
                update({ plan: { ...state.plan, [f.id]: e.target.value } })
              }
            />
          </label>
        ))}
      </div>
      <p className={styles.smallNote}>
        Saved only in this browser, without encryption. Anyone using this
        browser profile can read it. Avoid sensitive medical or identity
        details. Your plan is included when you print.
      </p>
      <button className={styles.secondary} onClick={() => window.print()}>
        Print kit and household plan
      </button>
    </section>
  );
}
export function PrintedPlanning({ state }: { state: KitState }) {
  return (
    <>
      <h2>Household emergency plan</h2>
      {planFields.map((f) => (
        <p key={f.id}>
          <strong>{f.label}:</strong> {state.plan[f.id] || "Not filled in"}
        </p>
      ))}
      <h2>Personalized reminders</h2>
      <ul>
        {personalizedReminders(state.needs).map((r) => (
          <li key={r.id}>
            {state.completed[r.id] ? "✓" : "☐"} {r.name}
          </li>
        ))}
      </ul>
      <h2>Supply review dates</h2>
      <ul>
        {reviewItems(state)
          .filter((i) => state.reviewDates[i.id])
          .map((i) => (
            <li key={i.id}>
              {i.name}: {state.reviewDates[i.id]}
            </li>
          ))}
      </ul>
    </>
  );
}
export function GuidanceReview() {
  return (
    <section className={styles.planningPanel} aria-labelledby="guidance-review">
      <h3 id="guidance-review">Guidance and sources</h3>
      <p>
        Content reviewed{" "}
        <time dateTime={guidanceReviewed}>September 16, 2026</time>. GoBag’s
        quantities and shopping priorities are planning estimates; local
        guidance and individual needs take precedence.
      </p>
      <ul>
        {guidanceSources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label} ↗
            </a>
          </li>
        ))}
      </ul>
      <p className={styles.smallNote}>
        Water and household planning were checked against CDC and National
        Institute on Aging guidance. Ready.gov links are included for reference;
        direct automated access was restricted during this review. This is a
        dated content review, not live monitoring or product certification.
      </p>
    </section>
  );
}
