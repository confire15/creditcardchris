"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  Backpack,
  Check,
  House,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
  ShoppingBasket,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { planChecklist, completionSnapshot, supplyStatus, restoreCompletion } from "@/lib/gobag/checklist";
import { useKit } from "@/lib/gobag/use-kit";
import {
  getSummary,
  isPacked,
  itemQuantity,
  quantityLabel,
} from "@/lib/gobag/kit";
import {
  setPreparationApplicable,
  applicablePersonal,
  nextSteps,
} from "@/lib/gobag/preparation";
import { dueReviews } from "@/lib/gobag/reminders";
import { downloadFile, exportBackup } from "@/lib/gobag/library";
import { plannerURL, readPlannerLocation, settingsSections, type PlannerPage } from "@/lib/gobag/navigation";
import { priorityOf, storageOf } from "@/data/gobag-guidance";
import { personalEssentials } from "@/data/emergency-items";
import { AffiliateDisclosure, AmazonButton } from "./kit-parts";
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
import { EasyStart } from "./easy-start";
import { ShoppingList } from "./shopping-list";
import { SupplyCount } from "./supply-count";
import { PrintableSummary } from "./printable-summary";
import styles from "./gobag.module.css";
import s from "./guide.module.css";

type Page = PlannerPage;
const pages: Page[] = ["Home", "Shopping list", "Settings"];
const tools = settingsSections;
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

