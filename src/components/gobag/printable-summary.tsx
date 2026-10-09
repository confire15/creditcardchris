import { personalEssentials } from "@/data/emergency-items";
import {
  getSummary,
  isPacked,
  quantityLabel,
  itemQuantity,
  ownedQuantity,
  missingQuantity,
  type KitState,
} from "@/lib/gobag/kit";
import { preparationGroups, preparationSubtitle } from "@/data/gobag-preparation";
import { activeHomeActions, preparationProgress } from "@/lib/gobag/preparation";
import { storageOf } from "@/data/gobag-guidance";
import { PrintedPlanning } from "./planning";
import styles from "./gobag.module.css";
export function PrintableSummary({
  state,
  name,
}: {
  state: KitState;
  name: string;
}) {
  const s = getSummary(state);
  return (
    <section
      className={styles.printOnly}
      aria-label="My Emergency Kit printable summary"
    >
      <h1>{name} — Household preparation</h1>
      <p>Prepare for Super El Nino · Get prepared, carry essentials, and home reserves</p>
      <p>
        Household: {state.people} · Duration: {state.days} days · Water:{" "}
        {s.water} gallons minimum
        {state.pets ? ` · Pets: ${state.petCount} (water additional)` : ""}
      </p>
      <p>
        One gallon per person per day for drinking and sanitation. Store full
        reserves separately where needed.
      </p>
      {[true, false].map((packed) => (
        <div key={String(packed)}>
          <h2>
            {packed ? "Completed supplies" : "Supplies still to pack / store"}
          </h2>
          <ul>
            {s.items
              .filter((i) => isPacked(i, state) === packed)
              .map((i) => (
                <li key={i.id}>
                  {packed ? "✓" : "☐"} {i.name} —{" "}
                  {quantityLabel(i, itemQuantity(i, state))} · Owned:{" "}
                  {ownedQuantity(i, state)} · Packed/stored:{" "}
                  {state.completed[i.id] ?? 0} · Still needed:{" "}
                  {missingQuantity(i, state)} · {storageOf(i)}
                  {state.locations[i.id]
                    ? ` · Location: ${state.locations[i.id]}`
                    : ""}
                </li>
              ))}
          </ul>
          {s.items.every((i) => isPacked(i, state) !== packed) && <p>None.</p>}
        </div>
      ))}
      <h2>Get prepared</h2>
      <p>{preparationSubtitle}</p>
      <p>Readiness: {preparationProgress(state).done} of {preparationProgress(state).total} applicable tasks and supplies complete. Not-applicable tasks are excluded.</p>
      <p>
        General location: {state.location || "Not set"} · Selected concerns:{" "}
        {state.concerns.join(", ") || "General preparation"}
      </p>
      {preparationGroups.map((group) => {
        const actions = activeHomeActions(state).filter((a) => a.group === group);
        return actions.length > 0 && <div key={group}>
          <h3>{group}</h3>
          <ul>{actions.map((a) => <li key={a.id}>
            {state.notApplicable.includes(a.id) ? "Not applicable —" : state.completed[a.id] ? "✓" : "☐"} {a.name}
          </li>)}</ul>
        </div>;
      })}
      <h2>Personal essentials — review what applies</h2>
      <ul>
        {personalEssentials.map((i) => (
          <li key={i.id}>
            {state.completed[i.id] ? "✓" : "☐"} {i.name}
          </li>
        ))}
      </ul>
      <PrintedPlanning state={state} />
      <h2>Planning notes</h2>
      <p>
        Pet water: plan each animal’s normal daily needs in addition to the
        household total. A single emergency radio with NOAA tone alerts may
        cover both radio entries.
      </p>
      <p>
        For utility tools, follow local utility and emergency guidance. Obtain
        local evacuation maps from your city or county. Keep food suitable for
        dietary needs and arrange prescription supplies with your pharmacy or
        clinician.
      </p>
      <p>
        This checklist can help you prepare basic emergency supplies. It does
        not guarantee safety. Follow guidance from local emergency officials.
        Ready.gov: ready.gov/kit · ready.gov/water · ready.gov/food ·
        ready.gov/shelter · ready.gov/safety-skills
      </p>
    </section>
  );
}
