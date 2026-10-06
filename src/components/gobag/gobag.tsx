"use client";
import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Backpack,
  Check,
  ClipboardList,
  House,
  MapPin,
  Printer,
  Search,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { completionSnapshot, supplyStatus, restoreCompletion } from "@/lib/gobag/checklist";
import { getAmazonSearchUrl } from "@/lib/gobag/amazon";
import { useKit } from "@/lib/gobag/use-kit";
import {
  getSummary,
  isPacked,
  itemQuantity,
  ownedQuantity,
  quantityLabel,
  missingQuantity,
  type KitState,
} from "@/lib/gobag/kit";
import {
  activeHomeActions,
  nextSteps,
  preparationProgress,
} from "@/lib/gobag/preparation";
import { concerns } from "@/data/gobag-preparation";
import { priorityOf, storageOf } from "@/data/gobag-guidance";
import { personalEssentials } from "@/data/emergency-items";
import { AffiliateDisclosure, AmazonButton, Logo, Stepper } from "./kit-parts";
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
type Filter = "All" | "To do" | "Done";
const pages: Page[] = ["Checklist", "Household plan", "Settings"];
const groups = ["All tasks", "Home", "Go-bag", "Supplies"] as const;
type Group = (typeof groups)[number];
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
        forecast from GetReady.
      </p>
      <p>
        Seasonal outlooks describe chances over months. Local weather warnings
        tell you about specific hazards and when to act. GetReady does not
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
function Setup({
  kit,
  finish,
  editing = false,
}: {
  kit: ReturnType<typeof useKit>;
  finish: () => void;
  editing?: boolean;
}) {
  const { state, update } = kit;
  return (
    <section className={s.setup} aria-labelledby="setup-heading">
      <div className={s.sectionHeading}>
        <div>
          <span className={s.kicker}>
            {editing ? "YOUR HOUSEHOLD" : "MAKE IT YOURS"}
          </span>
          <h2 id="setup-heading">A checklist that fits your home.</h2>
        </div>
        {!editing && (
          <button className={s.textButton} onClick={finish}>
            Skip setup
          </button>
        )}
      </div>
      <p>Start with these basics. You can change them anytime.</p>
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
      <button className={s.primary} onClick={finish}>
        {editing ? "Back to checklist" : "Use this checklist"}
        <ArrowRight size={17} />
      </button>
    </section>
  );
}

