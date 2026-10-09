"use client";
import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Backpack,
  Check,
  House,
  Printer,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { completionSnapshot, supplyStatus, restoreCompletion } from "@/lib/gobag/checklist";
import { useKit } from "@/lib/gobag/use-kit";
import {
  getSummary,
  isPacked,
  itemQuantity,
  quantityLabel,
  type KitState,
} from "@/lib/gobag/kit";
import {
  activeHomeActions,
  setPreparationApplicable,
} from "@/lib/gobag/preparation";
import { concerns, preparationGroups } from "@/data/gobag-preparation";
import { priorityOf, storageOf } from "@/data/gobag-guidance";
import { personalEssentials } from "@/data/emergency-items";
import { AffiliateDisclosure, AmazonButton, Stepper } from "./kit-parts";
import {
  KitContext,
  ItemPlanning,
  HouseholdNeeds,
  HouseholdPlan,
  ReviewReminders,
  GuidanceReview,
} from "./planning";
import {
  KitWorkspace,
  CustomSupplies,
  SpendingAndSharing,
  MaintenanceWalkthrough,
} from "./workspace";
import { OfflineSupport } from "./offline-support";
import { PrintableSummary } from "./printable-summary";
import styles from "./gobag.module.css";
import s from "./guide.module.css";

