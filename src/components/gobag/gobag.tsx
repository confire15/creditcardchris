"use client";
import { useRef, useState } from "react";
import Image from "next/image";
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
  ShieldCheck,
} from "lucide-react";
import { useKit } from "@/lib/gobag/use-kit";
import {
  getSummary,
  isPacked,
  itemQuantity,
  missingQuantity,
  quantityLabel,
  type KitState,
} from "@/lib/gobag/kit";
import {
  activeHomeActions,
  nextSteps,
  preparationProgress,
} from "@/lib/gobag/preparation";
import { concerns } from "@/data/gobag-preparation";
import { householdNeeds, priorityOf, storageOf } from "@/data/gobag-guidance";
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

type Page = "Overview" | "My checklist" | "Household plan";
type Filter = "All" | "To do" | "Done";
const pages: Page[] = ["Overview", "My checklist", "Household plan"];
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
}: {
  kit: ReturnType<typeof useKit>;
  finish: () => void;
}) {
  const { state, update } = kit;
  return (
    <section className={s.setup} aria-labelledby="setup-heading">
      <div className={s.sectionHeading}>
        <div>
          <span className={s.kicker}>A PLAN THAT FITS YOUR LIFE</span>
          <h2 id="setup-heading">Start with your household.</h2>
        </div>
        <button className={s.textButton} onClick={finish}>
          Skip setup
        </button>
      </div>
      <p>About a minute. Every detail is optional and can be changed later.</p>
      <label className={s.field}>
        General location
        <input
          maxLength={120}
          placeholder="City, region, or postal code"
          value={state.location}
          onChange={(e) => update({ location: e.target.value })}
        />
        <small>
          No street address needed. This is a label for your plan; we don’t
          infer local risks.
        </small>
      </label>
      <div className={s.setupGrid}>
        <div>
          <span>People in your household</span>
          <Stepper
            label="household size"
            value={state.people}
            max={50}
            onChange={(people) => update({ people })}
          />
        </div>
        <div>
          <label className={s.checkLabel}>
            <input
              type="checkbox"
              checked={state.pets}
              onChange={(e) => update({ pets: e.target.checked })}
            />{" "}
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
      <fieldset className={s.choices}>
        <legend>What would you like to prepare for?</legend>
        <p>
          Choose your concerns. These are not predictions for your location.
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
                      : state.concerns.filter((v) => v !== c),
                  })
                }
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
      <details className={s.secondaryDetails}>
        <summary>Optional household needs</summary>
        <div className={s.needChoices}>
          {householdNeeds.map((n) => (
            <label key={n.id}>
              <input
                type="checkbox"
                checked={state.needs.includes(n.id)}
                onChange={(e) =>
                  update({
                    needs: e.target.checked
                      ? [...state.needs, n.id]
                      : state.needs.filter((v) => v !== n.id),
                  })
                }
              />
              {n.label}
            </label>
          ))}
        </div>
      </details>
      <button className={s.primary} onClick={finish}>
        Show my next steps <ArrowRight size={18} />
      </button>
    </section>
  );
}
export default function GetReady() {
  const kit = useKit();
  const { state, update } = kit;
  const [page, setPage] = useState<Page>("Overview");
  const [setup, setSetup] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [undo, setUndo] = useState<{
    id: string;
    name: string;
    completed: number;
    owned: number | undefined;
    kitId: string;
  } | null>(null);
  const heading = useRef<HTMLElement>(null);
  const summary = getSummary(state);
  const progress = preparationProgress(state);
  const steps = nextSteps(state);
  const actions = activeHomeActions(state);
  const navigate = (next: Page) => {
    setPage(next);
    setSetup(false);
    setUndo(null);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  };
  const finish = () => {
    update({ setupComplete: true });
    setSetup(false);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const matches = (name: string, done: boolean) =>
    name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (filter === "All" || (filter === "Done" ? done : !done));
  const remember = (id: string, name: string) =>
    setUndo({
      id,
      name,
      completed: state.completed[id] ?? 0,
      owned: state.owned[id],
      kitId: kit.library.activeId,
    });
  const showStep = (name: string) => {
    navigate("My checklist");
    setSearch(name);
    setFilter("To do");
  };
  const visibleActions = actions.filter((a) =>
    matches(a.name, !!state.completed[a.id]),
  );
  const visibleItems = summary.items
    .filter((i) => matches(i.name, isPacked(i, state)))
    .sort(
      (a, b) =>
        Number(priorityOf(b) === "Start here") -
        Number(priorityOf(a) === "Start here"),
    );
  return (
    <KitContext.Provider value={kit}>
      <div className={`${styles.app} ${s.guide}`}>
        <a className={styles.skipLink} href="#guide-main">
          Skip to content
        </a>
        <div className={s.screen}>
          <header className={s.header}>
            <div className={s.brand}>
              <Logo />
              <span>YOUR HOUSEHOLD FIELD GUIDE</span>
            </div>
            <span className={s.saved} role="status">
              <ShieldCheck size={15} />
              {kit.storageMessage}
            </span>
          </header>
          <nav className={s.nav} aria-label="Main navigation">
            {pages.map((p, i) => {
              const Icon = [House, ClipboardList, MapPin][i];
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
              {page === "Overview" && (
                <>
                  {!state.setupComplete && !setup && (
                    <section className={s.hero}>
                      <div>
                        <span className={s.kicker}>
                          SMALL STEPS. A MORE PREPARED HOUSEHOLD.
                        </span>
                        <h1>
                          Prepare your home.
                          <br />
                          Pack your bag.
                          <br />
                          <em>Have a plan.</em>
                        </h1>
                        <p>
                          Simple steps to help your household prepare for El
                          Niño-related weather risks.
                        </p>
                        <button
                          className={s.primary}
                          onClick={() => setSetup(true)}
                        >
                          Build my plan <ArrowRight size={18} />
                        </button>
                        <small>
                          Free to use · No account needed · Saved on your device
                        </small>
                      </div>
                      <Image
                        src="/gobag/kit-illustration.svg"
                        alt="A go-bag with water, a flashlight, radio, and first aid supplies"
                        width={760}
                        height={620}
                        priority
                      />
                      <div className={s.heroCaption}>
                        Start with what you have.
                        <br />
                        Build from there.
                      </div>
                    </section>
                  )}
                  {setup && <Setup kit={kit} finish={finish} />}
                  {state.setupComplete && !setup && (
                    <>
                      <div className={s.pageTitle}>
                        <span className={s.kicker}>
                          YOUR HOUSEHOLD, ONE STEP AT A TIME
                        </span>
                        <h1>A little preparation today.</h1>
                        <p>
                          Start with one useful thing. Come back for the next.
                        </p>
                      </div>
                      <div className={s.householdSummary}>
                        <div>
                          <strong>{state.location || "Your household"}</strong>
                          <p>
                            {state.people}{" "}
                            {state.people === 1 ? "person" : "people"}
                            {state.pets
                              ? ` · ${state.petCount} ${state.petCount === 1 ? "pet" : "pets"}`
                              : ""}{" "}
                            · {state.days}-day supply target · {kit.activeName}
                          </p>
                          <small>
                            {state.concerns.length
                              ? `Preparing for: ${state.concerns.join(", ")}`
                              : "General household preparation"}
                          </small>
                        </div>
                        <button
                          className={s.textButton}
                          onClick={() => setSetup(true)}
                        >
                          Edit household
                        </button>
                      </div>
                      <div className={s.overviewGrid}>
                        <section className={s.nextSteps}>
                          <span className={s.kicker}>
                            A GOOD PLACE TO CONTINUE
                          </span>
                          <h2>Your next 3 steps</h2>
                          <p>Suggested from your incomplete priorities.</p>
                          <ol>
                            {steps.map((step, i) => (
                              <li key={step.id}>
                                <span className={s.stepNumber}>{i + 1}</span>
                                <button onClick={() => showStep(step.name)}>
                                  <span>
                                    <small>{step.group}</small>
                                    <strong>{step.name}</strong>
                                    <small>{step.note}</small>
                                  </span>
                                  <ArrowRight size={19} />
                                </button>
                              </li>
                            ))}
                          </ol>
                          {!steps.length && (
                            <>
                              <p>
                                You’ve completed the listed tasks. Review your
                                household plan and check supplies regularly.
                              </p>
                              <button
                                className={s.primary}
                                onClick={() => navigate("Household plan")}
                              >
                                Review my plan <ArrowRight size={18} />
                              </button>
                            </>
                          )}
                        </section>
                        <aside className={s.progress}>
                          <ClipboardList size={25} />
                          <h3>Checklist completion</h3>
                          <strong>
                            {progress.done}
                            <span> / {progress.total}</span>
                          </strong>
                          <progress
                            max={progress.total}
                            value={progress.done}
                            aria-label="Checklist completion"
                          />
                          <p>
                            Home actions and packed or stored supplies. This is
                            not a safety or readiness score.
                          </p>
                          <button
                            className={s.textButton}
                            onClick={() => {
                              setSearch("");
                              setFilter("All");
                              navigate("My checklist");
                            }}
                          >
                            Open my checklist →
                          </button>
                          <hr />
                          <h3>Missing essentials</h3>
                          {summary.missing.length ? (
                            <>
                              <ul>
                                {summary.missing
                                  .slice()
                                  .sort(
                                    (a, b) =>
                                      Number(priorityOf(b) === "Start here") -
                                      Number(priorityOf(a) === "Start here"),
                                  )
                                  .slice(0, 3)
                                  .map((i) => (
                                    <li key={i.id}>
                                      {i.name}
                                      <small>
                                        {quantityLabel(
                                          i,
                                          missingQuantity(i, state),
                                        )}{" "}
                                        still needed
                                      </small>
                                    </li>
                                  ))}
                              </ul>
                              <p>
                                {summary.missing.length} supply types still need
                                quantities. Check your cupboards first.
                              </p>
                            </>
                          ) : (
                            <p>
                              You own the listed supplies. Check they’re packed
                              or stored accessibly.
                            </p>
                          )}
                        </aside>
                      </div>
                    </>
                  )}
                  {!state.setupComplete && !setup && (
                    <div className={s.introSteps}>
                      {[
                        [
                          House,
                          "01",
                          "Prepare your home",
                          "Simple actions you can take today.",
                        ],
                        [
                          Backpack,
                          "02",
                          "Gather your essentials",
                          "Check what you own before you buy.",
                        ],
                        [
                          MapPin,
                          "03",
                          "Make a plan together",
                          "Know where to go and who to call.",
                        ],
                      ].map(([Icon, n, title, text]) => {
                        const Component = Icon as typeof House;
                        return (
                          <div key={String(n)}>
                            <Component size={23} />
                            <span>
                              <small>{String(n)}</small>
                              <h3>{String(title)}</h3>
                              <p>{String(text)}</p>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <OfficialResources />
                </>
              )}
              {page === "My checklist" && (
                <>
                  <div className={s.pageTitle}>
                    <span className={s.kicker}>PREPARE, GATHER, CHECK</span>
                    <h1>My checklist</h1>
                    <p>
                      Use what you have. Pack what you can carry. Store the rest
                      at home.
                    </p>
                  </div>
                  <div className={s.checklistMeta}>
                    <span>
                      {progress.done} of {progress.total} home actions & supply
                      types complete
                    </span>
                    <label>
                      Supply duration
                      <select
                        value={state.days}
                        onChange={(e) =>
                          update({
                            days: Number(e.target.value) as KitState["days"],
                          })
                        }
                      >
                        {[3, 7, 14].map((d) => (
                          <option key={d} value={d}>
                            {d} days
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className={s.note}>
                    Quantities are starting estimates for {state.people}{" "}
                    {state.people === 1 ? "person" : "people"}; follow local
                    guidance and personal needs. Completion does not guarantee
                    safety.
                  </p>
                  <div className={s.toolbar}>
                    <label className={s.search}>
                      <Search size={18} />
                      <input
                        aria-label="Search checklist"
                        placeholder="Search items and actions"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <div
                      className={s.filters}
                      role="group"
                      aria-label="Checklist status"
                    >
                      {(["All", "To do", "Done"] as const).map((f) => (
                        <button
                          aria-pressed={filter === f}
                          key={f}
                          onClick={() => setFilter(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!visibleActions.length && !visibleItems.length && (
                    <div className={s.empty}>
                      <h2>No matching tasks</h2>
                      <p>Try another search or view the full checklist.</p>
                      <button
                        className={s.primary}
                        onClick={() => {
                          setSearch("");
                          setFilter("All");
                        }}
                      >
                        Show all tasks
                      </button>
                    </div>
                  )}
                  {visibleActions.length > 0 && (
                    <section className={s.checkGroup}>
                      <div className={s.groupHeading}>
                        <House size={23} />
                        <div>
                          <h2>Prepare your home</h2>
                          <p>Practical steps before conditions change.</p>
                        </div>
                      </div>
                      {visibleActions.map((a) => (
                        <div key={a.id} className={s.row}>
                          <label className={s.rowCheck}>
                            <input
                              type="checkbox"
                              checked={!!state.completed[a.id]}
                              onChange={() => {
                                remember(a.id, a.name);
                                kit.togglePersonal(a.id);
                              }}
                            />
                            <span>
                              {a.name}
                              <small>
                                Action · No purchase needed to start
                              </small>
                            </span>
                          </label>
                          <details>
                            <summary>Why it matters & how</summary>
                            <p>{a.why}</p>
                            <a
                              href={a.source}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Official guidance ↗
                            </a>
                          </details>
                        </div>
                      ))}
                    </section>
                  )}
                  {(["Carry essentials", "Home reserves"] as const).map(
                    (group) => {
                      const items = visibleItems.filter(
                        (i) => storageOf(i) === group,
                      );
                      return (
                        items.length > 0 && (
                          <section className={s.checkGroup} key={group}>
                            <div className={s.groupHeading}>
                              {group === "Carry essentials" ? (
                                <Backpack size={23} />
                              ) : (
                                <House size={23} />
                              )}
                              <div>
                                <h2>
                                  {group === "Carry essentials"
                                    ? "Pack your go-bag"
                                    : "Stock home supplies"}
                                </h2>
                                <p>
                                  {group === "Carry essentials"
                                    ? "Portable essentials for leaving quickly. Try carrying your loaded bag."
                                    : "Keep larger reserves at home. Plan a manageable portion of food and water to take if you leave."}
                                </p>
                              </div>
                            </div>
                            {items.map((item) => (
                              <div key={item.id} className={s.row}>
                                <div className={s.supplyHeading}>
                                  <label className={s.rowCheck}>
                                    <input
                                      type="checkbox"
                                      checked={isPacked(item, state)}
                                      onChange={() => {
                                        remember(item.id, item.name);
                                        kit.toggle(item);
                                      }}
                                    />
                                    <span>
                                      {item.name}
                                      <small>
                                        {quantityLabel(
                                          item,
                                          itemQuantity(item, state),
                                        )}{" "}
                                        recommended ·{" "}
                                        {state.completed[item.id] ?? 0} packed /
                                        stored
                                      </small>
                                    </span>
                                  </label>
                                  {priorityOf(item) === "Start here" && (
                                    <span className={s.priority}>
                                      Essential
                                    </span>
                                  )}
                                </div>
                                <details>
                                  <summary>Why it matters & quantities</summary>
                                  <p>{item.why}</p>
                                  <p>{item.description}</p>
                                  <ItemPlanning item={item} />
                                  <details className={s.secondaryDetails}>
                                    <summary>Optional shopping link</summary>
                                    <AmazonButton item={item} />
                                    <AffiliateDisclosure />
                                  </details>
                                </details>
                              </div>
                            ))}
                          </section>
                        )
                      );
                    },
                  )}
                  <details className={s.secondaryDetails}>
                    <summary>Personal essentials & household needs</summary>
                    <p className={s.note}>
                      Optional reminders, tracked separately from checklist
                      completion.
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
                    <HouseholdNeeds />
                  </details>
                  <details className={s.secondaryDetails}>
                    <summary>Custom supplies & radio options</summary>
                    <CustomSupplies />
                    <label className={s.checkLabel}>
                      <input
                        type="checkbox"
                        checked={state.combinedRadio}
                        onChange={(e) => kit.combineRadio(e.target.checked)}
                      />
                      One radio covers emergency broadcasts and NOAA tone alerts
                    </label>
                  </details>
                  <details className={s.secondaryDetails}>
                    <summary>Budget & sharing</summary>
                    <SpendingAndSharing />
                  </details>
                  <button
                    className={s.primary}
                    onClick={() => navigate("Household plan")}
                  >
                    Continue to household plan <ArrowRight size={18} />
                  </button>
                </>
              )}
              {page === "Household plan" && (
                <>
                  <div className={s.sectionHeading}>
                    <div className={s.pageTitle}>
                      <span className={s.kicker}>KNOW WHAT TO DO TOGETHER</span>
                      <h1>Household plan</h1>
                      <p>A few decisions now can make the next step clearer.</p>
                    </div>
                    <button
                      className={s.outline}
                      onClick={() => window.print()}
                    >
                      <Printer size={18} />
                      Print / save PDF
                    </button>
                  </div>
                  <HouseholdPlan />
                  <OfflineSupport />
                  <details className={s.secondaryDetails}>
                    <summary>Review dates & calendar reminders</summary>
                    <ReviewReminders />
                  </details>
                  <details className={s.secondaryDetails}>
                    <summary>Check and maintain your supplies</summary>
                    <MaintenanceWalkthrough />
                  </details>
                  <OfficialResources />
                </>
              )}
              <details className={s.settings}>
                <summary>Household settings, kits & backups</summary>
                <button
                  className={s.outline}
                  onClick={() => {
                    navigate("Overview");
                    setSetup(true);
                  }}
                >
                  Edit household setup
                </button>
                <KitWorkspace />
              </details>
              <details className={s.secondaryDetails}>
                <summary>Sources & preparation guidance</summary>
                <GuidanceReview />
              </details>
            </fieldset>
            {undo && undo.kitId === kit.library.activeId && (
              <div className={s.undo} role="status">
                <Check size={18} />
                <span>Updated: {undo.name}</span>
                <button
                  onClick={() => {
                    const owned = { ...state.owned };
                    if (undo.owned === undefined) delete owned[undo.id];
                    else owned[undo.id] = undo.owned;
                    update({
                      completed: {
                        ...state.completed,
                        [undo.id]: undo.completed,
                      },
                      owned,
                    });
                    setUndo(null);
                  }}
                >
                  Undo
                </button>
                <button
                  aria-label="Dismiss update"
                  onClick={() => setUndo(null)}
                >
                  ×
                </button>
              </div>
            )}
          </main>
          <footer className={s.footer}>
            <Logo />
            <p>Practical preparation. One step at a time.</p>
            <small>Independent tool · Follow local emergency guidance.</small>
            <a
              href="https://ko-fi.com/chrisluong"
              target="_blank"
              rel="noopener noreferrer"
            >
              Support GetReady ↗
            </a>
          </footer>
        </div>
        <PrintableSummary state={state} name={kit.activeName} />
      </div>
    </KitContext.Provider>
  );
}
