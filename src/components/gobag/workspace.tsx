"use client";
import { useState } from "react";
import { FolderOpen, Plus, ClipboardCheck, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { usePlanner } from "./planning";
import {
  downloadFile,
  exportBackup,
  parseBackup,
  maintenanceSteps,
  type KitLibrary,
} from "@/lib/gobag/library";
import { getSummary, totalSpent, type KitState } from "@/lib/gobag/kit";
import { dueReviews, localDate } from "@/lib/gobag/reminders";
import { supplyList } from "@/lib/gobag/sharing";
import styles from "./gobag.module.css";

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );
export function KitWorkspace() {
  const kit = usePlanner();
  const [incoming, setIncoming] = useState<KitLibrary | null>(null);
  const [remove, setRemove] = useState(false);
  const [message, setMessage] = useState("");
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 10000000)
        throw new Error("Choose a backup smaller than 10 MB.");
      setIncoming(parseBackup(await file.text()));
      setMessage("");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not read this backup.",
      );
    }
  };
  const accept = (replace: boolean) => {
    if (!incoming) return;
    kit.importKits(incoming, replace);
    setIncoming(null);
    setMessage("Backup restored.");
  };
  return (
    <section className={styles.planningPanel} aria-labelledby="workspace-title">
      <div className={styles.panelHeading}>
        <FolderOpen size={22} />
        <h2 id="workspace-title">Your kits</h2>
      </div>
      <p>
        Keep home, car, office, and personal kits separate. Quantities and
        purchases belong to the selected kit; the same supplies are not
        automatically shared between kits.
      </p>
      <label className={styles.workspaceLabel}>
        Active kit
        <select
          aria-label="Active kit"
          value={kit.library.activeId}
          onChange={(e) => kit.switchKit(e.target.value)}
        >
          {kit.library.kits.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </label>
      <details className={styles.planningDetails}>
        <summary>Manage kits, backup & restore</summary>
        <form
          className={styles.inlineForm}
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            kit.addKit(String(new FormData(f).get("name") ?? ""));
            f.reset();
          }}
        >
          <label>
            New kit name
            <input
              name="name"
              required
              maxLength={60}
              placeholder="Car, Office, or Alex’s bag"
            />
          </label>
          <button
            className={styles.secondary}
            disabled={kit.library.kits.length >= 20}
          >
            Create kit
          </button>
        </form>
        <form
          key={kit.library.activeId}
          className={styles.inlineForm}
          onSubmit={(e) => {
            e.preventDefault();
            kit.renameKit(
              String(new FormData(e.currentTarget).get("name") ?? ""),
            );
            setMessage("Kit renamed.");
          }}
        >
          <label>
            Rename selected kit
            <input
              name="name"
              required
              maxLength={60}
              defaultValue={kit.activeName}
            />
          </label>
          <button className={styles.secondary}>Rename kit</button>
        </form>
        <div className={styles.offlineActions}>
          <button
            className={styles.secondary}
            onClick={() =>
              downloadFile(
                "gobag-backup.json",
                exportBackup(kit.library),
                "application/json",
              )
            }
          >
            Download backup of all kits
          </button>
          <button
            className={styles.secondary}
            disabled={kit.library.kits.length === 1}
            onClick={() => setRemove(true)}
          >
            Delete selected kit
          </button>
        </div>
        <label className={styles.workspaceLabel}>
          Restore from a GoBag backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <p className={styles.smallNote}>
          Backups include every kit, contact, location, and budget in plain
          text. Store them privately. Up to 20 kits and 100 custom items per
          kit. Restore previews your choices before changing saved kits.
        </p>
      </details>
      <p role="status">{message}</p>
      <Dialog
        open={!!incoming}
        onOpenChange={(open) => {
          if (!open) setIncoming(null);
        }}
      >
        <DialogContent className={styles.workspaceDialog}>
          <DialogTitle>Restore {incoming?.kits.length} kits?</DialogTitle>
          <DialogDescription>
            The backup contains: {incoming?.kits.map((k) => k.name).join(", ")}.
            Add them to keep your current kits, or replace all saved kits.
            Replacement cannot be undone without a backup.
          </DialogDescription>
          <div className={styles.offlineActions}>
            <button
              className={styles.secondary}
              disabled={
                !incoming || kit.library.kits.length + incoming.kits.length > 20
              }
              onClick={() => accept(false)}
            >
              Add as additional kits
            </button>
            <button className={styles.primary} onClick={() => accept(true)}>
              Replace all kits
            </button>
            <DialogClose className={styles.secondary}>Cancel</DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={remove} onOpenChange={setRemove}>
        <DialogContent className={styles.workspaceDialog}>
          <DialogTitle>Delete {kit.activeName}?</DialogTitle>
          <DialogDescription>
            This deletes the selected kit’s supplies, plan, and history from
            this browser. Other kits are kept. Download a backup first if you
            need a copy.
          </DialogDescription>
          <button
            className={styles.primary}
            onClick={() => {
              kit.deleteKit();
              setRemove(false);
            }}
          >
            Delete this kit
          </button>
          <DialogClose className={styles.secondary}>Keep kit</DialogClose>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function CustomSupplies() {
  const { state, update } = usePlanner();
  const [remove, setRemove] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const discard = () => {
    if (!remove) return;
    const omit = <T,>(map: Record<string, T>) =>
      Object.fromEntries(Object.entries(map).filter(([id]) => id !== remove));
    update({
      customItems: state.customItems.filter((i) => i.id !== remove),
      owned: omit(state.owned),
      completed: omit(state.completed),
      reviewDates: omit(state.reviewDates),
      locations: omit(state.locations),
      spending: omit(state.spending),
    });
    setRemove(null);
  };
  return (
    <section className={styles.planningPanel} aria-labelledby="custom-title">
      <div className={styles.panelHeading}>
        <Plus size={22} />
        <h3 id="custom-title">Supplies for your life</h3>
      </div>
      <p>
        Add anything this kit needs. Custom items join its checklist, estimates,
        review dates, and printout.
      </p>
      <form
        className={styles.customForm}
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          const price = String(data.get("price"));
          const name = String(data.get("name")).trim();
          if (!name || state.customItems.length >= 100) return;
          update({
            customItems: [
              ...state.customItems,
              {
                id: `custom-${crypto.randomUUID()}`,
                name,
                category: "Your additions",
                description: "A supply you added for this kit.",
                why: "Review quantities and suitability for your household.",
                quantityType: "fixed",
                baseQuantity: Number(data.get("quantity")),
                unit: String(data.get("unit")).trim() || "item",
                icon: "tools",
                ...(price !== ""
                  ? {
                      estimatedPriceMin: Number(price),
                      estimatedPriceMax: Number(price),
                    }
                  : {}),
              },
            ],
          });
          form.reset();
          setMessage(`${name} added under Your additions.`);
        }}
      >
        <label>
          Item name
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Quantity needed
          <input
            name="quantity"
            type="number"
            min={1}
            max={10000}
            step={1}
            defaultValue={1}
            required
          />
        </label>
        <label>
          Unit
          <input name="unit" maxLength={30} defaultValue="item" required />
        </label>
        <label>
          Estimated price per unit (USD, optional)
          <input name="price" type="number" min={0} max={1000000} step="0.01" />
        </label>
        <button
          className={styles.secondary}
          disabled={state.customItems.length >= 100}
        >
          Add custom item
        </button>
      </form>
      <p role="status">{message}</p>
      {state.customItems.length > 0 && (
        <details className={styles.planningDetails}>
          <summary>Manage custom items ({state.customItems.length})</summary>
          {state.customItems.map((i) => (
            <div className={styles.manageRow} key={i.id}>
              <span>{i.name}</span>
              <button
                className={styles.secondary}
                onClick={() => setRemove(i.id)}
                aria-label={`Remove ${i.name}`}
              >
                Remove
              </button>
            </div>
          ))}
        </details>
      )}
      <Dialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
      >
        <DialogContent className={styles.workspaceDialog}>
          <DialogTitle>Remove this custom item?</DialogTitle>
          <DialogDescription>
            Its quantities, spending entry, location, and review date will also
            be removed from this kit.
          </DialogDescription>
          <button className={styles.primary} onClick={discard}>
            Remove item
          </button>
          <DialogClose className={styles.secondary}>Keep item</DialogClose>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function SpendingAndSharing() {
  const { state, update, activeName, combineRadio } = usePlanner();
  const spent = totalSpent(state);
  const summary = getSummary(state);
  const [includePlan, setIncludePlan] = useState(false);
  const [includeLocations, setIncludeLocations] = useState(false);
  return (
    <section className={styles.planningPanel} aria-labelledby="spending-title">
      <div className={styles.panelHeading}>
        <Share2 size={22} />
        <h3 id="spending-title">Your budget & family supply list</h3>
      </div>
      <label className={styles.workspaceLabel}>
        Kit budget (USD, optional)
        <input
          aria-label="Kit budget (USD, optional)"
          type="number"
          min={0}
          max={1000000}
          step="0.01"
          value={state.budget ?? ""}
          onChange={(e) =>
            update({
              budget:
                e.target.value === ""
                  ? null
                  : Math.max(0, Math.min(1000000, e.target.valueAsNumber || 0)),
            })
          }
        />
      </label>
      <p>
        <strong>Recorded spending: {money(spent)}</strong>
        {state.budget !== null &&
          ` · ${spent > state.budget ? `${money(spent - state.budget)} over budget` : `${money(state.budget - spent)} left in your budget`}`}
      </p>
      <p>
        Recorded spending + estimated missing supplies:{" "}
        {money(spent + summary.min)}–{money(spent + summary.max)}. Enter total
        paid per supply in its storage & spending details. Recording a purchase
        does not change owned quantities.
      </p>
      <label className={styles.workspaceCheck}>
        <input
          type="checkbox"
          checked={state.combinedRadio}
          onChange={(e) => combineRadio(e.target.checked)}
        />
        My emergency radio also receives NOAA tone alerts
      </label>
      <p className={styles.smallNote}>
        This combines both radio requirements into one checklist item and one
        estimate. Confirm the device’s features. Existing radio quantities are
        merged using the larger count, not added. Separating them again leaves
        the NOAA entry empty for you to review. Past spending entries are kept.
      </p>
      {state.combinedRadio && (state.spending["noaa-radio"] ?? 0) > 0 && (
        <label className={styles.workspaceLabel}>
          Previously recorded NOAA radio spending (USD)
          <input
            type="number"
            min={0}
            max={1000000}
            step="0.01"
            value={state.spending["noaa-radio"]}
            onChange={(e) =>
              update({
                spending: {
                  ...state.spending,
                  "noaa-radio": Math.max(
                    0,
                    Math.min(1000000, e.target.valueAsNumber || 0),
                  ),
                },
              })
            }
          />
        </label>
      )}
      <details className={styles.planningDetails}>
        <summary>Download a list to share with family</summary>
        <p>
          The supply list includes this kit’s name, quantities, and packing
          status. Contacts, meeting places, storage locations, and spending are
          excluded unless selected below.
        </p>
        <label className={styles.workspaceCheck}>
          <input
            type="checkbox"
            checked={includePlan}
            onChange={(e) => setIncludePlan(e.target.checked)}
          />
          Include household plan and contacts
        </label>
        <label className={styles.workspaceCheck}>
          <input
            type="checkbox"
            checked={includeLocations}
            onChange={(e) => setIncludeLocations(e.target.checked)}
          />
          Include storage locations
        </label>
        <button
          className={styles.secondary}
          onClick={() =>
            downloadFile(
              "gobag-family-supply-list.txt",
              supplyList(state, activeName, includePlan, includeLocations),
            )
          }
        >
          Download family supply list
        </button>
        <p className={styles.smallNote}>
          Nothing is uploaded or sent. Review the downloaded file before sharing
          it.
        </p>
      </details>
    </section>
  );
}
export function MaintenanceWalkthrough() {
  const { state, update } = usePlanner();
  const checked = state.maintenance.checked;
  const all = maintenanceSteps.every((s) => checked.includes(s.id));
  return (
    <section
      id="maintenance"
      className={styles.planningPanel}
      aria-labelledby="maintenance-title"
    >
      <div className={styles.panelHeading}>
        <ClipboardCheck size={22} />
        <h3 id="maintenance-title">Give your kit a quick check</h3>
      </div>
      <p>
        {checked.length} / {maintenanceSteps.length} maintenance steps checked.{" "}
        {state.maintenance.lastCompleted
          ? `Last completed: ${state.maintenance.lastCompleted}.`
          : "No completed review recorded yet."}
      </p>
      {maintenanceSteps.map((s) => (
        <label className={styles.maintenanceStep} key={s.id}>
          <input
            type="checkbox"
            checked={checked.includes(s.id)}
            onChange={(e) =>
              update({
                maintenance: {
                  ...state.maintenance,
                  checked: e.target.checked
                    ? [...checked, s.id]
                    : checked.filter((id) => id !== s.id),
                },
              })
            }
          />
          <span>
            <strong>{s.label}</strong>
            <small>{s.note}</small>
          </span>
        </label>
      ))}
      <div className={styles.offlineActions}>
        <button
          className={styles.primary}
          disabled={!all}
          onClick={() =>
            update({ maintenance: { checked: [], lastCompleted: localDate() } })
          }
        >
          Finish review
        </button>
        <button
          className={styles.secondary}
          disabled={!checked.length}
          onClick={() =>
            update({ maintenance: { ...state.maintenance, checked: [] } })
          }
        >
          Start steps over
        </button>
      </div>
      <p className={styles.smallNote}>
        Finishing records today’s date. It does not reset expiration dates or
        certify supplies; update individual review dates after checking them.
      </p>
    </section>
  );
}
export function ProgressBreakdown({ state }: { state: KitState }) {
  const summary = getSummary(state);
  const due = dueReviews(state).length;
  const next = due
    ? "Review supplies with a due date"
    : summary.missing.length
      ? "Gather your missing supplies"
      : summary.unpacked.length
        ? "Pack or store the supplies you own"
        : "Review your household plan";
  return (
    <div className={styles.progressBreakdown}>
      <dl>
        <div>
          <dt>Owned</dt>
          <dd>
            {summary.owned} / {summary.items.length}
          </dd>
        </div>
        <div>
          <dt>Packed / stored</dt>
          <dd>
            {summary.packed} / {summary.items.length}
          </dd>
        </div>
        <div>
          <dt>Due for review</dt>
          <dd>{due}</dd>
        </div>
      </dl>
      <a
        href={
          due
            ? "#maintenance"
            : summary.missing.length || summary.unpacked.length
              ? "#supplies"
              : "#plan-title"
        }
      >
        Next: {next} →
      </a>
    </div>
  );
}