export default function GetReady() {
  const kit = useKit();
  const { state, update } = kit;
  const [page, setPage] = useState<Page>("Checklist");
  const [group, setGroup] = useState<Group>("All tasks");
  const [tool, setTool] = useState<(typeof tools)[number]>("Household");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
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
  const progress = preparationProgress(state);
  const next = nextSteps(state)[0];
  const actions = activeHomeActions(state);
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
  const finish = () => {
    update({ setupComplete: true });
    navigate("Checklist");
  };
  const remember = (id: string, name: string, fromNext = false) => {
    setUndo({
      ...completionSnapshot(state, id),
      name,
      kitId: kit.library.activeId,
      fromNext,
    });
    if (!state.setupComplete) update({ setupComplete: true });
    // A status filter can remove the button that was just activated.
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) undoButton.current?.focus();
    });
  };
  const openDetail = (id: string, fromNext = false) => {
    detailFromNext.current = fromNext;
    detailTrigger.current = document.activeElement as HTMLElement;
    setDetail(id);
  };
  const matches = (name: string, done: boolean) =>
    name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (filter === "All" || (filter === "Done" ? done : !done));
  const visibleActions = actions.filter(
    (a) =>
      (group === "All tasks" || group === "Home") &&
      matches(a.name, !!state.completed[a.id]),
  );
  const visibleItems = summary.items
    .filter(
      (i) =>
        matches(i.name, isPacked(i, state)) &&
        (group === "All tasks" ||
          (group === "Go-bag" && storageOf(i) === "Carry essentials") ||
          (group === "Supplies" && storageOf(i) === "Home reserves")),
    )
    .sort(
      (a, b) =>
        Number(priorityOf(b) === "Start here") -
        Number(priorityOf(a) === "Start here"),
    );
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
      ![...visibleActions, ...visibleItems].some((i) => i.id === undo.id));
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
  return (
    <KitContext.Provider value={kit}>
      <div className={`${styles.app} ${s.guide}`}>
        <a className={styles.skipLink} href="#guide-main">
          Skip to content
        </a>
        <div className={s.screen}>
          <header className={s.header}>
            <Logo />
            <span className={s.saved} role="status">
              {kit.storageMessage}
            </span>
          </header>
          <nav className={s.nav} aria-label="Main navigation">
            {pages.map((p, i) => {
              const Icon = [ClipboardList, MapPin, Settings][i];
              return (
                <button
                  key={p}
                  aria-current={page === p ? "page" : undefined}
                  onClick={() => navigate(p)}
                >
                  <Icon size={18} />
                  {p}
                </button>
              );
            })}
          </nav>
          <main id="guide-main" ref={heading} tabIndex={-1} className={s.main}>
            <fieldset
              className={s.appFields}
              disabled={!kit.loaded}
              aria-busy={!kit.loaded}
            >
              {page === "Checklist" && (
                <>
                  <div className={s.pageTitle}>
                    <span className={s.kicker}>
                      SMALL STEPS. EVERYDAY PEACE OF MIND.
                    </span>
                    <h1>Let’s get prepared.</h1>
                    <p>
                      Prepare your home, pack a go-bag, and stock the
                      essentials.
                    </p>
                  </div>
                  {kit.loaded && !state.setupComplete && (
                    <Setup kit={kit} finish={finish} />
                  )}
                  <div className={s.checklistMeta}>
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
                      onClick={() => {
                        setTool("Household");
                        navigate("Settings");
                      }}
                    >
                      Edit household
                    </button>
                  </div>
                  <div className={s.progressLine}>
                    <span>
                      {progress.done} of {progress.total} tasks complete
                    </span>
                    <progress
                      aria-label="Checklist completion"
                      max={progress.total}
                      value={progress.done}
                    />
                  </div>
                  <div className={s.nextAction}>
                    <div>
                      <span className={s.kicker}>
                        {next ? "A GOOD NEXT STEP" : "KEEP IT UP TO DATE"}
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
                      {next ? "Start" : "Review plan"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  {undoNotice()}
                  <div
                    className={s.groupTabs}
                    role="group"
                    aria-label="Checklist section"
                  >
                    {groups.map((g) => (
                      <button
                        key={g}
                        aria-pressed={group === g}
                        onClick={() => setGroup(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <div className={s.toolbar}>
                    <label className={s.search}>
                      <Search size={17} />
                      <input
                        aria-label="Search checklist"
                        placeholder="Find a task or supply"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <label className={s.statusFilter}>
                      <span className={s.srOnly}>Checklist status</span>
                      <select
                        aria-label="Checklist status"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as Filter)}
                      >
                        {["All", "To do", "Done"].map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {!visibleActions.length && !visibleItems.length && (
                    <div className={s.empty}>
                      <h2>No matching tasks</h2>
                      <button
                        className={s.textButton}
                        onClick={() => {
                          setSearch("");
                          setFilter("All");
                          setGroup("All tasks");
                        }}
                      >
                        Show all tasks
                      </button>
                    </div>
                  )}
                  {visibleActions.length > 0 && (
                    <section className={s.checkGroup}>
                      <div className={s.groupHeading}>
                        <House size={22} />
                        <div>
                          <h2>Prepare your home</h2>
                          <p>A few practical steps you can take today.</p>
                        </div>
                      </div>
                      {visibleActions.map((a) => (
                        <div key={a.id}>
                          <div className={s.row}>
                            <button
                              className={s.rowDetail}
                              onClick={() => openDetail(a.id)}
                              aria-label={`Details: ${a.name}`}
                            >
                              <span>
                                {a.name}
                                <small>
                                  {state.completed[a.id]
                                    ? "Done"
                                    : "No supplies needed"}
                                </small>
                              </span>
                            </button>
                            <button
                              className={s.rowAction}
                              data-completion-id={a.id}
                              aria-label={`${state.completed[a.id] ? "Mark to do" : "Mark done"}: ${a.name}`}
                              aria-pressed={!!state.completed[a.id]}
                              onClick={() => {
                                remember(a.id, a.name);
                                kit.togglePersonal(a.id);
                              }}
                            >
                              {state.completed[a.id] ? (
                                <>
                                  <Check size={16} />
                                  Done
                                </>
                              ) : (
                                "Mark done"
                              )}
                            </button>
                          </div>
                          {undoNotice(a.id)}
                        </div>
                      ))}
                    </section>
                  )}
                  {(["Carry essentials", "Home reserves"] as const).map(
                    (storage) => {
                      const items = visibleItems.filter(
                        (i) => storageOf(i) === storage,
                      );
                      const packed = storage === "Carry essentials";
                      return (
                        items.length > 0 && (
                          <section key={storage} className={s.checkGroup}>
                            <div className={s.groupHeading}>
                              {packed ? (
                                <Backpack size={22} />
                              ) : (
                                <House size={22} />
                              )}
                              <div>
                                <h2>
                                  {packed
                                    ? "Pack your go-bag"
                                    : "Stock home supplies"}
                                </h2>
                                <p>
                                  {packed
                                    ? "Pack what you can carry. Try your loaded bag."
                                    : "Store reserves within reach. Plan a portion to take if you leave."}
                                </p>
                              </div>
                            </div>
                            <p className={s.note}>
                              Buying supplies does not mark them owned or {packed ? "packed" : "stored"}. Use Details to enter partial quantities.
                            </p>
                            {items.some((item) => item.searchTerm && missingQuantity(item, state) > 0) && (
                              <p className={s.shoppingDisclosure}>Amazon links open in a new tab. We may earn from qualifying purchases.</p>
                            )}
                            {items.map((item) => {
                              const status = supplyStatus(item, state);
                              const verb = packed ? "pack" : "store";
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
                                          )}{" "}
                                          · {status === "complete"
                                            ? complete
                                            : status === "ready"
                                              ? `Ready to ${verb}`
                                              : `${quantityLabel(item, missingQuantity(item, state))} still needed`}
                                          {status !== "complete" && ownedQuantity(item, state) > 0 && ` · ${ownedQuantity(item, state)} owned`}
                                          {status !== "complete" && (state.completed[item.id] ?? 0) > 0 && ` · ${state.completed[item.id]} ${packed ? "packed" : "stored"}`}
                                        </small>
                                      </span>
                                    </button>
                                      <div className={s.supplyActions}>
                                        {status === "needs-supplies" ? (
                                          <>
                                            {item.searchTerm ? (
                                              <a
                                                className={s.supplyPrimary}
                                                href={getAmazonSearchUrl(item.searchTerm)}
                                                target="_blank"
                                                rel="noopener noreferrer sponsored"
                                                aria-label={`Buy ${item.name} on Amazon (opens in a new tab)`}
                                              >
                                                Buy on Amazon <ArrowUpRight size={16} aria-hidden="true" />
                                              </a>
                                            ) : (
                                              <button className={s.supplyPrimary} aria-label={`Record owned amount for ${item.name}`} onClick={() => openDetail(item.id)}>
                                                Record amount
                                              </button>
                                            )}
                                            <button
                                              className={s.supplySecondary}
                                              data-completion-id={item.id}
                                              aria-label={`I have the full recommended quantity of ${item.name}`}
                                              onClick={() => ownFullQuantity(item)}
                                            >
                                              I have this
                                            </button>
                                            {item.searchTerm && (
                                              <button className={s.supplyText} aria-label={`Enter partial owned amount for ${item.name}`} onClick={() => openDetail(item.id)}>
                                                Enter partial amount
                                              </button>
                                            )}
                                          </>
                                        ) : status === "ready" ? (
                                          <button
                                            className={s.supplyPrimary}
                                            data-completion-id={item.id}
                                            aria-label={`Mark ${packed ? "packed" : "stored"}: ${item.name}`}
                                            onClick={() => toggleItem(item)}
                                          >
                                            Mark {packed ? "packed" : "stored"}
                                          </button>
                                        ) : (
                                          <button
                                            className={s.supplySecondary}
                                            data-completion-id={item.id}
                                            aria-label={`${packed ? "Unpack" : "Remove from storage"}: ${item.name}`}
                                            onClick={() => toggleItem(item)}
                                          >
                                            <Check size={16} aria-hidden="true" /> {complete} · {packed ? "Unpack" : "Remove"}
                                          </button>
                                        )}
                                      </div>
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
                  <p className={s.note}>
                    Quantities are starting estimates; adapt them to personal
                    needs and local guidance. Completion does not guarantee
                    safety. GetReady does not provide live emergency alerts.
                  </p>
                  <button
                    className={s.textButton}
                    onClick={() => navigate("Household plan")}
                  >
                    Make your household plan <ArrowRight size={16} />
                  </button>
                </>
              )}
              {page === "Household plan" && (
                <>
                  <div className={s.pageTitle}>
                    <span className={s.kicker}>KNOW WHAT TO DO TOGETHER</span>
                    <h1>Your household plan.</h1>
                    <p>Who to call, where to meet, and what to remember.</p>
                  </div>
                  <button className={s.outline} onClick={() => window.print()}>
                    <Printer size={17} />
                    Print / save PDF
                  </button>
                  <HouseholdPlan />
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
              {page === "Settings" && (
                <>
                  <div className={s.pageTitle}>
                    <span className={s.kicker}>MAKE IT WORK FOR YOU</span>
                    <h1>Settings & tools.</h1>
                    <p>Your household, kits, and occasional upkeep.</p>
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
                          <Setup kit={kit} finish={finish} editing />
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
                            Support GetReady ↗
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
                : "PREPARE YOUR HOME"}
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
                {selectedAction.id === "home-contacts" && (
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
