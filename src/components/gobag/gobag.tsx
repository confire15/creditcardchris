"use client";
import { useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Heart,
  LockKeyhole,
  Printer,
  Search,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  categories,
  personalEssentials,
  type EmergencyItem,
} from "@/data/emergency-items";
import {
  getSummary,
  missingQuantity,
  ownedQuantity,
  isPacked,
  itemQuantity,
  quantityLabel,
  type KitState,
} from "@/lib/gobag/kit";
import { useKit } from "@/lib/gobag/use-kit";
import {
  AffiliateDisclosure,
  AmazonButton,
  CategorySection,
  CostSummary,
  EmergencyItemCard,
  Header,
  Hero,
  HouseholdConfigurator,
  Logo,
  PreparednessProgress,
  Steps,
} from "./kit-parts";
import styles from "./gobag.module.css";
import {
  KitContext,
  HouseholdNeeds,
  ReviewReminders,
  HouseholdPlan,
  PrintedPlanning,
  GuidanceReview,
} from "./planning";
import { storageOf } from "@/data/gobag-guidance";
import {
  KitWorkspace,
  CustomSupplies,
  SpendingAndSharing,
  MaintenanceWalkthrough,
} from "./workspace";
import { OfflineSupport } from "./offline-support";

type StatusFilter = "All" | "Missing" | "Packed";
const matches = (
  name: string,
  packed: boolean,
  search: string,
  filter: StatusFilter,
) =>
  name.toLowerCase().includes(search.toLowerCase()) &&
  (filter === "All" || (filter === "Packed" ? packed : !packed));
