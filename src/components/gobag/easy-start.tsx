"use client";
import { ArrowRight } from "lucide-react";
import type { useKit } from "@/lib/gobag/use-kit";
import type { KitState } from "@/lib/gobag/kit";
import { concerns } from "@/data/gobag-preparation";
import { suggestedExclusions } from "@/lib/gobag/preparation";
import { Stepper } from "./kit-parts";
import s from "./guide.module.css";

type Props = { kit: ReturnType<typeof useKit>; onDone: () => void };
export function EasyStart({ kit, onDone }: Props) {
  const { state, update } = kit;
  const es = state.guideLanguage === "es";
  return <section className={s.easyStart} lang={es ? "es" : "en"} aria-labelledby="easy-start-title">
    <div className={s.sectionHeading}>
      <h2 id="easy-start-title">{es ? "¿Para quién preparas?" : "Who are you preparing for?"}</h2>
      <label className={s.language}><span>{es ? "Idioma de la guía" : "Setup language"}</span>
        <select value={state.guideLanguage} onChange={e => update({ guideLanguage: e.target.value as KitState["guideLanguage"] })}>
          <option value="en">English</option><option value="es">Español</option>
        </select>
      </label>
    </div>
    <p>{es ? "Calcularemos las cantidades de tu lista." : "We’ll work out how much you need."}</p>
    <div className={s.setupGrid}>
      <div><span>{es ? "Personas" : "People"}</span><Stepper label={es ? "personas" : "people"} value={state.people} max={50} onChange={people => update({ people })} /></div>
      <label className={s.field}>{es ? "Días" : "Days of supplies"}<select value={state.days} onChange={e => update({ days: Number(e.target.value) as KitState["days"] })}>{[3, 7, 14].map(d => <option key={d} value={d}>{d} {es ? "días" : "days"}</option>)}</select></label>
      <div><label className={s.checkLabel}><input type="checkbox" checked={state.pets} onChange={e => update({ pets: e.target.checked })} />{es ? "Tengo mascotas" : "Include pets"}</label>{state.pets && <Stepper label={es ? "mascotas" : "pets"} value={state.petCount} max={20} onChange={petCount => update({ petCount })} />}</div>
    </div>
    <details className={s.setupOptional}>
      <summary>{es ? "Mi vivienda (opcional)" : "Living situation (optional)"}</summary>
      <label className={s.field}><span className={s.srOnly}>{es ? "Mi vivienda" : "Living situation"}</span><select value={state.livingSituation} onChange={e => update({ livingSituation: e.target.value as KitState["livingSituation"] })}>
        <option value="">{es ? "Prefiero no responder" : "Prefer not to say"}</option><option value="rent">{es ? "Alquilo mi vivienda" : "I rent"}</option><option value="own">{es ? "Soy propietario" : "I own my home"}</option><option value="other">{es ? "Otra situación" : "Other / shared housing"}</option>
      </select></label>
      {state.livingSituation && <p>{state.livingSituation === "rent" ? (es ? "Acuerda con el propietario quién revisa los desagües y las alarmas." : "Check with your landlord about shared drains, alarms, and exits.") : (es ? "Acuerda quién revisa la vivienda y dónde guardar los suministros." : "Agree who handles home checks and where supplies will go.")}</p>}
    </details>
    <div className={s.setupGrid}>
      <label className={s.field}>{es ? "¿Tienes acceso a un auto?" : "Car access"}<select value={state.carAccess} onChange={e => update({ carAccess: e.target.value as KitState["carAccess"] })}><option value="">{es ? "Sin responder" : "Not specified"}</option><option value="yes">{es ? "Sí" : "Yes"}</option><option value="no">{es ? "No" : "No"}</option></select></label>
      <label className={s.field}>{es ? "¿Te encargas del exterior de la vivienda?" : "Responsible for outdoor home checks?"}<select value={state.homeResponsibilities} onChange={e => update({ homeResponsibilities: e.target.value as KitState["homeResponsibilities"] })}><option value="">{es ? "Sin responder" : "Not specified"}</option><option value="yes">{es ? "Sí" : "Yes"}</option><option value="no">{es ? "No" : "No"}</option></select></label>
    </div>
    <fieldset className={s.choices}><legend>{es ? "Temas de interés (opcional; en inglés)" : "Relevant concerns (optional)"}</legend><div>{concerns.map(c => <label key={c}><input type="checkbox" checked={state.concerns.includes(c)} onChange={e => update({ concerns: e.target.checked ? [...state.concerns, c] : state.concerns.filter(v => v !== c) })} />{c}</label>)}</div></fieldset>
    <p className={s.note}>{es ? "Puedes editar las respuestas y restaurar tareas en cualquier momento." : "You can edit answers and restore excluded tasks at any time."}</p>
    <button className={s.primary} onClick={() => { update({ setupComplete: true, notApplicable: [...new Set([...state.notApplicable, ...suggestedExclusions(state)])], personalApplicable: [...new Set([...state.personalApplicable, ...(state.pets ? ["personal-pet-personal"] : []), ...(state.needs.includes("infants") ? ["personal-infant"] : [])])] }); onDone(); }}>{es ? "Ver mi lista" : state.setupComplete ? "Save changes" : "Show my checklist"}<ArrowRight size={18} aria-hidden="true" /></button>
    {!state.setupComplete && <button className={s.textButton} onClick={() => { update({ setupComplete: true }); onDone(); }}>{es ? "Omitir por ahora" : "Skip for now"}</button>}
    {es && <p className={s.note}>La lista detallada y los ajustes están en inglés. <a href="https://www.ready.gov/es" target="_blank" rel="noopener noreferrer">Ayuda en español ↗</a></p>}
  </section>;
}