type Page = "Checklist" | "Household plan" | "Settings";
const pages: Page[] = ["Checklist", "Household plan", "Settings"];
const tools = [
  "Household",
  "Kits & backups",
  "Custom supplies",
  "Budget & sharing",
  "Review & reminders",
  "Offline & sources",
] as const;
function OfficialResources() {
  return (
    <details className={s.resources}>
      <summary>
        Official conditions, alerts & El Niño guidance{" "}
        <ArrowUpRight size={16} />
      </summary>
      <p>
        El Niño can influence seasonal weather patterns. Impacts vary by
        location and season; flooding is not expected everywhere. “Super El
        Niño” is an informal term, not an official local warning category or a
        forecast from Prepare for Super El Nino.
      </p>
      <p>
        Seasonal outlooks describe chances over months. Local weather warnings
        tell you about specific hazards and when to act. Prepare for Super El Nino does not
        display live forecasts or alerts.
      </p>
      <div className={s.resourceLinks}>
        <a
          href="https://www.weather.gov/"
          target="_blank"
          rel="noopener noreferrer"
        >
          U.S. local forecasts & warnings ↗
        </a>
        <a
          href="https://www.ready.gov/alerts"
          target="_blank"
          rel="noopener noreferrer"
        >
          Find emergency alerts ↗
        </a>
        <a
          href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/"
          target="_blank"
          rel="noopener noreferrer"
        >
          NOAA seasonal ENSO outlook ↗
        </a>
        <a
          href="https://www.noaa.gov/understanding-el-nino"
          target="_blank"
          rel="noopener noreferrer"
        >
          Understand El Niño ↗
        </a>
      </div>
      <p className={s.note}>
        Links to official services, not live data. Outside the U.S., use your
        national weather service and local emergency authority. General climate
        and new preparation guidance checked October 5, 2026 against NOAA, NWS,
        and CDC. Ready.gov links are additional references. Follow current local
        instructions.
      </p>
    </details>
  );
}
function HouseholdEditor({ kit }: { kit: ReturnType<typeof useKit> }) {
  const { state, update } = kit;
  return (
      <div className={s.setupGrid}>
        <div>
          <span>People</span>
          <Stepper
            label="household size"
            value={state.people}
            max={50}
            onChange={(people) => update({ people })}
          />
        </div>
        <label className={s.field}>
          Prepare for
          <select
            value={state.days}
            onChange={(e) =>
              update({ days: Number(e.target.value) as KitState["days"] })
            }
          >
            {[3, 7, 14].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
        <div>
          <label className={s.checkLabel}>
            <input
              type="checkbox"
              checked={state.pets}
              onChange={(e) => update({ pets: e.target.checked })}
            />
            Include pets
          </label>
          {state.pets && (
            <Stepper
              label="number of pets"
              value={state.petCount}
              max={20}
              onChange={(petCount) => update({ petCount })}
            />
          )}
        </div>
      </div>
  );
}

export default function GetReady() {
  const kit = useKit();
  const { state, update } = kit;
  const [page, setPage] = useState<Page>("Checklist");
  const [showAll, setShowAll] = useState(false);
  const [editHousehold, setEditHousehold] = useState(false);
  const [tool, setTool] = useState<(typeof tools)[number]>("Household");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [undo, setUndo] = useState<{
    id: string;
    name: string;
    completed: number | undefined;
    owned: number | undefined;
    kitId: string;
    fromNext: boolean;
  } | null>(null);
  const heading = useRef<HTMLElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const detailFromNext = useRef(false);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const summary = getSummary(state);
  const essentials = summary.items.filter((item) => priorityOf(item) === "Start here");
  const actions = activeHomeActions(state);
  const firstIds = ["home-alerts", "home-alarms", "home-gutters", "car-pressure", "home-contacts"];
  const firstActions = firstIds.flatMap((id) => actions.filter((action) => action.id === id));
  const otherActions = actions.filter((action) => !firstIds.includes(action.id));
  const applicableActions = actions.filter((action) => !state.notApplicable.includes(action.id));
  const progress = {
    done: applicableActions.filter((action) => state.completed[action.id]).length + summary.items.filter((item) => isPacked(item, state)).length,
    total: applicableActions.length + summary.items.length,
  };
  const next = firstActions.find((action) => !state.completed[action.id] && !state.notApplicable.includes(action.id))
    ?? essentials.find((item) => !isPacked(item, state))
    ?? otherActions.find((action) => !state.completed[action.id] && !state.notApplicable.includes(action.id))
    ?? summary.items.find((item) => !isPacked(item, state));
  const selectedItem = summary.items.find((i) => i.id === detail);
  const selectedAction = actions.find((a) => a.id === detail);
  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    setUndo(null);
    setDetail(null);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  };
  const remember = (id: string, name: string, fromNext = false) => {
    setUndo({
      ...completionSnapshot(state, id),
      name,
      kitId: kit.library.activeId,
      fromNext,
    });
    if (!state.setupComplete) update({ setupComplete: true });
    // Keep keyboard focus available when an update removes its trigger.
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) undoButton.current?.focus();
    });
  };
  const openDetail = (id: string, fromNext = false) => {
    detailFromNext.current = fromNext;
    detailTrigger.current = document.activeElement as HTMLElement;
    setDetail(id);
  };
  const visibleItems = summary.items
    .filter((item) => (showAll || priorityOf(item) === "Start here") && item.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(priorityOf(b) === "Start here") - Number(priorityOf(a) === "Start here"));
  const toggleItem = (
    item: NonNullable<typeof selectedItem>,
    fromNext = false,
  ) => {
    remember(item.id, item.name, fromNext);
    kit.toggle(item);
  };
  const ownFullQuantity = (item: NonNullable<typeof selectedItem>) => {
    remember(item.id, item.name);
    kit.setQuantity(item, "owned", itemQuantity(item, state));
  };
  const undoAtTop =
    undo &&
    (undo.fromNext ||
      !(page === "Checklist" ? [...visibleItems, ...actions] : []).some((i) => i.id === undo.id));
  const performUndo = () => {
    if (!undo) return;
    update(restoreCompletion(state, undo));
    setUndo(null);
    requestAnimationFrame(() => {
      const row = Array.from(
        heading.current?.querySelectorAll<HTMLButtonElement>(
          "[data-completion-id]",
        ) ?? [],
      ).find((button) => button.dataset.completionId === undo.id);
      (row ?? heading.current)?.focus({ preventScroll: true });
    });
  };
  const undoNotice = (id?: string, inDialog = false) => {
    if (!undo || (id ? (!inDialog && undoAtTop) || undo.id !== id : !undoAtTop)) return null;
    return (
      undo &&
      undo.kitId === kit.library.activeId && (
        <div className={s.undo} role="status">
          <span>Updated: {undo.name}</span>
          <button
            ref={undoButton}
            onClick={performUndo}
          >
            Undo
          </button>
          <button aria-label="Dismiss update" onClick={() => setUndo(null)}>
            ×
          </button>
        </div>
      )
    );
  };
  const actionRows = (items: typeof actions) => items.map((action) => {
    const excluded = state.notApplicable.includes(action.id);
    const done = !!state.completed[action.id] && !excluded;
    return <div key={action.id}>
      <div className={s.row}>
        <button className={s.rowDetail} onClick={() => openDetail(action.id)} aria-label={`Details: ${action.name}`}>
          <span>{action.name}<small>{excluded ? "Not applicable" : action.group}</small><small className={s.detailsLink}>Details</small></span>
        </button>
        <button className={s.rowAction} disabled={excluded} data-completion-id={action.id}
          aria-label={`${excluded ? "Not applicable" : done ? "Mark to do" : "Mark done"}: ${action.name}`}
          aria-pressed={done} onClick={() => { remember(action.id, action.name); kit.togglePersonal(action.id); }}>
          {excluded ? "Not applicable" : done ? <><Check size={16} aria-hidden="true" />Done</> : "Mark done"}
        </button>
      </div>
      {undoNotice(action.id)}
    </div>;
  });
  return (
    <KitContext.Provider value={kit}>
      <div className={`${styles.app} ${s.guide}`}>
        <a className={styles.skipLink} href="#guide-main">
          Skip to content
        </a>
        <div className={s.screen}>
          <header className={s.header}>
            <span className={s.brand}>Prepare</span>
            <span className={s.saved} role="status">
              {kit.storageMessage}
            </span>
          </header>
          <nav className={s.nav} aria-label="Main navigation">
            {pages.map((p) => (
              <button key={p} aria-current={page === p ? "page" : undefined} onClick={() => navigate(p)}>{p}</button>
            ))}
          </nav>
          <main id="guide-main" ref={heading} tabIndex={-1} className={s.main}>
            <fieldset
              className={s.appFields}
              disabled={!kit.loaded}
              aria-busy={!kit.loaded}
            >
              {page === "Checklist" && (
                <>
                  <h1>Your checklist</h1>
                  <div id="preparation-checklist" className={s.checklistMeta}>
                    <div>
                      <strong>{kit.activeName}</strong>
                      <span>
                        {state.people}{" "}
                        {state.people === 1 ? "person" : "people"} ·{" "}
                        {state.days} days
                        {state.pets
                          ? ` · ${state.petCount} ${state.petCount === 1 ? "pet" : "pets"}`
                          : ""}
                      </span>
                    </div>
                    <button
                      className={s.textButton}
                      aria-expanded={editHousehold}
                      aria-controls="household-editor"
                      onClick={() => {
                        setEditHousehold(!editHousehold);
                      }}
                    >
                      Edit household
                    </button>
                  </div>
                  {editHousehold && <div id="household-editor"><HouseholdEditor kit={kit} /></div>}
                  <div className={s.progressLine}>
                    <span>
                      {progress.done} of {progress.total} checklist steps complete
                    </span>
                    <progress
                      aria-label="Tasks done and supplies packed or stored"
                      max={progress.total || 1}
                      value={progress.done}
                    />
                  </div>
                  <div className={s.nextAction}>
                    <div>
                      <span className={s.kicker}>
                        NEXT STEP
                      </span>
                      <strong>
                        {next?.name ??
                          "Review your plan and supplies regularly."}
                      </strong>
                    </div>
                    <button
                      className={s.primary}
                      onClick={() =>
                        next
                          ? openDetail(next.id, true)
                          : navigate("Household plan")
                      }
                    >
                      {next ? "View item" : "Review plan"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  {undoNotice()}
                  <section className={s.checkGroup} aria-labelledby="start-here-heading">
                    <h2 id="start-here-heading">Start here</h2>
                    <p className={s.note}>Alerts, home safety, and a ready car. Follow local warnings first.</p>
                    {actionRows(firstActions)}
                  </section>
                  <div className={s.listHeading}>
                    <h2>{showAll ? "All supplies" : "Essential supplies"}</h2>
                    <button className={s.textButton} aria-expanded={showAll} onClick={() => { setShowAll(!showAll); setSearch(""); }}>
                      {showAll ? "Show essentials" : "Show all supplies"}
                    </button>
                  </div>
                  <p className={s.note}>Essentials are a starting point, not complete preparedness. Include your medical and access needs.</p>
                  {showAll && <label className={s.search}><Search size={17} /><input aria-label="Search supplies" placeholder="Find a supply" value={search} onChange={(e) => setSearch(e.target.value)} /></label>}
                  {!visibleItems.length && <p>No matching supplies. <button className={s.textButton} onClick={() => setSearch("")}>Clear search</button></p>}
                  {(["Home reserves", "Carry essentials"] as const).map(
                    (storage) => {
                      const items = visibleItems.filter(
                        (i) => storageOf(i) === storage,
                      );
                      const packed = storage === "Carry essentials";
                      return (
                        items.length > 0 && (
                          <section id={packed ? "supplies-heading" : undefined} key={storage} className={s.checkGroup}>
                            <div className={s.groupHeading}>
                              {packed ? (
                                <Backpack size={22} />
                              ) : (
                                <House size={22} />
                              )}
                              <div>
                                <h2>
                                  {packed
                                    ? "Go-bag supplies"
                                    : "Home supplies"}
                                </h2>
                                <p>
                                  {packed
                                    ? "Pack what you can carry. Try your loaded bag."
                                    : "Store reserves within reach. Plan a portion to take if you leave."}
                                </p>
                              </div>
                            </div>
                            {items.map((item) => {
                              const status = supplyStatus(item, state);
                              const complete = packed ? "Packed" : "Stored";
                              return (
                                <div key={item.id}>
                                  <div className={`${s.row} ${s.supplyRow}`} data-item-id={item.id}>
                                    <button
                                      className={s.rowDetail}
                                      onClick={() => openDetail(item.id)}
                                      aria-label={`Details: ${item.name}`}
                                    >
                                      <span>
                                        {item.name}
                                        <small>
                                          {quantityLabel(
                                            item,
                                            itemQuantity(item, state),
                                          )} required
                                        </small>
                                        <small className={s.detailsLink}>Details</small>
                                      </span>
                                    </button>
                                    <button
                                      className={s.rowAction}
                                      data-completion-id={item.id}
                                      aria-label={`${status === "complete" ? (packed ? "Unpack" : "Remove from storage") : (packed ? "Mark packed" : "Mark stored")}: ${item.name}`}
                                      aria-pressed={status === "complete"}
                                      onClick={() => toggleItem(item)}
                                    >
                                      {status === "complete" && <Check size={16} aria-hidden="true" />}
                                      {status === "complete" ? complete : packed ? "Mark packed" : "Mark stored"}
                                    </button>
                                  </div>
                                  {undoNotice(item.id)}
                                </div>
                              );
                            })}
                          </section>
                        )
                      );
                    },
                  )}
                  <p className={s.note}>Mark packed or stored only when the full quantity is in place; this also records it as owned. Use Details for partial amounts.</p>
                  <section className={s.checkGroup} aria-labelledby="more-preparation-heading">
                    <h2 id="more-preparation-heading">More preparation</h2>
                    {preparationGroups.map((group) => {
                      const items = otherActions.filter((action) => action.group === group);
                      return items.length > 0 && <div key={group}><h3 className={s.categoryHeading}>{group}</h3>{actionRows(items)}</div>;
                    })}
                  </section>
                  <p className={s.note}>Quantities are starting estimates. Follow local instructions. Never walk or drive through floodwater.</p>
                  <details className={s.secondaryDetails}>
                    <summary>Weather context & sources · Oct 9, 2026</summary>
                    <p>El Niño can affect seasonal weather; local risks vary. This checklist does not show live alerts. Check official local warnings.</p>
                    <OfficialResources />
                  </details>
                </>
              )}
              {page === "Household plan" && (
                <>
                  <div className={s.pageTitle}>
                    <h1>Household plan</h1>
                    <p>Who to call, where to meet, and how to leave safely.</p>
                  </div>
                  <HouseholdPlan />

                </>
              )}
              {page === "Settings" && (
                <>
                  <div className={s.pageTitle}>
                    <h1>Settings</h1>
                  </div>
                  <div className={s.toolsLayout}>
                    <nav className={s.toolNav} aria-label="Settings sections">
                      {tools.map((t) => (
                        <button
                          key={t}
                          aria-current={tool === t ? "page" : undefined}
                          onClick={() => {
                            setTool(t);
                            setUndo(null);
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </nav>
                    <div className={s.toolContent}>
                      {tool === "Household" && (
                        <>
                          <HouseholdEditor kit={kit} />
                          <label className={s.field}>
                            General location
                            <input
                              maxLength={120}
                              placeholder="City or region (optional)"
                              value={state.location}
                              onChange={(e) =>
                                update({ location: e.target.value })
                              }
                            />
                            <small>
                              A label for your plan. We don’t infer local risks.
                            </small>
                          </label>
                          <fieldset className={s.choices}>
                            <legend>What would you like to prepare for?</legend>
                            <p>
                              Optional concerns add relevant home tasks. These
                              are not predictions.
                            </p>
                            <div>
                              {concerns.map((c) => (
                                <label key={c}>
                                  <input
                                    type="checkbox"
                                    checked={state.concerns.includes(c)}
                                    onChange={(e) =>
                                      update({
                                        concerns: e.target.checked
                                          ? [...state.concerns, c]
                                          : state.concerns.filter(
                                              (v) => v !== c,
                                            ),
                                      })
                                    }
                                  />
                                  {c}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          <HouseholdNeeds />
                  <section className={s.checkGroup}>
                    <h2>Personal essentials</h2>
                    <p className={s.note}>
                      Optional reminders, separate from checklist progress.
                    </p>
                    <div className={s.needChoices}>
                      {personalEssentials.map((i) => (
                        <label key={i.id}>
                          <input
                            type="checkbox"
                            checked={!!state.completed[i.id]}
                            onChange={() => kit.togglePersonal(i.id)}
                          />
                          {i.name}
                        </label>
                      ))}
                    </div>
                  </section>

                        </>
                      )}
                      {tool === "Kits & backups" && <KitWorkspace />}
                      {tool === "Custom supplies" && <CustomSupplies />}
                      {tool === "Budget & sharing" && <SpendingAndSharing />}
                      {tool === "Review & reminders" && (
                        <>
                          <ReviewReminders />
                          <MaintenanceWalkthrough />
                        </>
                      )}
                      {tool === "Offline & sources" && (
                        <>
                          <OfflineSupport />
                          <button
                            className={s.outline}
                            onClick={() => window.print()}
                          >
                            <Printer size={17} />
                            Print / save PDF
                          </button>
                          <OfficialResources />
                          <GuidanceReview />
                          <a
                            className={s.textButton}
                            href="https://ko-fi.com/chrisluong"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Support Prepare for Super El Nino ↗
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </fieldset>
          </main>
          <footer className={s.footer}>
            <span>Free to use. No account needed.</span>
            <button
              onClick={() => {
                setTool("Offline & sources");
                navigate("Settings");
              }}
            >
              Offline access & sources
            </button>
            <button onClick={() => window.print()}>
              <Printer size={15} />
              Print / save
            </button>
          </footer>
        </div>
        <Dialog
          open={!!detail}
          onOpenChange={(open) => {
            if (!open) setDetail(null);
          }}
        >
          <DialogContent
            className={`${styles.app} ${s.guide} ${s.detailDialog}`}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (detailTrigger.current?.isConnected)
                detailTrigger.current.focus();
              else heading.current?.focus();
            }}
          >
            <span className={s.kicker}>
              {selectedItem
                ? storageOf(selectedItem) === "Carry essentials"
                  ? "PACK YOUR GO-BAG"
                  : "STOCK HOME SUPPLIES"
                : `GET PREPARED · ${selectedAction?.group ?? ""}`}
            </span>
            <DialogTitle>
              {selectedItem?.name ?? selectedAction?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.why ?? selectedAction?.why}
            </DialogDescription>
            {selectedItem && (
              <>
                <p>{selectedItem.description}</p>
                <p className={s.detailNote}>
                  Owned means you have it.{" "}
                  {storageOf(selectedItem) === "Carry essentials"
                    ? "Packed means it’s in your go-bag."
                    : "Stored means it’s put away where you can reach it."}{" "}
                  Marking the full quantity packed or stored also records that
                  you own it. Removing it from your bag or storage keeps your
                  owned count.
                </p>
                <ItemPlanning item={selectedItem} onQuantityChange={() => remember(selectedItem.id, selectedItem.name)} />
                {selectedItem.readyGovUrl && (
                  <a
                    className={s.textButton}
                    href={selectedItem.readyGovUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Official guidance ↗
                  </a>
                )}
                {selectedItem.searchTerm && (
                  <details className={s.secondaryDetails}>
                    <summary>Shopping help (optional)</summary>
                    <AmazonButton item={selectedItem} />
                    <AffiliateDisclosure />
                  </details>
                )}
              </>
            )}
            {selectedAction && (
              <>
                <a
                  className={s.textButton}
                  href={selectedAction.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Official guidance ↗
                </a>
                <p className={s.detailNote}>Supplies: {selectedAction.supplies}</p>
                {selectedAction.concerns.length > 0 && <p className={s.note}>Relevant concerns: {selectedAction.concerns.join(" · ")}</p>}
                <button
                  className={s.outline}
                  aria-pressed={state.notApplicable.includes(selectedAction.id)}
                  onClick={() => {
                    update(setPreparationApplicable(state, selectedAction.id, state.notApplicable.includes(selectedAction.id)));
                    setUndo(null);
                  }}
                >
                  {state.notApplicable.includes(selectedAction.id) ? "Make applicable again" : "Not applicable to me"}
                </button>
                {state.notApplicable.includes(selectedAction.id) && <p className={s.note}>Excluded from readiness totals and next steps. Making it applicable again restores its previous progress.</p>}
                {selectedAction.link === "supplies" && <button className={s.outline} onClick={() => {
                  navigate("Checklist"); setShowAll(true); setSearch("");
                  requestAnimationFrame(() => document.getElementById("supplies-heading")?.scrollIntoView({ block: "start" }));
                }}>Open your supplies</button>}
                {selectedAction.link === "plan" && (
                  <button
                    className={s.outline}
                    onClick={() => navigate("Household plan")}
                  >
                    Open household plan
                  </button>
                )}
              </>
            )}
            {selectedItem && undoNotice(selectedItem.id, true)}
            <div className={s.detailActions}>
              <button
                className={s.primary}
                disabled={!!selectedAction && state.notApplicable.includes(selectedAction.id)}
                onClick={() => {
                  if (selectedItem) {
                    if (supplyStatus(selectedItem, state) === "needs-supplies") ownFullQuantity(selectedItem);
                    else toggleItem(selectedItem, detailFromNext.current);
                  }
                  else if (selectedAction) {
                    remember(
                      selectedAction.id,
                      selectedAction.name,
                      detailFromNext.current,
                    );
                    kit.togglePersonal(selectedAction.id);
                  }
                  setDetail(null);
                }}
              >
                {selectedItem
                  ? supplyStatus(selectedItem, state) === "needs-supplies"
                    ? "I have the full quantity"
                    : isPacked(selectedItem, state)
                    ? "Remove from bag / storage"
                    : storageOf(selectedItem) === "Carry essentials"
                      ? "Mark full quantity packed"
                      : "Mark full quantity stored"
                  : selectedAction && state.notApplicable.includes(selectedAction.id)
                    ? "Not applicable"
                  : selectedAction && state.completed[selectedAction.id]
                    ? "Mark to do"
                    : "Mark done"}
              </button>
              <DialogClose className={s.outline}>Close details</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
        <PrintableSummary state={state} name={kit.activeName} />
      </div>
    </KitContext.Provider>
  );
}
