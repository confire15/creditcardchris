"use client";
import { useState } from "react";
import { ArrowRight, Users, Check } from "lucide-react";
import type { useKit } from "@/lib/gobag/use-kit";
import type { KitState } from "@/lib/gobag/kit";
import { Stepper } from "./kit-parts";
import s from "./guide.module.css";

type Props = { kit: ReturnType<typeof useKit>; onInventory: () => void };
export function EasyStart({ kit, onInventory }: Props) {
  const { state, update } = kit;
  const es = state.guideLanguage === "es";
  const [editing, setEditing] = useState(false);
  const [started, setStarted] = useState(false);
  const open = editing || !state.setupComplete;
  return <section className={s.easyStart} lang={es ? "es" : "en"} aria-labelledby="easy-start-title">
    <div className={s.sectionHeading}>
      <h2 id="easy-start-title"><Users size={22} aria-hidden="true" /> {es ? "Prepara a tu familia, paso a paso" : "Get your family ready, one step at a time"}</h2>
      <label className={s.language}> {es ? "Idioma de la guía" : "Quick guide language"}
        <select value={state.guideLanguage} onChange={e => update({ guideLanguage: e.target.value as KitState["guideLanguage"] })}>
          <option value="en">English</option><option value="es">Español</option>
        </select>
      </label>
    </div>
    {open ? <>
      <p>{es ? "Responde estas preguntas para calcular tus suministros. Puedes cambiarlas después." : "Answer a few questions to size your supplies. You can change these later."}</p>
      {!started && !editing ? <button className={s.primary} onClick={() => setStarted(true)}>{es ? "Crear el plan de mi familia" : "Make my family’s plan"}<ArrowRight size={18} aria-hidden="true" /></button> : <>
        <div className={s.setupGrid}>
          <div><span>{es ? "¿Cuántas personas?" : "How many people?"}</span><Stepper label={es ? "personas" : "people"} value={state.people} max={50} onChange={people => update({ people })} /></div>
          <label className={s.field}>{es ? "¿Para cuántos días?" : "How many days?"}<select value={state.days} onChange={e => update({ days: Number(e.target.value) as KitState["days"] })}>{[3, 7, 14].map(d => <option key={d} value={d}>{d} {es ? "días" : "days"}</option>)}</select></label>
          <div><label className={s.checkLabel}><input type="checkbox" checked={state.pets} onChange={e => update({ pets: e.target.checked })} />{es ? "Tengo mascotas" : "I have pets"}</label>{state.pets && <Stepper label={es ? "mascotas" : "pets"} value={state.petCount} max={20} onChange={petCount => update({ petCount })} />}</div>
        </div>
        <label className={s.field}>{es ? "¿Dónde vives? (opcional)" : "What’s your living situation? (optional)"}<select value={state.livingSituation} onChange={e => update({ livingSituation: e.target.value as KitState["livingSituation"] })}>
          <option value="">{es ? "Prefiero no responder" : "Prefer not to say"}</option><option value="rent">{es ? "Alquilo mi vivienda" : "I rent my home"}</option><option value="own">{es ? "Soy propietario" : "I own my home"}</option><option value="other">{es ? "Otra situación / vivienda compartida" : "Another situation / shared housing"}</option>
        </select></label>
        <p>{es ? "Incluye tus medicamentos y necesidades personales. Las cantidades son estimaciones iniciales." : "Include medications and personal support needs. Supply quantities are starting estimates."}</p>
        <button className={s.primary} onClick={() => { update({ setupComplete: true }); setEditing(false); }}>{es ? "Ver mi lista" : "Show my checklist"}<Check size={18} aria-hidden="true" /></button>
      </>}
    </> : <>
      <p>{es ? `${state.people} personas · ${state.days} días${state.pets ? ` · ${state.petCount} mascotas` : ""}. Tu plan se guarda en este dispositivo.` : `${state.people} ${state.people === 1 ? "person" : "people"} · ${state.days} days${state.pets ? ` · ${state.petCount} pets` : ""}. Your plan saves on this device.`}</p>
      <button className={s.textButton} onClick={() => { setEditing(true); setStarted(true); }}>{es ? "Cambiar respuestas" : "Change answers"}</button>
    </>}
    {state.livingSituation && <p className={s.livingTip}>{state.livingSituation === "rent" ? (es ? "Si alquilas: pregunta al propietario quién revisa los desagües y las alarmas, y dónde están las salidas." : "Renting? Ask your landlord who checks shared drains and alarms, and where the exits are.") : state.livingSituation === "own" ? (es ? "Si eres propietario: incluye las revisiones de tu vivienda en el plan. Pide ayuda profesional cuando haga falta." : "Own your home? Include home checks in your plan and arrange professional help where needed.") : (es ? "Acuerda con las personas que viven contigo quién hace cada tarea y dónde guardar los suministros." : "Agree with the people you live with on who handles each task and where supplies will go.")}</p>}
    <div className={s.startOwned}>
      <strong>{es ? "Empieza con lo que ya tienes" : "Start with what you already own"}</strong>
      <p>{es ? "Revisa la cocina, las linternas y los cargadores antes de comprar. Anota lo que tienes; tenerlo no significa que ya esté empacado." : "Check your cupboards, flashlights, and chargers before buying anything. Record what you have; owning it doesn’t mean it’s packed."}</p>
      <button className={s.outline} onClick={onInventory}>{es ? "Revisar lo que tengo" : "Check what I have"}<ArrowRight size={18} aria-hidden="true" /></button>
    </div>
    {es && <p className={s.note}>Esta guía inicial está en español. La lista detallada, los ajustes y la copia impresa están en inglés. <a href="https://www.ready.gov/es" target="_blank" rel="noopener noreferrer">Preparación en español ↗</a></p>}
  </section>;
}