function PersonalEssentials({
  state,
  toggle,
  search,
  filter,
}: {
  state: KitState;
  toggle: (id: string) => void;
  search: string;
  filter: StatusFilter;
}) {
  const items = personalEssentials.filter((i) =>
    matches(i.name, !!state.completed[i.id], search, filter),
  );
  return (
    <section className={styles.personal}>
      <div className={styles.personalTitle}>
        <Heart size={22} />
        <div>
          <h3>Don’t forget personal essentials</h3>
          <p>Your kit should feel like yours.</p>
        </div>
        <span>OPTIONAL</span>
      </div>
      <p className={styles.personalNote}>
        Choose what applies to your household. These reminders are saved
        separately and are not included in the essentials progress or cost
        estimate. Arrange prescription supplies with your pharmacy or clinician.
      </p>
      <div className={styles.personalGrid}>
        {items.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={!!state.completed[item.id]}
              onChange={() => toggle(item.id)}
            />
            <span>{item.name}</span>
          </label>
        ))}
      </div>
      {!items.length && <p>No personal essentials match these filters.</p>}
    </section>
  );
}
function PetEmergencyKit({
  items,
  state,
  toggle,
}: {
  items: EmergencyItem[];
  state: KitState;
  toggle: (item: EmergencyItem) => void;
}) {
  return items.length ? (
    <div className={styles.petSection}>
      <p>
        Pet supplies are calculated for {state.petCount}{" "}
        {state.petCount === 1 ? "pet" : "pets"}. Adapt food portions, water
        volume, carriers, and supplies to each animal. Pet water and records are
        not priced.
      </p>
      <CategorySection
        category="Pet Emergency Kit"
        items={items}
        state={state}
        toggle={toggle}
      />
    </div>
  ) : null;
}
function MissingItemsDrawer({
  state,
  open,
  onOpenChange,
  restoreFocus,
}: {
  state: KitState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocus: () => void;
}) {
  const { missing } = getSummary(state);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={styles.drawer}
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <div className={styles.dialogHeading}>
          <span className={styles.eyebrow}>YOUR NEXT SMALL STEPS</span>
          <DialogClose
            className={styles.close}
            aria-label="Close shopping list"
          >
            <X size={20} />
          </DialogClose>
        </div>
        <DialogTitle className={styles.dialogTitle}>
          {missing.length
            ? `Shop these ${missing.length} items`
            : "You own the listed essentials"}
        </DialogTitle>
        <DialogDescription className={styles.dialogDescription}>
          {missing.length
            ? "Check your cupboards first, then explore the supplies you still need. Each link opens one Amazon search in a new tab."
            : "Take a moment to review personal essentials, expiration dates, and your local emergency plan."}
        </DialogDescription>
        <div className={styles.drawerList}>
          {missing.map((item) => (
            <div className={styles.drawerItem} key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {quantityLabel(item, missingQuantity(item, state))}
                </small>
              </div>
              <AmazonButton item={item} compact />
            </div>
          ))}
        </div>
        <p className={styles.drawerNote}>
          Estimates are in USD, before shipping and tax. Radio features may
          overlap; one suitable radio can cover both entries. Prices exclude
          unpriced supplies and optional personal essentials. Products are
          not verified or endorsed by GoBag or government agencies.
        </p>
        <AffiliateDisclosure />
      </DialogContent>
    </Dialog>
  );
}
function PreparednessResources() {
  return (
    <section id="resources" className={styles.resources}>
      <div>
        <span className={styles.eyebrow}>
          A LITTLE KNOWLEDGE GOES A LONG WAY
        </span>
        <h2>Every essential has a purpose.</h2>
        <p>
          Emergencies can interrupt electricity, clean water, transportation,
          and communication. Stores may be hard to reach. A few basic supplies
          can help you plan for those disruptions.
        </p>
        <p>
          Start with general guidance, then adapt it to your household and the
          place you call home.
        </p>
        <a
          href="https://www.ready.gov/kit"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.resourceMain}
        >
          Explore the Ready.gov checklist <ArrowUpRight size={17} />
        </a>
      </div>
      <div className={styles.resourceLinks}>
        {[
          ["Water", "Plan your household’s water supply", "water"],
          ["Food", "Make room for familiar, shelf-stable food", "food"],
          ["Shelter", "Understand shelter-in-place planning", "shelter"],
          [
            "Safety skills",
            "Find guidance from emergency authorities",
            "safety-skills",
          ],
        ].map(([title, description, path]) => (
          <a
            href={`https://www.ready.gov/${path}`}
            target="_blank"
            rel="noopener noreferrer"
            key={path}
          >
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <ArrowUpRight size={19} />
          </a>
        ))}
      </div>
    </section>
  );
}
function FAQ() {
  return (
    <section id="faq" className={styles.faq}>
      <div>
        <span className={styles.eyebrow}>GOOD QUESTIONS. SIMPLE ANSWERS.</span>
        <h2>A little more clarity.</h2>
        <p>Preparedness starts with understanding.</p>
      </div>
      <div>
        {[
          [
            "What’s the difference between a go-bag and a stay-home kit?",
            "A go-bag prioritizes portable essentials for leaving quickly. A stay-home kit holds larger reserves. The mode toggle puts carry essentials or home reserves first and lets you filter by storage group; the daily water requirement stays the same. Your full water supply can be heavy: keep reserves accessible and plan what you can realistically transport.",
          ],
          [
            "Is three days enough?",
            "Three days is a starting point for this tool, not a guarantee. Your location, climate, household needs, and local authorities may call for a longer supply. Choose 7 or 14 days when appropriate, and follow local guidance.",
          ],
          [
            "Do I have to buy everything on Amazon?",
            "No. Start with what you own. Local shops, grocery stores, and other retailers may be good options. Amazon links are searches, not recommendations of specific tested or approved products. You can also obtain maps and documents locally.",
          ],
          [
            "How are quantities and prices calculated?",
            "Water scales at one gallon per person per day. Food is counted in person-days, not manufacturer servings. Other quantities are starting allowances. Manual price ranges are multiplied only by quantities you still need to buy. Owned and packed quantities are separate. If your plan grows, only the additional supplies enter the estimate. Mark supplies packed or stored when they are ready in the right place.",
          ],
          [
            "Will my checklist be here when I return?",
            "Your household settings and checked items are stored in this browser on this device. No account is needed. Clearing browser data or using another device will not retain your checklist. If storage is blocked, the checklist works for the current session.",
          ],
          [
            "When should I review my kit?",
            "Review it regularly and whenever your household or plans change. Check expiration dates, battery charge, clothing sizes, and local evacuation guidance. Completing this list does not guarantee safety or cover every personal need.",
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <ChevronDown size={17} />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
function PrintableSummary({ state, name }: { state: KitState; name: string }) {
  const s = getSummary(state);
  return (
    <section
      className={styles.printOnly}
      aria-label="My Emergency Kit printable summary"
    >
      <h1>{name} — My Emergency Kit</h1>
      <p>GoBag · {state.mode === "go-bag" ? "Go-Bag" : "Stay-Home Kit"}</p>
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
function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <Logo />
        <span>
          A little planning today. A little more peace of mind tomorrow.
        </span>
        <a href="#builder">Back to your kit ↑</a>
      </div>
      <p>
        Independent preparedness tool. Follow guidance from local emergency officials.
      </p>
      <AffiliateDisclosure />
      <div className={styles.kofiSupport}>
        <a
          className={styles.kofiLink}
          href="https://ko-fi.com/chrisluong"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buy me a coffee on Ko-fi! (opens in a new tab)"
        >
          Buy me a coffee <span aria-hidden="true">☕</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <div className={styles.kofiNote}>Help keep GoBag free.</div>
      </div>
      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} GoBag</span>
        <span>
          <LockKeyhole size={13} /> Your checklist stays in your browser.
        </span>
      </div>
    </footer>
  );
}
export default function GoBag() {
  const kit = useKit();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("Missing");
  const [shopOpen, setShopOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const summary = useMemo(() => getSummary(kit.state), [kit.state]);
  const visible = summary.items.filter(
    (i) =>
      matches(
        `${i.name} ${i.description} ${i.category}`,
        isPacked(i, kit.state),
        search,
        filter === "Missing" ? "All" : filter,
      ) &&
      (filter !== "Missing" || missingQuantity(i, kit.state) > 0) &&
      true,
  );
  const allCategories = [
    ...categories,
    ...(kit.state.customItems.length ? ["Your additions"] : []),
  ];
  const visibleCategories = allCategories
    .filter((c) => visible.some((i) => i.category === c));
  const packedItems = summary.items.filter((i) => isPacked(i, kit.state));
  const shopTrigger = useRef<HTMLElement | null>(null);
  const resetTrigger = useRef<HTMLElement | null>(null);
  const openShop = () => {
    shopTrigger.current = document.activeElement as HTMLElement;
    setShopOpen(true);
  };
  const openReset = () => {
    resetTrigger.current = document.activeElement as HTMLElement;
    setResetOpen(true);
  };
  const updateConfiguration = (patch: Partial<KitState>) => {
    kit.update(patch);
    if (patch.pets === false) setFilter("Missing");
  };
  return (
    <KitContext.Provider value={kit}>
      <div className={styles.app}>
        <a className={styles.skipLink} href="#checklist">
          Skip to checklist
        </a>
        <div className={styles.screenOnly}>
          <Header />
          <main className={styles.main}>
            <Hero />
            <Steps />
            <p className={styles.guidance}>
              Based on general emergency preparedness guidance. Consult{" "}
              <a href="https://www.ready.gov/kit" target="_blank" rel="noopener noreferrer">
                Ready.gov <ArrowUpRight size={12} />
              </a>{" "}
              and local emergency authorities for advice specific to your area.
            </p>
            <fieldset
              className={styles.appFieldset}
              disabled={!kit.loaded}
              aria-busy={!kit.loaded}
            >
              <details className={styles.settingsSummary}>
                <summary>
                  <strong>My GoBag</strong>
                  <span>{kit.state.people} {kit.state.people === 1 ? "person" : "people"} · {kit.state.days} days{kit.state.pets ? ` · ${kit.state.petCount} ${kit.state.petCount === 1 ? "pet" : "pets"}` : ""}</span>
                  <em>Edit</em>
                </summary>
                <HouseholdConfigurator state={kit.state} update={updateConfiguration} />
              </details>
              <section id="checklist" className={styles.checklist}>
                <div className={styles.checklistHeader}>
                  <div>
                    <span className={styles.eyebrow}>
                      YOUR PLAN, ONE CHECK AT A TIME
                    </span>
                    <h2>Let’s put your kit together.</h2>
                    <p>
                      Count what you own, then mark it packed or stored. Missing
                      means still to buy.
                    </p>
                  </div>
                  <span className={styles.saved} role="status">
                    <Check size={14} />
                    {kit.storageMessage}
                  </span>
                </div>
                <div className={styles.checklistLayout}>
                    <div className={styles.checklistMain}>
                      <PreparednessProgress state={kit.state} />
                    <div className={styles.simpleChecklistTools}>
                      <button className={styles.secondary} onClick={() => setFilter(filter === "Missing" ? "All" : "Missing")}>
                        {filter === "Missing" ? "Show completed items" : "Show items left"}
                      </button>
                      <details className={styles.findItem}>
                        <summary><Search size={15} /> Find an item</summary>
                        <label className={styles.search}>
                          <Search size={17} />
                          <input placeholder="Search your checklist" aria-label="Search your checklist" value={search} onChange={(e) => setSearch(e.target.value)} />
                          {search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={16} /></button>}
                        </label>
                      </details>
                    </div>
                    <div id="supplies" />
                    {visibleCategories.map((c) => (
                      <CategorySection
                        key={c}
                        category={c}
                        items={visible.filter((i) => i.category === c)}
                        state={kit.state}
                        toggle={kit.toggle}
                      />
                    ))}
                    <PetEmergencyKit
                      items={visible.filter(
                        (i) => i.category === "Pet Emergency Kit",
                      )}
                      state={kit.state}
                      toggle={kit.toggle}
                    />
                    {!visible.length && (
                      <div className={styles.empty}>
                        <CheckCheckIcon />
                        <h3>
                          {filter === "Missing" && !summary.missing.length
                            ? "You own all listed essentials. Review what still needs packing."
                            : "No essentials match these filters."}
                        </h3>
                        <p>
                          Try another category or search, or review your
                          personal essentials below.
                        </p>
                        <button
                          className={styles.secondary}
                          onClick={() => {
                            setSearch("");
                            setFilter("All");
                          }}
                        >
                          Show all items
                        </button>
                      </div>
                    )}
                    {filter === "All" && (
                      <details className={styles.optionalSection}>
                        <summary>Personalize your kit</summary>
                        <PersonalEssentials
                          state={kit.state}
                          toggle={kit.togglePersonal}
                          search={search}
                          filter={filter}
                        />
                      </details>
                    )}
                    {filter === "Missing" && packedItems.length > 0 && (
                      <details className={styles.completedSection}>
                        <summary>Completed items ({packedItems.length})</summary>
                        <div className={styles.itemGrid}>
                          {packedItems.map((item) => <EmergencyItemCard key={item.id} item={item} state={kit.state} toggle={kit.toggle} />)}
                        </div>
                      </details>
                    )}
                    <div className={styles.printPrompt}>
                      <Printer size={20} />
                      <div>
                        <strong>My Emergency Kit</strong>
                        <span>Keep a paper copy with your supplies.</span>
                      </div>
                      <button
                        className={styles.secondary}
                        onClick={() => window.print()}
                      >
                        Print checklist <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                  <CostSummary
                    state={kit.state}
                    onShop={openShop}
                    onReset={openReset}
                  />
                </div>
              </section>
              <details id="manage" className={styles.managePanel}>
                <summary>Manage my kit</summary>
                <KitWorkspace />
                <HouseholdNeeds />
                <OfflineSupport />
                <CustomSupplies />
                <SpendingAndSharing key={kit.library.activeId} />
                <MaintenanceWalkthrough />
                <ReviewReminders />
                <HouseholdPlan />
              </details>
            </fieldset>
            <details className={styles.infoDetails}>
              <summary>Learn more about emergency preparedness</summary>
              <GuidanceReview />
              <PreparednessResources />
              <FAQ />
            </details>
          </main>
          <Footer />
          <MissingItemsDrawer
            state={kit.state}
            open={shopOpen}
            onOpenChange={setShopOpen}
            restoreFocus={() => shopTrigger.current?.focus()}
          />
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogContent
              className={styles.resetDialog}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                resetTrigger.current?.focus();
              }}
            >
              <DialogTitle>Start a fresh checklist?</DialogTitle>
              <DialogDescription className={styles.dialogDescription}>
                This clears the selected kit’s custom items, spending,
                locations, quantities, review dates, household plan,
                maintenance, and personal reminders, and returns your household,
                duration, pets, and kit type to their defaults on this device.
                This cannot be undone.
              </DialogDescription>
              <div className={styles.resetActions}>
                <DialogClose className={styles.secondary}>
                  Keep my checklist
                </DialogClose>
                <button
                  className={styles.primary}
                  onClick={() => {
                    kit.reset();
                    setFilter("Missing");
                    setSearch("");
                    setResetOpen(false);
                  }}
                >
                  Reset checklist
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <PrintableSummary state={kit.state} name={kit.activeName} />
      </div>
    </KitContext.Provider>
  );
}
function CheckCheckIcon() {
  return <Check size={28} />;
}