export default function GetReady() {
  const kit = useKit();
  const { state, update } = kit;
  const [page, setPage] = useState<Page>("Home");
  const [taskView, setTaskView] = useState("To do");
  const [showPersonalChoices, setShowPersonalChoices] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [sections, setSections] = useState<Record<string, boolean>>({});
  const initializedKit = useRef<string | null>(null);
  const [tool, setTool] = useState<(typeof tools)[number]>("Household");
  const [suppliesVisit, setSuppliesVisit] = useState(0);
  const [search, setSearch] = useState("");
  const [inventory, setInventory] = useState(false);
  const [planEditorOpen, setPlanEditorOpen] = useState(true);
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
  const detailCloseTarget = useRef<string | null>(null);
  const summary = getSummary(state);
  const reviews = dueReviews(state);
  const suggestions = nextSteps(state);
  const personal = applicablePersonal(state);
  const { safety, household, progress, counts, nextId, nextSection } = planChecklist(state);
  const actions = [...safety, ...household];
  useEffect(() => {
    if (!kit.loaded || initializedKit.current === kit.library.activeId) return;
    initializedKit.current = kit.library.activeId;
    const hash = window.location.hash;
    const linkedSection = hash === "#supply-list" || hash === "#supplies-heading" ? "supplies"
      : ["#household-plan", "#plan-editor", "#plan-title"].includes(hash) ? "household" : hash === "#more-preparation" || hash === "#safety-checks" ? "safety" : null;
    setSections(current => ({ ...current, [linkedSection ?? nextSection]: true }));
    if (linkedSection) requestAnimationFrame(() => document.getElementById(["#plan-title", "#plan-editor"].includes(hash) ? "plan-editor" : hash.slice(1))?.scrollIntoView());
  }, [kit.loaded, kit.library.activeId, nextSection]);
  const sectionHeading = (id: string, title: string, count: { done: number; total: number }) =>
    <h2 className={s.sectionTitle}><button id={`${id}-toggle`} type="button" aria-expanded={!!sections[id]} aria-controls={`${id}-content`}
  // Run after React commits the expanded panel, including repeat visits.
  useEffect(() => {
    if (!suppliesVisit) return;
    const target = document.getElementById("supplies-toggle");
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [suppliesVisit]);
  const continueToSupplies = () => {
    setSections(current => ({ ...current, supplies: true }));
    setSuppliesVisit(current => current + 1);
  };
      onClick={() => setSections(current => ({ ...current, [id]: !current[id] }))}>
      <span><span className={s.sectionStep}>Step {id === "safety" ? 1 : id === "supplies" ? 2 : 3}</span>{title}</span><small>{count.done} / {count.total} done</small>
      {sections[id] ? <ChevronUp size={22} aria-hidden="true" /> : <ChevronDown size={22} aria-hidden="true" />}
    </button></h2>;
  const selectedItem = summary.items.find((i) => i.id === detail);
  const selectedAction = actions.find((a) => a.id === detail);
  const focusDestination = (id: string) => requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (id === "guide-main") window.scrollTo({ top: 0, behavior: "instant" });
    else target?.scrollIntoView({ block: "start", behavior: "instant" });
    target?.focus({ preventScroll: true });
  });
  useEffect(() => {
    const sync = () => {
      const route = readPlannerLocation(new URL(window.location.href));
      setDetail(null);
      setUndo(null);
      setPage(route.page);
      setTool(route.tool);
      setPlanEditorOpen(true);
      const hash = window.location.hash;
      const section = route.editor ? "household" : ["#supply-list", "#supplies", "#supplies-heading"].includes(hash) ? "supplies" : ["#safety-checks", "#more-preparation"].includes(hash) ? "safety" : null;
      if (section) setSections(current => ({ ...current, [section]: true }));
      if (hash) focusDestination(route.editor ? "plan-editor" : hash === "#supplies" ? "supply-list" : hash.slice(1));
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); };
  }, []);
  const navigate = (nextPage: Page, nextTool = tool, destination?: string) => {
    const target = destination ?? (nextPage === "Household plan" ? "plan-editor" : "guide-main");
    detailCloseTarget.current = target;
    window.history.pushState(null, "", plannerURL(window.location.href, nextPage, nextTool));
    setPage(nextPage === "Household plan" ? "Home" : nextPage);
    setTool(nextTool);
    if (nextPage === "Household plan") {
      setPlanEditorOpen(true);
      setSections(current => ({ ...current, household: true }));
    }
    setUndo(null);
    setDetail(null);
    focusDestination(target);
  };
  const openSupplies = (checkInventory = false) => {
    navigate("Home", tool, "supply-list");
    detailCloseTarget.current = "supply-list";
    setSections(current => ({ ...current, supplies: true }));
    setInventory(checkInventory);
    setShowAll(true);
    setSearch("");
    requestAnimationFrame(() => {
      const list = document.getElementById("supply-list");
      list?.scrollIntoView({ block: "start", behavior: "instant" });
      list?.focus({ preventScroll: true });
    });
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
    detailCloseTarget.current = null;
    detailFromNext.current = fromNext;
    detailTrigger.current = document.activeElement as HTMLElement;
    setDetail(id);
  };
  const visibleItems = summary.items
    .filter((item) => (showAll || priorityOf(item) === "Start here") && (taskView !== "To do" || !isPacked(item, state)) && (taskView !== "Done" || isPacked(item, state)) && taskView !== "Not applicable" && item.name.toLowerCase().includes(search.trim().toLowerCase()))
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
    (undo.fromNext || (taskView === "To do" && !!state.completed[undo.id]) ||
      !(page === "Home" ? [...visibleItems, ...actions] : []).some((i) => i.id === undo.id));
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
  const actionRows = (items: typeof actions) => {
    const matching = items.filter(action => taskView === "All" || (taskView === "To do" ? !state.completed[action.id] && !state.notApplicable.includes(action.id) : taskView === "Done" ? !!state.completed[action.id] && !state.notApplicable.includes(action.id) : state.notApplicable.includes(action.id)));
    if (!matching.length) return <p className={s.note}>No tasks in this section for “{taskView}”. <button className={s.textButton} onClick={() => setTaskView("All")}>Show all tasks</button></p>;
    return matching.map((action) => {
    const excluded = state.notApplicable.includes(action.id);
    const done = !!state.completed[action.id] && !excluded;
    return <div key={action.id} data-done={done || undefined} className={s.safetyTask} data-next={nextId === action.id || undefined}>
      <div className={s.row}>
        <div className={s.taskTitle}>{nextId === action.id && <span className={s.nextLabel}>Next up</span>}<h3>{action.name}</h3></div>
        <button className={s.rowAction} disabled={excluded} data-completion-id={action.id}
          aria-label={`${excluded ? "Not applicable" : done ? "Mark to do" : "Mark done"}: ${action.name}`}
          aria-pressed={done} onClick={() => { remember(action.id, action.name); kit.togglePersonal(action.id); }}>
          {excluded ? "Not applicable" : done ? <><Check size={16} aria-hidden="true" />Done</> : "Mark done"}
        </button>
      </div>
      <p className={s.taskDescription}>{action.why}</p>
      <details className={s.taskInstructions}>
        <summary>{action.id === "home-alerts" ? "Find alert services & phone settings" : `Guidance & supplies for this task`}</summary>
        <p>Supplies: {action.supplies}</p>
        <a className={s.textButton} href={action.source} target="_blank" rel="noopener noreferrer">Official guidance ↗</a>
        {action.concerns.length > 0 && <p className={s.note}>Relevant concerns: {action.concerns.join(" · ")}</p>}
        {action.id === "home-alerts" && <div className={s.safetyNotice}>
          <strong>Check local warnings</strong><p>This app does not show live alerts. Follow local instructions. Never walk or drive through floodwater.</p>
          <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">U.S. weather warnings ↗</a>
          <a href="https://www.ready.gov/alerts" target="_blank" rel="noopener noreferrer">Find emergency alerts ↗</a>
          <p>Outside the U.S., check your national weather service and local emergency authority.</p>
        </div>}
        {action.link === "supplies" && <button className={s.textButton} onClick={() => openSupplies()}>Review Supplies</button>}
        {action.link === "plan" && <button className={s.textButton} onClick={() => navigate("Household plan")}>Edit contacts & meeting places</button>}
        <button className={s.textButton} aria-pressed={excluded} onClick={() => { update(setPreparationApplicable(state, action.id, excluded)); setUndo(null); }}>
          {excluded ? "Add back to checklist" : "This task does not apply"}</button>
        {excluded && <p className={s.note}>Excluded from progress. Adding it back restores its previous completion.</p>}
      </details>
      {undoNotice(action.id)}
    </div>;
    });
  };
  return (
    <KitContext.Provider value={kit}>
      <div className={`${styles.app} ${s.guide}`}>
        <a className={styles.skipLink} href="#guide-main">
          Skip to content
        </a>
        <div className={s.screen}>
          <header className={s.header}>
            <span className={s.brand}>
              <Image src="/gobag/icon.svg" alt="" width={36} height={36} aria-hidden="true" />
              <span>Prepare<small className={s.brandSubtitle}>For Super El Niño</small></span>
            </span>
            <span className={s.saved} role="status">
              {kit.storageMessage}
            </span>
          </header>
          <nav className={s.nav} aria-label="Main navigation">
            {pages.map((p) => (
              <button key={p} aria-current={page === p ? "page" : undefined} onClick={() => navigate(p)}>
                {p === "Home" ? <House size={18} aria-hidden="true" /> : p === "Shopping list" ? <ShoppingBasket size={18} aria-hidden="true" /> : <Settings size={18} aria-hidden="true" />}
                {p === "Home" ? "My plan" : p === "Shopping list" ? "Shopping" : p}
              </button>
            ))}
          </nav>
          <main id="guide-main" ref={heading} tabIndex={-1} className={s.main}>
            <fieldset
              className={s.appFields}
              disabled={!kit.loaded}
              aria-busy={!kit.loaded}
            >
              {page === "Home" && (
                <>
                  <div className={s.homeIntro}>
                    <h1>Your emergency plan</h1>
                    <p className={s.intro}>Plan together, track supplies, and save offline. <strong>Free, no account needed.</strong></p>
                    <p className={s.planningNote}>A planning tool, not live weather alerts. <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">Official alerts ↗</a></p>
                  </div>
                  {kit.firstUse && !state.setupComplete && <EasyStart kit={kit} onDone={() => focusDestination("preparation-checklist")} />}
                  <section id="preparation-checklist" tabIndex={-1} className={s.kitSummary} aria-label="Kit summary">
                  <div className={s.checklistMeta}>
                    <div><strong>{kit.activeName}</strong><span>{state.people} {state.people === 1 ? "person" : "people"} · {state.days} days{state.pets ? ` · ${state.petCount} ${state.petCount === 1 ? "pet" : "pets"}` : ""}</span></div>
                    <button className={s.textButton} aria-label="Edit household" onClick={() => { navigate("Settings", "Household"); }}>Edit</button>
                  </div>
                  <div className={s.progressLine}><span>Checklist completion <strong>{progress.done} of {progress.total} done</strong></span>
                    <progress aria-label="Checklist completion" max={progress.total || 1} value={progress.done} /></div>
                  <p className={s.readinessNote}>Completed checklist items do not guarantee readiness. Review your household’s changing needs.</p>
                  <nav className={s.planShortcuts} aria-label="Plan sections">{[["safety", "Safety", "safety-checks"], ["supplies", "Supplies", "supply-list"], ["household", "Household plan", "household-plan"]].map(([id, label, target]) => <button key={id} className={s.outline} onClick={() => { setSections(current => ({ ...current, [id]: true })); focusDestination(target); }}>{label}</button>)}</nav>
                  </section>
                  <section className={s.nextActions} aria-label="Suggested next actions"><h2>Useful next actions</h2><ol className={s.actionList}>{suggestions.map((step, index) => <li key={`${step.group}-${step.id}`}><button className={s.nextAction} data-primary={index === 0 || undefined} onClick={() => {
                    if (step.group === "review") navigate("Settings", "Review & reminders");
                    else if (step.group === "household") navigate("Household plan");
                    else if (step.group === "personal") focusDestination("personal-essentials");
                    else openDetail(step.id, true);
                  }}><span className={s.actionCopy}><small>{index === 0 && <span className={s.actionPriority}>Next up · </span>}{step.note}</small><span>{step.name}</span></span><ArrowRight size={18} aria-hidden="true" /></button></li>)}</ol></section>
                  <p><button className={s.textButton} onClick={() => navigate("Settings", "Review & reminders")}>Needs review: {reviews.length} {reviews.length === 1 ? "supply" : "supplies"} →</button></p>
                  <label className={s.field}>Checklist view<select value={taskView} onChange={e => setTaskView(e.target.value)}>{["To do", "All", "Done", "Not applicable"].map(v => <option key={v}>{v}</option>)}</select></label>
                  {undoNotice()}
                  <section id="safety-checks" tabIndex={-1} className={s.planSection}>
                    {sectionHeading("safety", "Safety", counts.safety)}
                    <div id="safety-content" hidden={!sections.safety}>{sections.safety && <div id="more-preparation">{actionRows(safety)}</div>}</div>
                  </section>
                  <section id="supply-list" tabIndex={-1} className={s.planSection}>
                    {sectionHeading("supplies", "Supplies", counts.supplies)}
                    <div id="supplies-content" hidden={!sections.supplies}>{sections.supplies && <>
                  <div className={s.listHeading}><p className={s.note}>Check what you have, then pack or store it.</p>
                    <button className={s.textButton} aria-pressed={!showAll} onClick={() => { setShowAll(!showAll); setSearch(""); }}>{showAll ? "Show essentials only" : "Show all supplies"}</button>
                  </div>
                  <div className={s.suppliesTransition}>
                    <div>
                      <h2>Next: Review your supplies</h2>
                      <p>Check what you have, then pack or store what you need. You can return to unfinished tasks anytime.</p>
                    </div>
                    <button type="button" className={s.primary} onClick={continueToSupplies} aria-controls="supplies-content">Continue to supplies →</button>
                  </div>
                  {inventory && <section className={s.startOwned}>
                    <h3>Look around before you buy</h3>
                    <p>Check your kitchen, bathroom, and bags. Enter how much you already have below. Only mark items stored or packed when they are in place.</p>
                    <button className={s.textButton} onClick={() => setInventory(false)}>Finish checking what I own</button>
                  </section>}
                  {showAll && <label className={s.search}><Search size={17} /><input aria-label="Search supplies" placeholder="Find a supply" value={search} onChange={(e) => setSearch(e.target.value)} /></label>}
                  {!visibleItems.length && <p role="status">No matching supplies. <button className={s.textButton} onClick={() => { setSearch(""); setTaskView("All"); setShowAll(true); }}>Show all supplies</button></p>}
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
                                <h3>
                                  {packed
                                    ? "Things to take if you leave"
                                    : "Supplies to keep at home"}
                                </h3>
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
                                <div key={item.id} className={s.supplyCard} data-next={nextId === item.id || undefined}>
                                  {nextId === item.id && <span className={s.nextLabel}>Next up</span>}
                                  <div className={`${s.row} ${s.supplyRow}`} data-item-id={item.id}>
                                    <div className={s.rowDetail}>
                                      <span>
                                        {item.name}
                                        {reviews.some(r => r.id === item.id) && <small>Needs review · {state.reviewDates[item.id]}</small>}
                                        <small>
                                          {quantityLabel(
                                            item,
                                            itemQuantity(item, state),
                                          )} needed
                                        </small>
                                      </span>
                                    </div>
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
                                  <details className={s.taskInstructions}><summary>How to prepare & store {item.name.toLowerCase()}</summary>
                                    <p>{item.why}</p><p>{item.description}</p>
                                    <ItemPlanning item={item} onQuantityChange={() => remember(item.id, item.name)} />
                                    {item.readyGovUrl && <a className={s.textButton} href={item.readyGovUrl} target="_blank" rel="noopener noreferrer">Official guidance ↗</a>}
                                    {item.searchTerm && <details><summary>Shopping help (optional)</summary><AmazonButton item={item} /><AffiliateDisclosure /></details>}
                                  </details>
                                  <SupplyCount item={item} state={state} onChange={count => { remember(item.id, item.name); kit.setQuantity(item, "owned", count); }} />
                                  {undoNotice(item.id)}
                                </div>
                              );
                            })}
                          </section>
                        )
                      );
                    },
                  )}
                  <p className={s.note}>Quantities are starting estimates.</p>
                    </>}</div>
                  </section>
                  <section id="household-plan" tabIndex={-1} className={s.planSection}>
                    {sectionHeading("household", "Household plan", counts.household)}
                    <div id="household-content" hidden={!sections.household}>{sections.household && <>
                      <details className={s.taskInstructions} open={planEditorOpen} onToggle={e => setPlanEditorOpen(e.currentTarget.open)}><summary id="plan-editor" tabIndex={0}>Edit contacts, meeting places & plan details</summary><HouseholdPlan /></details>
                      <button className={s.textButton} onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print / save my plan</button>
                      {actionRows(household)}
                    </>}</div>
                  </section>

                  <section id="personal-essentials" tabIndex={-1} className={s.planSection}>
                    <div className={s.sectionHeading}><h2>Personal essentials · {counts.personal.done} / {counts.personal.total} done</h2><button className={s.textButton} aria-expanded={showPersonalChoices} onClick={() => setShowPersonalChoices(!showPersonalChoices)}>Edit what applies</button></div>
                    {showPersonalChoices && <><p>Choose what applies to your household. Prepared is recorded separately; removing applicability keeps saved completion.</p><div className={s.needChoices}>{personalEssentials.map(i => <label key={i.id}><input type="checkbox" checked={state.personalApplicable.includes(i.id)} onChange={e => update({ personalApplicable: e.target.checked ? [...state.personalApplicable, i.id] : state.personalApplicable.filter(id => id !== i.id) })} />Applies to my household: {i.name}</label>)}</div><HouseholdNeeds choicesOnly /></>}
                    {!personal.length && <p className={s.note}>Add medications, glasses, infant supplies, accessibility needs, and other essentials using “Edit what applies.”</p>}
                    {personal.filter(i => taskView === "All" || (taskView === "Done" ? !!state.completed[i.id] : taskView === "To do" ? !state.completed[i.id] : false)).map(i => <label className={s.personalRow} key={i.id}><span>{i.name}{reviews.some(r => r.id === i.id) && <small> · Needs review</small>}</span><span><input type="checkbox" aria-label={`Prepared: ${i.name}`} checked={!!state.completed[i.id]} onChange={() => { remember(i.id, i.name); kit.togglePersonal(i.id); }} /> Prepared</span></label>)}
                  </section>
                  <section className={s.emergencyPanel} aria-label="Make this available in an emergency"><h2>Make this available in an emergency</h2><p className={s.note}>Progress saves in this browser. It does not sync across devices. Offline files and a downloadable backup are separate copies.</p><OfflineSupport compact /><div className={s.shortcuts}><button className={s.outline} onClick={() => window.print()}>Print / save PDF</button><button className={s.outline} onClick={() => downloadFile("prepare-backup.json", exportBackup(kit.library), "application/json")}>Download backup</button><button className={s.textButton} onClick={() => navigate("Settings", "Kits & backups")}>Restore backup</button></div><p className={s.note}>Backups contain all kits and plan details in plain text. Store them privately.</p></section>
                  <OfficialResources />
                </>
              )}
              {page === "Shopping list" && <>
                <div className={s.shoppingIntro}><h1>What I still need</h1>
                <p>{state.people} {state.people === 1 ? "person" : "people"} · {state.days} days{state.pets ? ` · ${state.petCount} ${state.petCount === 1 ? "pet" : "pets"}` : ""}. {summary.missing.length} items to get. Quantities update as you add what you have.</p>
                <button className={s.primary} onClick={() => openSupplies(true)}>Check what I have</button></div>
                <details className={s.secondaryDetails}><summary>Set a budget or share my supply list</summary><SpendingAndSharing /></details>
                <ShoppingList key={kit.library.activeId} kit={kit} openDetail={openDetail} />
                <AffiliateDisclosure />
                {undoNotice()}
              </>}
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
                            navigate("Settings", t);
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </nav>
                    <div className={s.toolContent}>
                      {tool === "Household" && (
                        <>
                          <EasyStart kit={kit} onDone={() => navigate("Home")} />
                          <div className={s.householdDetails}>
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
                            <HouseholdNeeds />
                            <button className={s.textButton} onClick={() => { navigate("Home", tool, "personal-essentials"); setShowPersonalChoices(true); }}>Edit personal essentials →</button>
                            <p className={s.note}>Tasks excluded from your checklist can be restored in My plan → Checklist view → Not applicable.</p>
                          </div>

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
                navigate("Settings", "Offline & sources");
              }}
            >
              Offline access & sources
            </button>
            <button onClick={() => window.print()}>
              <Printer size={15} />
              Print / save
            </button>
            <a
              className={s.footerSupport}
              href="https://ko-fi.com/chrisluong"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buy Me a Coffee on Ko-fi (opens in a new tab)"
            >
              Buy Me a Coffee on Ko-fi <ArrowUpRight size={15} aria-hidden="true" />
            </a>
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
              const destination = detailCloseTarget.current
                ? document.getElementById(detailCloseTarget.current)
                : null;
              if (destination) destination.focus({ preventScroll: true });
              else if (detailTrigger.current?.isConnected)
                detailTrigger.current.focus();
              else (document.getElementById("stocked-toggle") ?? heading.current)?.focus({ preventScroll: true });
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
                <SupplyCount item={selectedItem} state={state} onChange={count => { remember(selectedItem.id, selectedItem.name); kit.setQuantity(selectedItem, "owned", count); }} />
                <p className={s.detailNote}>{storageOf(selectedItem) === "Carry essentials" ? "Mark packed when the full quantity is in your bag." : "Mark stored when the full quantity is in an easy-to-reach place."} This also updates what you have.</p>
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
                  {state.notApplicable.includes(selectedAction.id) ? "Add back to checklist" : "Skip this task"}
                </button>
                {state.notApplicable.includes(selectedAction.id) && <p className={s.note}>Excluded from checklist totals and next steps. Making it applicable again restores its previous progress.</p>}
                {selectedAction.link === "supplies" && <button className={s.outline} onClick={() => openSupplies()}>Open Supplies</button>}
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
                    ? "Mark not ready"
                    : storageOf(selectedItem) === "Carry essentials"
                      ? "Mark packed"
                      : "Mark stored"
                  : selectedAction && state.notApplicable.includes(selectedAction.id)
                    ? "Not applicable"
                  : selectedAction && state.completed[selectedAction.id]
                    ? "Mark to do"
                    : "Mark done"}
              </button>
              <DialogClose className={s.outline}>Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
        <PrintableSummary state={state} name={kit.activeName} />
      </div>
    </KitContext.Provider>
  );
}
