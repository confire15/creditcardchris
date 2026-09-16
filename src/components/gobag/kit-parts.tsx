"use client";
import {
  Backpack,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  Droplets,
  Utensils,
  Radio,
  Flashlight,
  HeartPulse,
  BatteryCharging,
  Megaphone,
  Shield,
  Tent,
  Scissors,
  Circle,
  Sparkles,
  Wrench,
  Map,
  Smartphone,
  PawPrint,
  Plus,
  Minus,
  Users,
  House,
  Printer,
  ShoppingBag,
  Leaf,
  RotateCcw,
  Info,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import type { EmergencyItem } from "@/data/emergency-items";
import { AMAZON_ASSOCIATE_TAG, getAmazonSearchUrl } from "@/lib/gobag/amazon";
import {
  getSummary,
  isPacked,
  itemQuantity,
  priceRange,
  progressLabel,
  quantityLabel,
  type KitState,
} from "@/lib/gobag/kit";
import styles from "./gobag.module.css";
import { ItemPlanning } from "./planning";
import { missingQuantity } from "@/lib/gobag/kit";

const icons: Record<string, LucideIcon> = {
  water: Droplets,
  food: Utensils,
  radio: Radio,
  flashlight: Flashlight,
  medical: HeartPulse,
  battery: BatteryCharging,
  whistle: Megaphone,
  mask: Shield,
  shelter: Tent,
  scissors: Scissors,
  tape: Circle,
  sanitation: Sparkles,
  tools: Wrench,
  map: Map,
  phone: Smartphone,
  pet: PawPrint,
  backpack: Backpack,
};
export function ItemIcon({ name, size = 23 }: { name: string; size?: number }) {
  const Icon = icons[name] ?? Backpack;
  return <Icon size={size} aria-hidden="true" strokeWidth={1.65} />;
}
export function Logo() {
  return (
    <span className={styles.logo}>
      <span className={styles.logoMark}>
        <Backpack size={23} strokeWidth={1.8} />
      </span>
      GoBag<span className={styles.logoDot}>.</span>
    </span>
  );
}
export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a href="#" aria-label="GoBag home">
          <Logo />
        </a>
        <nav aria-label="Main navigation">
          <a href="#builder">Build My Kit</a>
          <a href="#checklist">Checklist</a>
          <a href="#resources">Why These Items?</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a className={styles.headerCta} href="#builder">
          Build My Go-Bag <ChevronRight size={16} />
        </a>
      </div>
    </header>
  );
}
export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>
          <span /> A LITTLE PLANNING. MORE PEACE OF MIND.
        </span>
        <h1>
          Be ready
          <br />
          when it matters<span>.</span>
        </h1>
        <p className={styles.heroDescription}>
          Build a personalized emergency go-bag for your household, see what you
          already have, and quickly find the rest.
        </p>
        <div className={styles.heroActions}>
          <a href="#builder" className={styles.primary}>
            Build My Go-Bag <ChevronRight size={18} />
          </a>
          <a href="#checklist" className={styles.secondary}>
            View Emergency Checklist <ArrowUpRight size={16} />
          </a>
        </div>
        <p className={styles.heroHint}>
          <CheckCheck size={16} /> Build a personalized emergency kit in a few
          minutes.
        </p>
      </div>
      <div className={styles.heroArt}>
        <span className={styles.artEyebrow}>
          SMALL STEPS. EVERYDAY READINESS.
        </span>
        <Image
          src="/gobag/kit-illustration.svg"
          alt="An olive-green go-bag with water, a first aid pouch, a radio, and a flashlight"
          width={760}
          height={620}
          priority
        />
        <div className={styles.artLabel}>
          <span>
            <Check size={19} />
          </span>
          <div>
            <strong>A little more prepared.</strong>
            <small>One essential at a time.</small>
          </div>
        </div>
        <span className={styles.artFootnote}>
          YOUR PEACE-OF-MIND STARTER KIT
        </span>
      </div>
    </section>
  );
}
export function Steps() {
  return (
    <div className={styles.steps}>
      {[
        [Users, "01", "Tell us about your household"],
        [CheckCheck, "02", "Check what you already own"],
        [ShoppingBag, "03", "Get the remaining supplies"],
      ].map(([Icon, n, label]) => {
        const StepIcon = Icon as LucideIcon;
        return (
          <div key={String(n)}>
            <span className={styles.stepIcon}>
              <StepIcon size={22} strokeWidth={1.5} />
            </span>
            <span>
              <small>STEP {String(n)}</small>
              <strong>{String(label)}</strong>
            </span>
            {n !== "03" && (
              <ChevronRight className={styles.stepArrow} size={18} />
            )}
          </div>
        );
      })}
    </div>
  );
}
export function Stepper({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={17} />
      </button>
      <output aria-live="polite" aria-label={label}>
        {value}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={17} />
      </button>
    </div>
  );
}
export function HouseholdConfigurator({
  state,
  update,
}: {
  state: KitState;
  update: (p: Partial<KitState>) => void;
}) {
  return (
    <section
      id="builder"
      className={styles.configurator}
      aria-labelledby="builder-title"
    >
      <div className={styles.sectionIntro}>
        <div>
          <span className={styles.eyebrow}>MAKE IT YOURS</span>
          <h2 id="builder-title">A kit that fits your life.</h2>
          <p>Start with your household. We’ll work out the essentials.</p>
        </div>
      </div>
      <div className={styles.configFields}>
        <div>
          <label>How many people are you preparing for?</label>
          <div className={styles.fieldBottom}>
            <Stepper
              label="household size"
              value={state.people}
              max={50}
              onChange={(people) => update({ people })}
            />
            <span>{state.people === 1 ? "person" : "people"}</span>
          </div>
        </div>
        <div>
          <label>How many days do you want supplies for?</label>
          <div
            className={styles.days}
            role="group"
            aria-label="Preparedness duration"
          >
            {([3, 7, 14] as const).map((days) => (
              <button
                key={days}
                aria-pressed={state.days === days}
                onClick={() => update({ days })}
              >
                {days} days{days === 3 && <small>A good start</small>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <details className={styles.personalizeDetails}>
        <summary>Personalize your kit</summary>
        <div className={styles.personalizeBody}>
          <div className={styles.modeToggle} aria-label="Kit type" role="group">
            <button aria-pressed={state.mode === "go-bag"} onClick={() => update({ mode: "go-bag" })}>
              <Backpack size={16} /> Go-Bag
            </button>
            <button aria-pressed={state.mode === "stay-home"} onClick={() => update({ mode: "stay-home" })}>
              <House size={16} /> Stay-Home Kit
            </button>
          </div>
          <div className={styles.petConfig}>
            <label className={styles.petToggle}>
              <PawPrint size={21} />
              <span>I have pets<small>Include their essentials, too.</small></span>
              <input type="checkbox" checked={state.pets} onChange={(e) => update({ pets: e.target.checked })} />
              <span className={styles.switch} aria-hidden="true" />
            </label>
            {state.pets && <div className={styles.fieldBottom}>
              <Stepper label="number of pets" value={state.petCount} max={20} onChange={(petCount) => update({ petCount })} />
              <span>{state.petCount === 1 ? "pet" : "pets"}</span>
            </div>}
          </div>
        </div>
      </details>
      <div className={styles.waterNote}>
        <Droplets size={20} />
        <p>
          <strong>
            {state.people} {state.people === 1 ? "person" : "people"} ×{" "}
            {state.days} days = {state.people * state.days} gallons minimum
          </strong>
          <span>
            Ready.gov recommends approximately 1 gallon per person per day for
            drinking and sanitation.{" "}
            <a
              href="https://www.ready.gov/water"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn why <ArrowUpRight size={12} />
            </a>
          </span>
        </p>
      </div>
      <p className={styles.modeNote}>
        <Info size={14} />
        {state.mode === "go-bag"
          ? "Keep portable essentials ready to carry. Store your full water and food reserves separately where needed; the total above is not a suggested backpack load."
          : "Plan accessible storage for larger water and food reserves. Keep a portable bag ready in case you need to leave."}{" "}
        Quantities are starting estimates; adjust to your needs.
      </p>
    </section>
  );
}
export function PreparednessProgress({ state }: { state: KitState }) {
  const s = getSummary(state);
  return (
    <div className={styles.progressCard}>
      <div className={styles.progressTop} aria-live="polite">
        <span className={styles.progressIcon}>
          <Backpack size={24} />
        </span>
        <div>
          <h3>
            Your kit is <strong>{s.percent}%</strong> ready
          </h3>
          <p>
            {s.packed} / {s.items.length} essentials packed
          </p>
        </div>
        <span className={styles.status}>{progressLabel(s.percent)}</span>
      </div>
      <progress max={100} value={s.percent} aria-label="Essentials packed" />
      <p className={styles.progressEncouragement}>
        {s.percent === 100
          ? "Your listed essentials are packed. Review personal needs and local guidance, too."
          : "Every item is a step forward. Start with what you already have."}
      </p>
    </div>
  );
}
export function AmazonButton({
  item,
  compact = false,
}: {
  item: EmergencyItem;
  compact?: boolean;
}) {
  return item.searchTerm ? (
    <a
      href={getAmazonSearchUrl(item.searchTerm)}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={compact ? styles.amazonCompact : styles.amazon}
      aria-label={`Buy ${item.name} on Amazon`}
    >
      {compact ? "Amazon" : "Buy on Amazon"}
      <ArrowUpRight size={15} />
    </a>
  ) : (
    <span className={styles.noPurchase}>
      {item.id.startsWith("custom-")
        ? "Find a suitable source"
        : "Gather your own copy"}
    </span>
  );
}
export function QuantityBadge({
  item,
  state,
}: {
  item: EmergencyItem;
  state: KitState;
}) {
  return (
    <span className={styles.quantity}>
      {quantityLabel(item, itemQuantity(item, state))}
    </span>
  );
}
export function EmergencyItemCard({
  item,
  state,
  toggle,
}: {
  item: EmergencyItem;
  state: KitState;
  toggle: (item: EmergencyItem) => void;
}) {
  const packed = isPacked(item, state);
  const quantity = missingQuantity(item, state);
  if (state.compact)
    return (
      <article className={styles.compactCard} data-item-id={item.id}>
        <div className={styles.compactHeading}>
          <label>
            <input
              type="checkbox"
              checked={packed}
              onChange={() => toggle(item)}
              aria-label={`Full quantity packed or stored: ${item.name}`}
            />
            <strong>{item.name}</strong>
          </label>
          <QuantityBadge item={item} state={state} />
        </div>
        <p>
          {quantity} still needed · {state.completed[item.id] ?? 0} packed /
          stored
          {state.locations[item.id] ? ` · ${state.locations[item.id]}` : ""}
        </p>
        {quantity > 0 && <AmazonButton item={item} compact />}
        <details className={styles.planningDetails}>
          <summary>Details & quantities for {item.name}</summary>
          <p>{item.description}</p>
          <p>{item.why}</p>
          <ItemPlanning item={item} />
        </details>
      </article>
    );
  return (
    <article
      className={`${styles.itemCard} ${packed ? styles.packedCard : ""}`}
      data-item-id={item.id}
    >
      <div className={styles.itemHeading}>
        <span className={styles.itemIcon}>
          <ItemIcon name={item.icon} />
        </span>
        <QuantityBadge item={item} state={state} />
      </div>
      <h4>{item.name}</h4>
      <p className={styles.itemDescription}>{item.description}</p>
      <details className={styles.why}>
        <summary>
          Why do I need this? <ChevronRight size={14} />
        </summary>
        <p>
          {item.why}{" "}
          {item.readyGovUrl && (
            <a
              href={item.readyGovUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn why at Ready.gov <ArrowUpRight size={12} />
            </a>
          )}
        </p>
      </details>
      <details className={styles.planningDetails}>
        <summary>Details & storage</summary>
        <ItemPlanning item={item} />
      </details>
      <div className={styles.itemBuy}>
        <span>
          {item.estimatedPriceMin !== undefined ? (
            <>
              <strong>
                {priceRange(
                  item.estimatedPriceMin * quantity,
                  item.estimatedPriceMax! * quantity,
                )}
              </strong>
              <small>Est. for quantity still needed</small>
            </>
          ) : (
            <small>Cost varies · not included in estimate</small>
          )}
        </span>
        {quantity > 0 ? (
          <AmazonButton item={item} />
        ) : (
          <span className={styles.noPurchase}>Full quantity owned</span>
        )}
      </div>
      <label className={styles.owned}>
        <input
          type="checkbox"
          checked={packed}
          onChange={() => toggle(item)}
          aria-label={`Full quantity packed or stored: ${item.name}`}
        />
        <span>
          {packed ? "Packed / stored" : "Mark full quantity packed / stored"}
        </span>
        {packed && <Check size={16} aria-hidden="true" />}
      </label>
      {!packed && (state.completed[item.id] ?? 0) > 0 && (
        <p className={styles.quantityChanged}>
          Some supplies are packed. Add the rest when ready.
        </p>
      )}
    </article>
  );
}
export function CategorySection({
  category,
  items,
  state,
  toggle,
}: {
  category: string;
  items: EmergencyItem[];
  state: KitState;
  toggle: (item: EmergencyItem) => void;
}) {
  return (
    <section className={styles.categorySection} aria-label={category}>
      <div className={styles.categoryHeading}>
        <ItemIcon name={items[0].icon} size={18} />
        <h3>{category}</h3>
        <span>
          {items.filter((i) => isPacked(i, state)).length} / {items.length} packed
        </span>
      </div>
      <div className={state.compact ? styles.compactGrid : styles.itemGrid}>
        {items.map((item) => (
          <EmergencyItemCard key={item.id} item={item} state={state} toggle={toggle} />
        ))}
      </div>
    </section>
  );
}
export function CostSummary({
  state,
  onShop,
  onReset,
}: {
  state: KitState;
  onShop: () => void;
  onReset: () => void;
}) {
  const s = getSummary(state);
  return (
    <aside className={styles.sidebar} aria-label="Your kit summary">
      <div className={styles.summaryCard}>
        <div className={styles.summaryTitle}>
          <Backpack size={23} />
          <h3>Your Kit</h3>
          <span>PERSONALIZED</span>
        </div>
        <dl>
          <div>
            <dt>
              <Users size={16} />
              Household
            </dt>
            <dd>
              {state.people} {state.people === 1 ? "person" : "people"}
            </dd>
          </div>
          <div>
            <dt>
              <House size={16} />
              Prepared for
            </dt>
            <dd>{state.days} days</dd>
          </div>
          <div>
            <dt>
              <Droplets size={16} />
              Water
            </dt>
            <dd>{s.water} gallons</dd>
          </div>
          {state.pets && (
            <div>
              <dt>
                <PawPrint size={16} />
                Pets
              </dt>
              <dd>{state.petCount}</dd>
            </div>
          )}
          <div>
            <dt>
              <CheckCheck size={16} />
              Packed
            </dt>
            <dd>
              {s.packed} / {s.items.length}
            </dd>
          </div>
          <div>
            <dt>Items to buy</dt>
            <dd>{s.missing.length}</dd>
          </div>
        </dl>
        <div className={styles.total}>
          <span>Estimated remaining kit cost</span>
          <strong>{priceRange(s.min, s.max)}</strong>
          <small>Estimated cost — actual retailer prices may vary.</small>
        </div>
        <button className={styles.primary} onClick={onShop}>
          <ShoppingBag size={17} />
          {s.missing.length ? "Shop Missing Items" : "View Shopping List"}
          <ChevronRight size={17} />
        </button>
        <button className={styles.printButton} onClick={() => window.print()}>
          <Printer size={16} />
          Print My Emergency Kit
        </button>
        <p className={styles.costCaveat}>
          USD estimates cover priced supplies. Unpriced custom items, personal essentials, pet water,
          shipping, and taxes are excluded. Combined radios may lower your cost.
        </p>
      </div>
      <div className={styles.reassurance}>
        <Leaf size={23} />
        <h4>You may have more than you think.</h4>
        <p>
          Check your cupboards, drawers, and everyday bag first. Getting
          prepared doesn’t have to mean buying everything new.
        </p>
      </div>
      <button className={styles.resetButton} onClick={onReset}>
        <RotateCcw size={14} /> Reset checklist
      </button>
    </aside>
  );
}
export function AffiliateDisclosure() {
  return AMAZON_ASSOCIATE_TAG ? (
    <p className={styles.affiliate}>
      As an Amazon Associate, this site may earn from qualifying purchases.
    </p>
  ) : null;
}
