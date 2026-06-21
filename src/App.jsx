import { useReducer, useState, useMemo, useEffect, useRef, forwardRef } from "react";
import {
  LayoutGrid, Table2, Search, X, Plus, Ruler, ExternalLink,
  BarChart, Folder, AlertTriangle, Clock, User, Building2, ShieldAlert,
  Gavel, Pencil, Trash2, Inbox, Check, Calendar, MessageSquare, Download,
  ChevronUp, ChevronDown, ChevronsUpDown, Copy, TrendingUp, TrendingDown,
  Compass, Lock, ArrowDownRight, ArrowUpRight, Flag, UserPlus,
  Phone, History, Briefcase, Archive, Send, Bell,
} from "lucide-react";

/* ============================================================
   ELEKTA BACHECA OS — v8 (Automazione e Fluidità)
   ============================================================ */

const eur = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const eurMq = (n) => `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(n || 0)} €/mq`;
const pct = (n) => `${n > 0 ? "+" : ""}${(n || 0).toFixed(1)}%`;
const oggi = () => new Date().toLocaleDateString("it-IT");
const oggiISO = () => new Date().toISOString().slice(0, 10);
const toNum = (v) => { const n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")); return isNaN(n) ? 0 : n; };

const eurK = (n) => {
  const v = toNum(n);
  if (!v) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M €`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k €`;
  return `${v} €`;
};
const eurKSigned = (n) => {
  const v = toNum(n);
  if (!v) return "—";
  const sign = v >= 0 ? "+" : "";
  if (Math.abs(v) >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(1)}M €`;
  if (Math.abs(v) >= 1_000) return `${sign}${Math.round(v / 1_000)}k €`;
  return `${sign}${v} €`;
};
const mqK = (n) => {
  const v = toNum(n);
  if (!v) return "—";
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k mq`;
  return `${v} mq`;
};

/* ---------- HELPERS ---------- */
const mesiTrascorsi = (d) => {
  if (!d) return 0;
  const s = new Date(d), n = new Date();
  let m = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
  if (n.getDate() < s.getDate()) m--;
  return Math.max(0, m);
};
const giorniTrascorsiISO = (isoDate) => {
  if (!isoDate) return 0;
  const start = new Date(isoDate);
  const diff = Math.floor((new Date().setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / 86400000);
  return Math.max(0, diff);
};
const giorniTrascorsi = (dataIT) => {
  if (!dataIT) return 0;
  const [gg, mm, aaaa] = dataIT.split("/").map(Number);
  if (!gg || !mm || !aaaa) return 0;
  const start = new Date(aaaa, mm - 1, gg);
  return Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / 86400000));
};
const iniziali = (nome) => {
  if (!nome || !nome.trim()) return "—";
  const p = nome.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};
const formatPhone = (v) => {
  const d = v.replace(/\D/g, "");
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 13)}`;
};

/* ============================================================ */
/*  FEATURE 1: LOCALSTORAGE PERSISTENCE                         */
/* ============================================================ */
const LS_DEALS = "elekta_v8_deals";
const LS_DISC  = "elekta_v8_disc";

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return fallback;
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
}

/* ---------- COSTANTI ---------- */
const STATI = ["Stand-by", "Attivata", "Abort"];
const STATO_STYLE = {
  Attivata:   { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  "Stand-by": { dot: "bg-amber-500",   chip: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  Abort:      { dot: "bg-red-500",     chip: "bg-red-50 text-red-700 ring-red-600/20" },
};
const SUBSTATI = {
  "Stand-by": ["Da valutare", "In attesa info", "Prezzo da rinegoziare"],
  Attivata:   ["Sopralluogo da fissare", "In attesa documenti", "Proposta inviata", "Due Diligence"],
  Abort:      ["Prezzo fuori mercato", "Asta persa", "Problemi urbanistici", "Ritirato dal venditore"],
};
const TIPOLOGIE  = ["Terreno Edificabile", "Frazionamento", "Riqualificazione", "Cambio d'uso", "NPL / Asta"];
const VENDITORI  = ["Privato", "Impresa"];
const RUOLI_INS  = ["Consulente ELEKTA", "Agente Immobiliare"];
const PRIORITA   = ["Alta", "Media", "Bassa"];
const RATINGS_ZONA = ["Alta richiesta", "Domanda stabile", "In fase di maturazione", "Stagnante"];
const TIPO_DISC  = ["Residenziale Nuovo", "Residenziale Ristrutturato"];
const GEO_SUGGESTIONS = {
  Milano:   ["Centrale / Loreto","Navigli / Bocconi","Porta Venezia","Città Studi","Bovisa / Dergano","Isola / Garibaldi","Sempione / Fiera","Famagosta / Barona","Lambrate / Forlanini","Bicocca / Niguarda","NoLo / Pasteur","Vigentino / Chiaravalle"],
  Torino:   ["Centro","Crocetta","San Salvario","Vanchiglia","Cit Turin","Aurora","San Donato","Borgo Po / Cavoretto","Mirafiori","Santa Rita","Barriera di Milano"],
  Roma:     ["Centro Storico","Prati","Trastevere","Parioli","EUR / Mostacciano","Testaccio","Ostiense","Tiburtina","Nomentana","Appia","Flaminio","Trionfale"],
  Bologna:  ["Centro","Navile","Porto / Saragozza","San Vitale","Savena","Santo Stefano","Reno","Borgo Panigale"],
  Napoli:   ["Centro Storico","Posillipo","Vomero","Chiaia","Fuorigrotta","Bagnoli","Secondigliano","Ponticelli"],
  Piacenza: ["Centro Storico","Besurica","Farnesiana","Veggioletta","Roma / San Lazzaro","Montale","Galleana","Mucinasso"],
};
const ALL_CITIES = Object.keys(GEO_SUGGESTIONS);

/* ============================================================ */
/*  STORE — DEALS                                               */
/* ============================================================ */
const DEAL_INIT = { deals: [], seq: 1 };
function dealReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const id = `NDG-${String(state.seq).padStart(3, "0")}`;
      return { deals: [{ ...action.payload, id, dataCaricamento: oggi(), ultimaModifica: oggiISO(), noteLog: [] }, ...state.deals], seq: state.seq + 1 };
    }
    case "UPDATE":
      return { ...state, deals: state.deals.map((d) => d.id === action.payload.id ? { ...d, ...action.payload, ultimaModifica: oggiISO() } : d) };
    case "DELETE":
      return { ...state, deals: state.deals.filter((d) => d.id !== action.id) };
    case "MOVE":
      return { ...state, deals: state.deals.map((d) => d.id === action.id ? { ...d, stato: action.stato, subStato: (SUBSTATI[action.stato] || [])[0] || "", ultimaModifica: oggiISO() } : d) };
    case "ABORT_WITH_REASON":
      return { ...state, deals: state.deals.map((d) => d.id === action.id ? { ...d, stato: "Abort", subStato: action.motivo || SUBSTATI.Abort[0], ultimaModifica: oggiISO() } : d) };
    case "ADD_NOTE": {
      const nota = { testo: action.testo, data: oggi(), iso: oggiISO() };
      return { ...state, deals: state.deals.map((d) => d.id === action.id ? { ...d, noteLog: [nota, ...(d.noteLog || [])], ultimaModifica: oggiISO() } : d) };
    }
    default: return state;
  }
}
const DEAL_EMPTY = {
  nomeInseritore: "", cognomeInseritore: "", ruoloInseritore: RUOLI_INS[0],
  progetto: "", indirizzo: "", citta: "", zona: "", venditore: VENDITORI[0], mq: "",
  linkAnnuncio: "", linkOnbild: "", linkDrive: "", contattoImmobiliare: "",
  stato: "Stand-by", subStato: SUBSTATI["Stand-by"][0], priorita: PRIORITA[1], owner: "",
  dataInizioCommercializzazione: "",
  roiOnbild: "", roiPostDiscovery: "",
  cifraProposta: "", dataProposta: "",
  prezzoTotaleAnnuncio: "",
  prezzoMqDiscovery: "",
  tipologia: TIPOLOGIE[0],
  vincoli: "", ipoteche: "", noteCondoni: "",
  noteLog: [],
};
const DEAL_NUM = ["mq", "roiOnbild", "roiPostDiscovery", "cifraProposta", "prezzoTotaleAnnuncio", "prezzoMqDiscovery"];

/* ============================================================ */
/*  STORE — DISCOVERY                                           */
/* ============================================================ */
const DISC_INIT = { zones: [], seq: 1 };
function discReducer(state, action) {
  switch (action.type) {
    case "ADD_ZONE": { const id = `DZ-${String(state.seq).padStart(3, "0")}`; return { zones: [{ ...action.payload, id, cantieri: [] }, ...state.zones], seq: state.seq + 1 }; }
    case "UPDATE_ZONE": return { ...state, zones: state.zones.map((z) => z.id === action.payload.id ? { ...z, ...action.payload } : z) };
    case "DELETE_ZONE": return { ...state, zones: state.zones.filter((z) => z.id !== action.id) };
    case "ADD_CANTIERE": return { ...state, zones: state.zones.map((z) => z.id === action.zoneId ? { ...z, cantieri: [...z.cantieri, action.payload] } : z) };
    case "DELETE_CANTIERE": return { ...state, zones: state.zones.map((z) => z.id === action.zoneId ? { ...z, cantieri: z.cantieri.filter((_, i) => i !== action.idx) } : z) };
    default: return state;
  }
}
const DISC_EMPTY = { citta: "", macrozona: "", tipologia: TIPO_DISC[0], rating: RATINGS_ZONA[0], tts: "", prezzoObiettivo: "" };
const CANT_EMPTY = { nome: "", indirizzo: "", locali: "", mq: "", asking: "", closing: "" };

/* ============================================================ */
/*  ATOMI UI                                                    */
/* ============================================================ */
function StatoChip({ stato }) {
  const s = STATO_STYLE[stato];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{stato}</span>;
}
function PrioritaChip({ p }) {
  const c = p === "Alta" ? "bg-red-50 text-red-700 ring-red-600/20" : p === "Media" ? "bg-amber-50 text-amber-700 ring-amber-600/20" : "bg-neutral-100 text-neutral-600 ring-neutral-300";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${c}`}><Flag className="h-2.5 w-2.5" />{p}</span>;
}
function RoiTag({ roi, size = "sm" }) {
  const pos = roi >= 0, big = size === "lg";
  return <span className={`inline-flex items-baseline gap-0.5 font-semibold tabular-nums ${pos ? "text-emerald-600" : "text-red-600"} ${big ? "text-3xl" : "text-sm"}`}>{pos ? "+" : ""}{roi.toFixed(1)}<span className={big ? "text-base font-medium" : "text-xs"}>%</span></span>;
}
function MesiFlag({ mesi }) {
  const hot = mesi > 12;
  return <span className={`inline-flex items-center gap-1 tabular-nums text-sm ${hot ? "text-amber-600 font-semibold" : "text-neutral-500"}`}>{hot && <AlertTriangle className="h-3.5 w-3.5" />}{mesi}m</span>;
}
function RedFlags({ deal }) {
  const f = [];
  if (deal.ipoteche?.trim()) f.push({ k: "l", label: "Legale", icon: ShieldAlert });
  if (deal.vincoli?.trim())  f.push({ k: "u", label: "Urbanistico", icon: Gavel });
  if (!f.length) return null;
  return <div className="flex flex-wrap gap-1">{f.map((x) => <span key={x.k} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-inset ring-red-200"><x.icon className="h-2.5 w-2.5" />{x.label}</span>)}</div>;
}
function NewBadge() {
  return <span className="relative flex h-2.5 w-2.5" title="Oggi"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" /></span>;
}
function Avatar({ nome, size = "sm" }) {
  const big = size === "md";
  return <span title={nome || "Non assegnato"} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-800 font-semibold text-white ${big ? "h-7 w-7 text-[11px]" : "h-5 w-5 text-[9px]"}`}>{iniziali(nome)}</span>;
}
function StalloBadge({ deal }) {
  if (deal.stato !== "Stand-by") return null;
  const giorni = giorniTrascorsi(deal.dataCaricamento);
  if (giorni <= 7) return null;
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-inset ring-red-200"><Clock className="h-2.5 w-2.5" />In stallo {giorni}g</span>;
}
function AggiornamentoBadge({ deal }) {
  if (deal.stato !== "Stand-by") return null;
  const giorni = deal.ultimaModifica ? giorniTrascorsiISO(deal.ultimaModifica) : giorniTrascorsi(deal.dataCaricamento);
  if (giorni <= 15) return null;
  return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 ring-1 ring-inset ring-yellow-300"><AlertTriangle className="h-2.5 w-2.5" />Da aggiornare</span>;
}

/* ---------- LINK TRINITY ---------- */
const LINK_DEFS = [
  { key: "linkAnnuncio", label: "Annuncio",      icon: ExternalLink, activeClass: "bg-blue-600 hover:bg-blue-700" },
  { key: "linkOnbild",   label: "ONBILD",         icon: BarChart,     activeClass: "bg-emerald-700 hover:bg-emerald-800" },
  { key: "linkDrive",    label: "Drive",          icon: Folder,       activeClass: "bg-amber-600 hover:bg-amber-700" },
];
function LinkTrinity({ deal, size = "md", showEmpty = false }) {
  const big = size === "lg";
  const base = `flex flex-col items-center justify-center gap-1 rounded-md font-medium transition ${big ? "px-3 py-3 text-sm" : "px-2 py-2 text-xs"}`;
  const links = LINK_DEFS.filter(({ key }) => showEmpty || deal[key]);
  if (!links.length) return null;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${showEmpty ? 3 : links.length}, minmax(0, 1fr))` }}>
      {showEmpty
        ? LINK_DEFS.map(({ key, label, icon: Icon, activeClass }) => {
            const href = deal[key];
            return href
              ? <a key={key} href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={`${base} text-white ${activeClass}`}><Icon className={big ? "h-4 w-4" : "h-3.5 w-3.5"} />{label}</a>
              : <span key={key} className={`${base} cursor-not-allowed border border-dashed border-neutral-200 bg-neutral-50 text-neutral-300`}><Lock className={big ? "h-4 w-4" : "h-3.5 w-3.5"} />{label}</span>;
          })
        : links.map(({ key, label, icon: Icon, activeClass }) => (
            <a key={key} href={deal[key]} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={`${base} text-white ${activeClass}`}><Icon className={big ? "h-4 w-4" : "h-3.5 w-3.5"} />{label}</a>
          ))
      }
    </div>
  );
}

/* ---------- FORM FIELDS ---------- */
function Label({ children, hint }) {
  return <label className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-neutral-500"><span>{children}</span>{hint && <span className="font-normal normal-case text-neutral-400">{hint}</span>}</label>;
}
const inputCls = (err) => `w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition focus:outline-none focus:ring-2 focus:ring-offset-0 ${err ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/15"}`;

const TextField = forwardRef(function TextField({ label, hint, error, cap, ...p }, ref) {
  return <div><Label hint={hint}>{label}</Label><input ref={ref} {...p} className={inputCls(error) + (cap ? " capitalize" : "")} />{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>;
});
function NumField({ label, hint, error, suffix, ...p }) {
  return <div><Label hint={hint}>{label}</Label><div className="relative"><input inputMode="decimal" {...p} className={inputCls(error) + " text-right tabular-nums" + (suffix ? " pr-12" : "")} />{suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">{suffix}</span>}</div>{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>;
}
function NumFieldFormatted({ label, hint, error, suffix, value, onChange, placeholder }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    const num = String(value || "").replace(/\./g, "").replace(/[^0-9]/g, "");
    setDisplay(num ? new Intl.NumberFormat("it-IT").format(Number(num)) : "");
  }, [value]);
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
    setDisplay(raw ? new Intl.NumberFormat("it-IT").format(Number(raw)) : "");
    onChange({ target: { value: raw } });
  };
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      <div className="relative">
        <input inputMode="numeric" value={display} onChange={handleChange} placeholder={placeholder || "0"} className={inputCls(error) + " text-right tabular-nums" + (suffix ? " pr-12" : "")} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">{suffix}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
function ComboField({ label, hint, error, value, onChange, suggestions, placeholder, id }) {
  const listId = `list-${id || label}`;
  return <div><Label hint={hint}>{label}</Label><div className="relative"><input id={id} list={listId} value={value} onChange={onChange} placeholder={placeholder || "Scrivi o seleziona…"} className={inputCls(error)} autoComplete="off" /><datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist></div>{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>;
}
function SelectField({ label, options, ...p }) {
  return <div><Label>{label}</Label><select {...p} className={inputCls(false) + " cursor-pointer"}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
}
function DateField({ label, hint, ...p }) {
  return <div><Label hint={hint}>{label}</Label><input type="date" {...p} className={inputCls(false) + " [color-scheme:light] tabular-nums text-right"} /></div>;
}
function UrlField({ label, hint, error, ...p }) {
  return <div><Label hint={hint}>{label}</Label><input type="url" {...p} className={inputCls(error)} />{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>;
}
function TextareaField({ label, hint, rows = 3, ...p }) {
  return <div><Label hint={hint}>{label}</Label><textarea rows={rows} {...p} className={inputCls(false) + " resize-none"} /></div>;
}
function CollapsibleFieldset({ legend, children, defaultOpen = true, highlight = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <fieldset className={`rounded-lg border bg-white ${highlight ? "border-2 border-neutral-900" : "border-neutral-200"}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <legend className={`text-xs font-semibold uppercase tracking-wider ${highlight ? "text-neutral-900" : "text-neutral-700"}`}>{legend}</legend>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-neutral-400" /> : <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </fieldset>
  );
}
function SectionTitle({ n, children }) {
  return <div className="mb-3 flex items-center gap-2.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-neutral-900 text-[11px] font-semibold text-white">{n}</span><h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">{children}</h3></div>;
}
function SortableTh({ label, sortKey, sort, onSort, align = "left" }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
  return <th className={`px-4 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}><button onClick={() => onSort(sortKey)} className={`inline-flex items-center gap-1 transition hover:text-neutral-700 ${active ? "text-neutral-700" : ""}`}>{align === "right" && <Icon className="h-3 w-3" />}{label}{align !== "right" && <Icon className="h-3 w-3" />}</button></th>;
}

/* ---------- CALCOLATORI FINANZIARI ---------- */
function ScontoOffertagBadge({ cifraProposta, prezzoTotaleAnnuncio }) {
  const proposta = toNum(cifraProposta), totale = toNum(prezzoTotaleAnnuncio);
  if (!proposta || !totale) return null;
  const sconto = ((proposta - totale) / totale) * 100;
  const isSconto = sconto < 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${isSconto ? "bg-red-50 text-red-600 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>
      {isSconto ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      {isSconto ? "Offerta" : "Premio"} {pct(sconto)}
    </span>
  );
}

function MargineLordoBadge({ deal, cifraProposta: cfPropOverride }) {
  const mq       = toNum(deal.mq);
  const disc      = toNum(deal.prezzoMqDiscovery);
  const annuncio  = toNum(deal.prezzoTotaleAnnuncio);
  const proposta  = toNum(cfPropOverride ?? deal.cifraProposta);
  if (!proposta) return null;
  const valoreUscita = disc > 0 && mq > 0 ? disc * mq : annuncio > 0 ? annuncio : 0;
  if (!valoreUscita) return null;
  const margine = valoreUscita - proposta;
  const pos = margine >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${pos ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-600 ring-1 ring-red-200"}`}>
      {pos ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
      Margine {eurKSigned(margine)}
    </span>
  );
}

/* ============================================================ */
/*  DEAL FORM SLIDE-OVER                                        */
/* ============================================================ */
function DealSlideOver({ open, onClose, onSave, editing, seed, zones }) {
  const [f, setF] = useState(DEAL_EMPTY);
  const [touched, setTouched] = useState(false);
  const firstRef  = useRef(null);
  const errorRefs = useRef({});

  useEffect(() => {
    if (open) {
      if (editing) { const s = { ...editing }; DEAL_NUM.forEach((k) => { s[k] = String(editing[k] ?? ""); }); setF(s); }
      else if (seed) { const b = { ...seed }; delete b.id; delete b.dataCaricamento; const s = { ...DEAL_EMPTY, ...b }; DEAL_NUM.forEach((k) => { s[k] = String(b[k] ?? ""); }); setF(s); }
      else setF(DEAL_EMPTY);
      setTouched(false);
      setTimeout(() => firstRef.current?.focus(), 250);
    }
  }, [open, editing, seed]);

  useEffect(() => {
    if (!open || !f.citta || !f.zona || !zones?.length) return;
    const match = zones.find((z) =>
      z.citta.trim().toLowerCase() === f.citta.trim().toLowerCase() &&
      z.macrozona.trim().toLowerCase() === f.zona.trim().toLowerCase() &&
      toNum(z.prezzoObiettivo) > 0
    );
    if (match) {
      setF((prev) => {
        if (prev.prezzoMqDiscovery && prev.prezzoMqDiscovery !== "0") return prev;
        return { ...prev, prezzoMqDiscovery: String(match.prezzoObiettivo) };
      });
    }
  }, [f.citta, f.zona, open, zones]);

  const set     = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setStato = (e) => { const stato = e.target.value; setF((s) => ({ ...s, stato, subStato: (SUBSTATI[stato] || [])[0] || "" })); };
  const setCitta = (e) => { setF((s) => ({ ...s, citta: e.target.value, zona: "" })); };

  const mqNum  = toNum(f.mq), totNum = toNum(f.prezzoTotaleAnnuncio);
  const prezzoMqCalcolato = mqNum > 0 && totNum > 0 ? Math.round(totNum / mqNum) : 0;

  const errors = useMemo(() => {
    const e = {};
    if (!f.progetto.trim())       e.progetto       = "Obbligatorio";
    if (!f.nomeInseritore.trim()) e.nomeInseritore  = "Obbligatorio";
    if (!f.cognomeInseritore.trim()) e.cognomeInseritore = "Obbligatorio";
    if (toNum(f.mq) <= 0)         e.mq             = "Superficie > 0";
    if (!f.linkAnnuncio.trim())   e.linkAnnuncio   = "Link obbligatorio";
    if (!f.linkOnbild.trim())     e.linkOnbild     = "Link obbligatorio";
    if (!f.linkDrive.trim())      e.linkDrive      = "Link obbligatorio";
    return e;
  }, [f]);
  const valid   = Object.keys(errors).length === 0;
  const showErr = (k) => (touched ? errors[k] : undefined);

  const submit = () => {
    setTouched(true);
    if (!valid) {
      const firstKey = Object.keys(errors)[0];
      setTimeout(() => { const el = errorRefs.current[firstKey]; if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); } }, 50);
      return;
    }
    const p = { ...f };
    DEAL_NUM.forEach((k) => { p[k] = toNum(f[k]); });
    p.prezzoMqAnnuncio = prezzoMqCalcolato;
    onSave(p);
  };

  const zoneSuggestions = GEO_SUGGESTIONS[f.citta] || [];
  const discMatch = zones?.find((z) =>
    z.citta.trim().toLowerCase() === f.citta.trim().toLowerCase() &&
    z.macrozona.trim().toLowerCase() === f.zona.trim().toLowerCase() &&
    toNum(z.prezzoObiettivo) > 0
  );

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-neutral-50 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{editing ? "Modifica pratica" : seed ? "Duplica pratica" : "Nuova pratica"}</h2>
            <p className="text-xs text-neutral-500">{editing ? editing.id : "Modulo data-entry"}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <CollapsibleFieldset legend="Anagrafica inseritore">
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2"><TextField label="Nome" placeholder="Mario" value={f.nomeInseritore} onChange={set("nomeInseritore")} error={showErr("nomeInseritore")} ref={(el) => { if (el) errorRefs.current.nomeInseritore = el; }} /></div>
              <div className="col-span-2"><TextField label="Cognome" placeholder="Rossi" value={f.cognomeInseritore} onChange={set("cognomeInseritore")} error={showErr("cognomeInseritore")} ref={(el) => { if (el) errorRefs.current.cognomeInseritore = el; }} /></div>
              <SelectField label="Ruolo" options={RUOLI_INS} value={f.ruoloInseritore} onChange={set("ruoloInseritore")} />
            </div>
          </CollapsibleFieldset>

          <CollapsibleFieldset legend="Immobile & geolocalizzazione">
            <div className="space-y-4">
              <TextField ref={(el) => { firstRef.current = el; if (el) errorRefs.current.progetto = el; }} cap label="Nome progetto" placeholder="Es. Via Comisso 4" value={f.progetto} onChange={set("progetto")} error={showErr("progetto")} />
              <TextField cap label="Indirizzo completo" placeholder="Via, civico, CAP, città" value={f.indirizzo} onChange={set("indirizzo")} />
              <div className="grid grid-cols-2 gap-4">
                <ComboField label="Città" value={f.citta} onChange={setCitta} suggestions={ALL_CITIES} placeholder="Es. Milano…" id="fc" />
                <ComboField label="Zona" value={f.zona} onChange={set("zona")} suggestions={zoneSuggestions} placeholder="Es. Navigli…" id="fz" hint={zoneSuggestions.length ? `${zoneSuggestions.length} suggerimenti` : "libera"} />
              </div>
              {discMatch && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <Compass className="h-3.5 w-3.5 shrink-0" />
                  <span>Zona trovata in Discovery — <strong>Prezzo MQ Discovery</strong> pre-compilato a {eurMq(discMatch.prezzoObiettivo)}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <SelectField label="Venditore" options={VENDITORI} value={f.venditore} onChange={set("venditore")} />
                <SelectField label="Tipologia" options={TIPOLOGIE} value={f.tipologia} onChange={set("tipologia")} />
                <NumField label="Superficie" suffix="mq" placeholder="0" value={f.mq} onChange={set("mq")} error={showErr("mq")} ref={(el) => { if (el) errorRefs.current.mq = el; }} />
              </div>
            </div>
          </CollapsibleFieldset>

          <CollapsibleFieldset legend="La trinità dei link · obbligatori" highlight>
            <div className="space-y-4">
              <div className="mb-3 rounded-md bg-neutral-900 px-3 py-2 text-xs text-neutral-300">⭐ Link essenziali per il passaggio di consegne Analista → Commerciale.</div>
              <UrlField label="Link annuncio" hint="Immobiliare.it / Idealista" placeholder="https://www.immobiliare.it/…" value={f.linkAnnuncio} onChange={set("linkAnnuncio")} error={showErr("linkAnnuncio")} ref={(el) => { if (el) errorRefs.current.linkAnnuncio = el; }} />
              <UrlField label="Link ONBILD" hint="valutazione originaria" placeholder="https://onbild.com/…" value={f.linkOnbild} onChange={set("linkOnbild")} error={showErr("linkOnbild")} ref={(el) => { if (el) errorRefs.current.linkOnbild = el; }} />
              <UrlField label="Cartella documentazione" hint="Drive / Dropbox" placeholder="https://drive.google.com/…" value={f.linkDrive} onChange={set("linkDrive")} error={showErr("linkDrive")} ref={(el) => { if (el) errorRefs.current.linkDrive = el; }} />
              <div className="border-t border-neutral-100 pt-4">
                <Label hint="vitale per il commerciale">Contatto immobiliare</Label>
                <input type="text" inputMode="tel" value={f.contattoImmobiliare} onChange={(e) => setF((s) => ({ ...s, contattoImmobiliare: formatPhone(e.target.value) }))} placeholder="Es. Mario Rossi · 333 123 4567" className={inputCls(false)} />
              </div>
            </div>
          </CollapsibleFieldset>

          {editing && (
            <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-100/60 px-4 py-2.5 text-xs text-neutral-500">
              <History className="h-3.5 w-3.5 shrink-0" />Pratica creata il <span className="font-medium text-neutral-700">{editing.dataCaricamento}</span> da <span className="font-medium text-neutral-700">{editing.nomeInseritore} {editing.cognomeInseritore}</span>
            </div>
          )}

          {editing && (
            <CollapsibleFieldset legend="Workflow & tempistiche">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <SelectField label="Stato" options={STATI} value={f.stato} onChange={setStato} />
                  <SelectField label="Sub-stato" options={SUBSTATI[f.stato] || []} value={f.subStato} onChange={set("subStato")} />
                  <SelectField label="Priorità" options={PRIORITA} value={f.priorita} onChange={set("priorita")} />
                </div>
                <TextField label="Owner" hint="assegnatario commerciale" placeholder="Nome e cognome" value={f.owner} onChange={set("owner")} />
                <DateField label="Inizio commercializzazione" value={f.dataInizioCommercializzazione} onChange={set("dataInizioCommercializzazione")} />
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Cifra proposta" suffix="€" placeholder="0" value={f.cifraProposta} onChange={set("cifraProposta")} />
                  <DateField label="Data proposta" value={f.dataProposta} onChange={set("dataProposta")} />
                </div>
              </div>
            </CollapsibleFieldset>
          )}

          <CollapsibleFieldset legend="Analisi finanziaria & ricalibrazione">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <NumField label="ROI ONBILD" suffix="%" placeholder="0" value={f.roiOnbild} onChange={set("roiOnbild")} />
                <NumField label="ROI post-discovery" suffix="%" placeholder="—" value={f.roiPostDiscovery} onChange={set("roiPostDiscovery")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumFieldFormatted label="Prezzo totale annuncio" hint="da Immobiliare.it" suffix="€" placeholder="0" value={f.prezzoTotaleAnnuncio} onChange={(e) => setF((s) => ({ ...s, prezzoTotaleAnnuncio: e.target.value }))} />
                <div>
                  <Label hint="calcolato auto">Prezzo MQ annuncio</Label>
                  <div className="flex h-[38px] items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 text-right text-sm tabular-nums text-neutral-600">
                    {prezzoMqCalcolato > 0 ? eurMq(prezzoMqCalcolato) : <span className="text-neutral-300 text-xs">inserisci prezzo e mq</span>}
                  </div>
                </div>
              </div>
              <div>
                <NumField label="Prezzo MQ emerso da Discovery" suffix="€/mq" placeholder="—" value={f.prezzoMqDiscovery} onChange={set("prezzoMqDiscovery")} hint={discMatch ? "pre-compilato da Discovery" : undefined} />
              </div>
            </div>
          </CollapsibleFieldset>

          <CollapsibleFieldset legend="Risk & note tecniche">
            <div className="space-y-4">
              <TextField label="Vincoli" placeholder="Es. vincolo paesaggistico…" value={f.vincoli} onChange={set("vincoli")} />
              <TextField label="Ipoteche / Gravami" placeholder="Es. ipoteca € 1,2M…" value={f.ipoteche} onChange={set("ipoteche")} />
              <TextareaField label="Note analista" rows={3} placeholder="Note libere…" value={f.noteCondoni} onChange={set("noteCondoni")} />
            </div>
          </CollapsibleFieldset>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-neutral-200 bg-white px-6 py-3.5">
          <span className="text-xs text-neutral-400">{valid ? "Pronto al salvataggio" : touched ? "Completa i campi evidenziati" : "Compila i dati richiesti"}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Annulla</button>
            <button onClick={submit} disabled={touched && !valid} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"><Check className="h-4 w-4" />{editing ? "Salva" : "Crea pratica"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  GESTIONE AGENTE SLIDE-OVER                                  */
/* ============================================================ */
const NOTE_TAGS = ["[Chiamata]", "[Sopralluogo]", "[Rilancio]"];

function GestioneAgenteSlideOver({ open, onClose, deal, onSave, onAddNote }) {
  const [f, setF] = useState({});
  const [nuovaNota, setNuovaNota] = useState("");
  const notaInputRef = useRef(null);

  useEffect(() => {
    if (open && deal) {
      setF({ stato: deal.stato || "Stand-by", subStato: deal.subStato || "", priorita: deal.priorita || "Media", owner: deal.owner || "", dataProposta: deal.dataProposta || "", cifraProposta: deal.cifraProposta ? String(deal.cifraProposta) : "" });
      setNuovaNota("");
    }
  }, [open, deal]);

  if (!deal) return null;
  const set      = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setStato = (e) => { const stato = e.target.value; setF((s) => ({ ...s, stato, subStato: (SUBSTATI[stato] || [])[0] || "" })); };
  const submit   = () => { onSave({ ...deal, ...f, cifraProposta: toNum(f.cifraProposta) }); };

  const aggiungiNota = () => {
    if (!nuovaNota.trim()) return;
    onAddNote(deal.id, nuovaNota.trim());
    setNuovaNota("");
  };

  const prependTag = (tag) => {
    setNuovaNota((prev) => {
      const next = prev.startsWith(tag) ? prev : `${tag} ${prev}`;
      return next;
    });
    notaInputRef.current?.focus();
  };

  const noteLog = deal.noteLog || [];

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-900 px-6 py-4">
          <div>
            <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-neutral-400" /><h2 className="text-base font-semibold text-white">Gestione Agente</h2></div>
            <p className="text-xs text-neutral-400 mt-0.5">{deal.progetto} · {deal.id}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-md border border-neutral-100 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">Vista commerciale — dati catastali e anagrafica non visibili.</div>

          {deal.contattoImmobiliare && (
            <a href={`tel:${deal.contattoImmobiliare.replace(/[^+\d]/g, "")}`} className="flex items-center justify-between rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-3 text-white hover:bg-neutral-800 transition">
              <span className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><Phone className="h-4 w-4" /></span><span><span className="block text-[10px] uppercase tracking-wide text-neutral-400">Contatto</span><span className="block text-sm font-semibold">{deal.contattoImmobiliare}</span></span></span>
              <span className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-medium">Chiama</span>
            </a>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Stato</Label><select value={f.stato} onChange={setStato} className={inputCls(false) + " cursor-pointer"}>{STATI.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><Label>Sub-stato</Label><select value={f.subStato} onChange={set("subStato")} className={inputCls(false) + " cursor-pointer"}>{(SUBSTATI[f.stato] || []).map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priorità</Label><select value={f.priorita} onChange={set("priorita")} className={inputCls(false) + " cursor-pointer"}>{PRIORITA.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <TextField label="Owner / Assegnatario" placeholder="Nome agente" value={f.owner} onChange={set("owner")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Cifra proposta" suffix="€" placeholder="0" value={f.cifraProposta} onChange={set("cifraProposta")} />
              <DateField label="Data proposta" value={f.dataProposta} onChange={set("dataProposta")} />
            </div>
            {f.cifraProposta && (deal.prezzoTotaleAnnuncio > 0 || deal.prezzoMqDiscovery > 0) && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2">
                <ScontoOffertagBadge cifraProposta={f.cifraProposta} prezzoTotaleAnnuncio={deal.prezzoTotaleAnnuncio} />
                <MargineLordoBadge deal={deal} cifraProposta={f.cifraProposta} />
              </div>
            )}
          </div>

          <div>
            <Label>Link essenziali</Label>
            <div className="mt-1 space-y-1.5">
              {LINK_DEFS.map(({ key, label, icon: Icon }) => {
                const href = deal[key];
                if (!href) return <div key={key} className="flex items-center gap-2 rounded-md border border-dashed border-neutral-200 px-3 py-2 text-xs text-neutral-400"><Lock className="h-3.5 w-3.5" />{label} — non inserito</div>;
                return <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"><Icon className="h-3.5 w-3.5 text-neutral-400" />{label}<ExternalLink className="h-3 w-3 ml-auto text-neutral-300" /></a>;
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500"><MessageSquare className="h-3.5 w-3.5" />Note commerciali · {noteLog.length}</div>
            <div className="mb-2 flex gap-1.5">
              {NOTE_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => prependTag(tag)}
                  className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 transition">
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                ref={notaInputRef}
                type="text"
                value={nuovaNota}
                onChange={(e) => setNuovaNota(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aggiungiNota()}
                placeholder="Aggiungi nota…"
                className={inputCls(false) + " flex-1 text-sm"}
              />
              <button onClick={aggiungiNota} disabled={!nuovaNota.trim()} className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button>
            </div>
            {noteLog.length > 0 ? (
              <div className="mt-3 space-y-2">
                {noteLog.map((nota, i) => (
                  <div key={i} className="relative border-l-2 border-neutral-200 pl-3">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-400 tabular-nums">{nota.data}</div>
                    <p className="mt-0.5 text-sm text-neutral-800">{nota.testo}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-neutral-400 italic">Nessuna nota ancora — inizia il log commerciale.</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-200 px-6 py-3.5">
          <button onClick={onClose} className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Chiudi</button>
          <button onClick={submit} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"><Check className="h-4 w-4" />Salva workflow</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  DETAIL MODAL                                                */
/* ============================================================ */
function DataField({ icon: Icon, label, value, tone }) {
  const t = tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-red-600" : "text-neutral-800";
  return <div className="flex items-start gap-2.5 py-2.5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" /><div className="min-w-0"><div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">{label}</div><div className={`mt-0.5 text-sm ${t}`}>{value}</div></div></div>;
}
function WidgetPrezzoMq({ deal }) {
  const ann  = deal.prezzoMqAnnuncio || 0, disc = toNum(deal.prezzoMqDiscovery);
  if (!ann && !disc) return null;
  const scarto = ann && disc ? ((ann - disc) / disc) * 100 : null;
  const sovra  = scarto !== null ? scarto > 0 : null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Verifica valore al MQ</div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">MQ annuncio</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900">{ann > 0 ? eurMq(ann) : "—"}</div>
          {deal.prezzoTotaleAnnuncio > 0 && <div className="text-[10px] text-neutral-400">{eur(deal.prezzoTotaleAnnuncio)}</div>}
        </div>
        <div className="flex flex-col items-center justify-center">
          {scarto !== null
            ? <><div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${sovra ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>{sovra ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{pct(scarto)}</div><div className="mt-1 text-[10px] text-neutral-400">{sovra ? "Sovrapprezzo" : "Sconto"}</div></>
            : <span className="text-[10px] text-neutral-300">vs</span>}
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">MQ Discovery</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900">{disc > 0 ? eurMq(disc) : "—"}</div>
        </div>
      </div>
    </div>
  );
}
function WidgetRoi({ deal }) {
  const onb  = toNum(deal.roiOnbild), post = toNum(deal.roiPostDiscovery);
  if (!onb) return null;
  const hasPost   = post !== 0 || deal.roiPostDiscovery;
  const contrazione = hasPost && post < onb;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ricalibrazione ROI</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-center"><div className="text-[10px] uppercase tracking-wide text-neutral-400">ROI ONBILD</div><div className="mt-1"><RoiTag roi={onb} size="lg" /></div></div>
        <div className={`rounded-md border px-3 py-2 text-center ${contrazione ? "border-red-200 bg-red-50" : "border-neutral-200 bg-neutral-50"}`}><div className="text-[10px] uppercase tracking-wide text-neutral-400">ROI Post-Discovery</div><div className="mt-1">{hasPost ? <RoiTag roi={post} size="lg" /> : <span className="text-lg text-neutral-300">—</span>}</div></div>
      </div>
      {contrazione && <div className="mt-3 flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700"><AlertTriangle className="h-3.5 w-3.5" />Margine in contrazione ({pct(post - onb)} vs stima ONBILD)</div>}
    </div>
  );
}

function buildPitch(deal) {
  const lines = [
    `🏗️ ${deal.progetto}`,
    `📍 ${deal.indirizzo || ""} — ${deal.citta} · ${deal.zona}`,
    ``,
    `📐 Superficie: ${(deal.mq || 0).toLocaleString("it-IT")} mq · ${deal.tipologia}`,
    ``,
    deal.prezzoTotaleAnnuncio > 0 ? `💰 Prezzo richiesto: ${eur(deal.prezzoTotaleAnnuncio)}` : null,
    deal.prezzoMqAnnuncio > 0     ? `📊 Prezzo MQ annuncio: ${eurMq(deal.prezzoMqAnnuncio)}` : null,
    toNum(deal.prezzoMqDiscovery) > 0 ? `🔍 Prezzo MQ Discovery: ${eurMq(deal.prezzoMqDiscovery)}` : null,
    ``,
    toNum(deal.roiOnbild) > 0        ? `📈 ROI ONBILD: +${toNum(deal.roiOnbild).toFixed(1)}%` : null,
    toNum(deal.roiPostDiscovery) > 0  ? `📉 ROI Post-Discovery: +${toNum(deal.roiPostDiscovery).toFixed(1)}%` : null,
    deal.vincoli  ? `⚠️ Vincoli: ${deal.vincoli}` : null,
    deal.ipoteche ? `🔒 Ipoteche: ${deal.ipoteche}` : null,
    ``,
    `🔗 ${deal.linkAnnuncio || "—"}`,
  ].filter((l) => l !== null);
  return lines.join("\n");
}

function DealDetailModal({ deal, onClose, onEdit, onDuplicate, onDelete, onGestioneAgente }) {
  const [confirmDel, setConfirmDel]  = useState(false);
  const [copied, setCopied]          = useState(false);
  const [copiedAddr, setCopiedAddr]  = useState(false);
  useEffect(() => { setConfirmDel(false); setCopied(false); setCopiedAddr(false); }, [deal]);
  if (!deal) return null;
  const mesi = mesiTrascorsi(deal.dataInizioCommercializzazione);

  const copyPitch = () => {
    navigator.clipboard.writeText(buildPitch(deal)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const copyAddr = () => {
    const addr = [deal.indirizzo, deal.citta, deal.zona].filter(Boolean).join(", ");
    navigator.clipboard.writeText(addr).then(() => { setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000); });
  };
  const waHref = `https://wa.me/?text=${encodeURIComponent(buildPitch(deal))}`;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-neutral-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="my-auto w-full max-w-2xl rounded-xl bg-white shadow-2xl ring-1 ring-neutral-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-neutral-400">{deal.id}</span>
              <StatoChip stato={deal.stato} />
              {deal.subStato && <span className="text-xs text-neutral-400">· {deal.subStato}</span>}
              <PrioritaChip p={deal.priorita} />
            </div>
            <h2 className="mt-1 text-xl font-semibold text-neutral-900">{deal.progetto}</h2>
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-neutral-500">{deal.indirizzo || "—"} · {deal.citta} · {deal.zona}</p>
              <button onClick={copyAddr} title="Copia indirizzo" className={`rounded p-0.5 transition ${copiedAddr ? "text-emerald-600" : "text-neutral-300 hover:text-neutral-500"}`}>{copiedAddr ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
              <span>Caricata il {deal.dataCaricamento}</span><span>·</span>
              <span className="flex items-center gap-1.5"><Avatar nome={`${deal.nomeInseritore} ${deal.cognomeInseritore}`} />{deal.nomeInseritore} {deal.cognomeInseritore} — {deal.ruoloInseritore}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button onClick={copyPitch} className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copiato!" : "Pitch"}</button>
            <a href={waHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition">
              <MessageSquare className="h-3.5 w-3.5" />WhatsApp
            </a>
            <button onClick={() => onDuplicate(deal)} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"><Copy className="h-3.5 w-3.5" />Duplica</button>
            <button onClick={() => onGestioneAgente(deal)} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"><Briefcase className="h-3.5 w-3.5" />Gestione Agente</button>
            <button onClick={() => onEdit(deal)} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"><Pencil className="h-3.5 w-3.5" />Modifica</button>
            {confirmDel
              ? <button onClick={() => onDelete(deal.id)} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"><Trash2 className="h-3.5 w-3.5" />Conferma</button>
              : <button onClick={() => setConfirmDel(true)} className="rounded-md border border-neutral-300 p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
            <button onClick={onClose} className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <LinkTrinity deal={deal} size="lg" showEmpty />

          {deal.contattoImmobiliare && (
            <a href={`tel:${deal.contattoImmobiliare.replace(/[^+\d]/g, "")}`} className="flex items-center justify-between rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-3 text-white hover:bg-neutral-800 transition">
              <span className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><Phone className="h-4 w-4" /></span><span><span className="block text-[10px] uppercase tracking-wide text-neutral-300">Contatto immobiliare</span><span className="block text-sm font-semibold">{deal.contattoImmobiliare}</span></span></span>
              <span className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-medium">Chiama</span>
            </a>
          )}

          <WidgetPrezzoMq deal={deal} />
          <WidgetRoi deal={deal} />

          {toNum(deal.cifraProposta) > 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="grid grid-cols-2 divide-x divide-neutral-100">
                <div className="pr-4">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Cifra proposta</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{eur(deal.cifraProposta)}</div>
                  <div className="mt-1 text-[11px] text-neutral-400">{deal.dataProposta || "—"}</div>
                </div>
                <div className="pl-4 flex flex-col justify-center gap-2">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Analisi offerta</div>
                  <ScontoOffertagBadge cifraProposta={deal.cifraProposta} prezzoTotaleAnnuncio={deal.prezzoTotaleAnnuncio} />
                  <MargineLordoBadge deal={deal} />
                </div>
              </div>
            </div>
          )}

          <section>
            <SectionTitle n={1}>Identikit & workflow</SectionTitle>
            <div className="grid grid-cols-1 gap-x-8 rounded-lg border border-neutral-200 px-4 py-1 sm:grid-cols-2">
              <DataField icon={Building2} label="Tipologia" value={deal.tipologia} />
              <DataField icon={Ruler} label="Superficie" value={`${(deal.mq || 0).toLocaleString("it-IT")} mq`} />
              <DataField icon={User} label="Venditore" value={deal.venditore} />
              <DataField icon={Clock} label="Time on market" tone={mesi > 12 ? "warn" : undefined} value={`${mesi} mesi${mesi > 12 ? " · forte trattabilità" : ""}`} />
              <DataField icon={UserPlus} label="Owner" value={deal.owner ? <span className="flex items-center gap-1.5"><Avatar nome={deal.owner} />{deal.owner}</span> : "Non assegnato"} />
              <DataField icon={Gavel} label="Vincoli" value={deal.vincoli || "Nessuno"} tone={deal.vincoli ? "warn" : undefined} />
              <DataField icon={ShieldAlert} label="Ipoteche" value={deal.ipoteche || "Libero"} tone={deal.ipoteche && !deal.ipoteche.toLowerCase().includes("libero") ? "bad" : undefined} />
            </div>
            {deal.noteCondoni && <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3"><div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500"><MessageSquare className="h-3.5 w-3.5" />Note analista</div><p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{deal.noteCondoni}</p></div>}
          </section>

          {(deal.noteLog || []).length > 0 && (
            <section>
              <SectionTitle n={2}>Log commerciale</SectionTitle>
              <div className="space-y-2 rounded-lg border border-neutral-200 px-4 py-3">
                {(deal.noteLog || []).map((nota, i) => (
                  <div key={i} className="relative border-l-2 border-neutral-200 pl-3">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">{nota.data}</div>
                    <p className="mt-0.5 text-sm text-neutral-700">{nota.testo}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  ABORT MODAL                                                 */
/* ============================================================ */
function AbortModal({ open, onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState("");
  useEffect(() => { if (open) setMotivo(""); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-neutral-900">Scarta pratica</h3>
        <p className="mt-1 text-sm text-neutral-500">Seleziona la motivazione per l'archivio scarti.</p>
        <div className="mt-4"><Label>Motivo</Label><select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls(false) + " cursor-pointer"}><option value="">Seleziona…</option>{SUBSTATI.Abort.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Annulla</button>
          <button onClick={() => onConfirm(motivo || SUBSTATI.Abort[0])} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"><Archive className="h-4 w-4" />Archivia</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  KANBAN CARD                                                 */
/* ============================================================ */
function KanbanCard({ deal, onOpen, dispatch, onAbort }) {
  const mesi  = mesiTrascorsi(deal.dataInizioCommercializzazione);
  const isNew = deal.dataCaricamento === oggi();
  const roiOnb = toNum(deal.roiOnbild);
  const handleStato = (e) => {
    const newStato = e.target.value;
    e.stopPropagation();
    if (newStato === "Abort") { onAbort(deal.id); return; }
    dispatch({ type: "MOVE", id: deal.id, stato: newStato });
  };
  return (
    <div className="group relative rounded-lg border border-neutral-200 bg-white p-3.5 transition hover:border-neutral-300 hover:shadow-sm">
      <button onClick={onOpen} className="w-full text-left focus:outline-none">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">{deal.id}{isNew && <NewBadge />}</span>
          <div className="flex items-center gap-2"><PrioritaChip p={deal.priorita} />{roiOnb > 0 && <RoiTag roi={roiOnb} />}</div>
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-neutral-900">{deal.progetto}</div>
        {deal.subStato && <div className="mt-0.5 truncate text-[11px] text-neutral-400">{deal.subStato}</div>}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="truncate text-xs text-neutral-500">{deal.citta}{deal.zona ? ` · ${deal.zona}` : ""}</div>
          <Avatar nome={deal.owner || `${deal.nomeInseritore} ${deal.cognomeInseritore}`} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-neutral-500">{mqK(deal.mq)}</span>
          <MesiFlag mesi={mesi} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1"><RedFlags deal={deal} /><StalloBadge deal={deal} /><AggiornamentoBadge deal={deal} /></div>
      </button>
      <div className="mt-2.5 border-t border-neutral-100 pt-2.5" onClick={(e) => e.stopPropagation()}><LinkTrinity deal={deal} size="sm" showEmpty={false} /></div>
      <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Stato</span>
        <select value={deal.stato} onChange={handleStato} className="rounded border border-neutral-200 bg-transparent py-0.5 pl-2 pr-6 text-[11px] font-medium text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer appearance-auto">
          {STATI.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {deal.stato !== "Abort" && (
        <button onClick={(e) => { e.stopPropagation(); onAbort(deal.id); }} title="Scarta" className="absolute bottom-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-400 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

/* ============================================================ */
/*  CSV EXPORT                                                  */
/* ============================================================ */
function exportCsv(deals) {
  const h = ["ID","Progetto","Inseritore","Ruolo","Owner","Contatto","Città","Zona","MQ","ROI ONBILD","ROI Post-Discovery","Prezzo Totale","MQ Annuncio","MQ Discovery","Stato","Sub-Stato","Priorità","Data Caricamento","Cifra Proposta","Note Analista","Note Log","Vincoli","Ipoteche"];
  const q = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  const rows = deals.map((d) => [
    d.id, q(d.progetto), q(`${d.nomeInseritore} ${d.cognomeInseritore}`), d.ruoloInseritore,
    q(d.owner), q(d.contattoImmobiliare), d.citta, q(d.zona), d.mq,
    d.roiOnbild || "", d.roiPostDiscovery || "", d.prezzoTotaleAnnuncio || "",
    d.prezzoMqAnnuncio || "", d.prezzoMqDiscovery || "",
    d.stato, d.subStato, d.priorita, d.dataCaricamento, d.cifraProposta || "",
    q(d.noteCondoni), q((d.noteLog || []).map((n) => `[${n.data}] ${n.testo}`).join(" | ")),
    q(d.vincoli), q(d.ipoteche),
  ]);
  const csv  = [h.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url; a.download = `elekta-export-${oggiISO()}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ============================================================ */
/*  ARCHIVIO SCARTI MODAL                                       */
/* ============================================================ */
function ArchivioScartiModal({ deals, open, onClose, onRestore }) {
  if (!open) return null;
  const scarti = deals.filter((d) => d.stato === "Abort");
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-neutral-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-2xl ring-1 ring-neutral-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2"><Archive className="h-4 w-4 text-neutral-400" /><h2 className="text-base font-semibold text-neutral-900">Archivio Scarti</h2></div>
            <p className="text-xs text-neutral-500 mt-0.5">{scarti.length} pratiche archiviate — escluse dalla pipeline attiva</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-x-auto">
          {scarti.length === 0
            ? <div className="px-6 py-12 text-center text-sm text-neutral-400">Nessuna pratica archiviata.</div>
            : (
              <table className="w-full border-collapse text-sm">
                <thead><tr className="border-b border-neutral-200 bg-neutral-50 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  <th className="px-4 py-2.5">ID / Progetto</th><th className="px-4 py-2.5">Città</th><th className="px-4 py-2.5">Motivo</th><th className="px-4 py-2.5">Archiviato</th><th className="px-4 py-2.5"></th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {scarti.map((d) => (
                    <tr key={d.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3"><div className="font-mono text-[11px] text-neutral-400">{d.id}</div><div className="font-medium text-neutral-900">{d.progetto}</div></td>
                      <td className="px-4 py-3 text-neutral-600">{d.citta}{d.zona ? ` · ${d.zona}` : ""}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">{d.subStato}</span></td>
                      <td className="px-4 py-3 text-xs text-neutral-500 tabular-nums">{d.ultimaModifica || d.dataCaricamento}</td>
                      <td className="px-4 py-3"><button onClick={() => onRestore(d.id)} className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">Ripristina</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  AGENDA COMMERCIALE                                          */
/* ============================================================ */
function AgendaCommerciale({ deals }) {
  const [soloMiei, setSoloMiei] = useState(false);
  const pipeline = deals.filter((d) => d.stato !== "Abort");
  const filtered = soloMiei ? pipeline.filter((d) => d.owner?.toLowerCase().includes("corrente") || `${d.nomeInseritore} ${d.cognomeInseritore}`.toLowerCase().includes("corrente")) : pipeline;

  const proposte = filtered.filter((d) => d.stato === "Attivata" && d.subStato === "Proposta inviata");
  const followup = filtered.filter((d) => {
    const gg = d.ultimaModifica ? giorniTrascorsiISO(d.ultimaModifica) : giorniTrascorsi(d.dataCaricamento);
    return d.stato === "Stand-by" && gg > 7;
  }).sort((a, b) => giorniTrascorsiISO(a.ultimaModifica || "") - giorniTrascorsiISO(b.ultimaModifica || ""));
  const attivate = filtered.filter((d) => d.stato === "Attivata").slice(0, 10);

  const AgendaCard = ({ deal }) => (
    <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 hover:shadow-sm transition">
      <Avatar nome={deal.owner || `${deal.nomeInseritore} ${deal.cognomeInseritore}`} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="font-mono text-[10px] text-neutral-400">{deal.id}</span><PrioritaChip p={deal.priorita} />{deal.subStato && <span className="text-[11px] text-neutral-400">{deal.subStato}</span>}</div>
        <div className="truncate text-sm font-semibold text-neutral-900">{deal.progetto}</div>
        <div className="text-xs text-neutral-500">{deal.citta}{deal.zona ? ` · ${deal.zona}` : ""}</div>
      </div>
      <div className="shrink-0 text-right">
        {deal.prezzoTotaleAnnuncio > 0 && <div className="text-sm font-semibold tabular-nums text-neutral-900">{eurK(deal.prezzoTotaleAnnuncio)}</div>}
        {deal.cifraProposta > 0 && <div className="text-xs text-neutral-500">Proposta: {eurK(deal.cifraProposta)}</div>}
        {deal.dataProposta && <div className="text-[11px] text-neutral-400 tabular-nums">{deal.dataProposta}</div>}
      </div>
    </div>
  );
  const EmptySection = ({ label }) => <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">{label}</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-lg font-semibold text-neutral-900">Agenda Commerciale</h1><p className="text-xs text-neutral-500">Cruscotto operativo per l'agente · aggiornamento in tempo reale</p></div>
        <button onClick={() => setSoloMiei((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${soloMiei ? "bg-neutral-900 text-white ring-neutral-900" : "bg-white text-neutral-600 ring-neutral-300 hover:bg-neutral-50"}`}><User className="h-3 w-3" />Solo i miei deal</button>
      </div>
      <section>
        <div className="mb-3 flex items-center gap-2.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-neutral-900 text-[11px] font-semibold text-white">1</span><h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">Proposte in attesa di risposta</h2><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 tabular-nums ring-1 ring-neutral-200">{proposte.length}</span></div>
        <div className="space-y-2">{proposte.length ? proposte.map((d) => <AgendaCard key={d.id} deal={d} />) : <EmptySection label="Nessuna proposta in attesa — ottimo segno." />}</div>
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-amber-600 text-[11px] font-semibold text-white">2</span><h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">Follow-up da fare · stallo &gt;7 giorni</h2><span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset tabular-nums ${followup.length ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-neutral-100 text-neutral-600 ring-neutral-200"}`}>{followup.length}</span></div>
        <div className="space-y-2">
          {followup.length ? followup.map((d) => {
            const gg = d.ultimaModifica ? giorniTrascorsiISO(d.ultimaModifica) : giorniTrascorsi(d.dataCaricamento);
            return (
              <div key={d.id} className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50/30 px-4 py-3 hover:border-amber-300 transition">
                <Avatar nome={d.owner || `${d.nomeInseritore} ${d.cognomeInseritore}`} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="font-mono text-[10px] text-neutral-400">{d.id}</span><PrioritaChip p={d.priorita} /></div>
                  <div className="truncate text-sm font-semibold text-neutral-900">{d.progetto}</div>
                  <div className="text-xs text-neutral-500">{d.citta}{d.zona ? ` · ${d.zona}` : ""} · <span className="font-medium text-neutral-700">{d.subStato}</span></div>
                </div>
                <div className="shrink-0"><span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"><Clock className="h-3 w-3" />{gg}g senza aggiornamenti</span></div>
              </div>
            );
          }) : <EmptySection label="Pipeline aggiornata — nessun follow-up urgente." />}
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-700 text-[11px] font-semibold text-white">3</span><h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">Pratiche attivate</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 tabular-nums">{attivate.length}</span></div>
        <div className="space-y-2">{attivate.length ? attivate.map((d) => <AgendaCard key={d.id} deal={d} />) : <EmptySection label="Nessuna pratica attivata ancora." />}</div>
      </section>
    </div>
  );
}

/* ============================================================ */
/*  BACHECA DEALS                                               */
/* ============================================================ */
const SORT_GET = { roi: (d) => toNum(d.roiOnbild), mq: (d) => toNum(d.mq) };

function BachecaDeals({ deals, dispatch, zones }) {
  const [view, setView]             = useState("grid");
  const [selId, setSelId]           = useState(null);
  const [formOpen, setFormOpen]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [seed, setSeed]             = useState(null);
  const [q, setQ]                   = useState("");
  const [sort, setSort]             = useState({ key: null, dir: "asc" });
  const [gestioneAgente, setGestioneAgente] = useState(null);
  const [abortId, setAbortId]       = useState(null);
  const [archivioOpen, setArchivioOpen] = useState(false);
  const [soloMiei, setSoloMiei]     = useState(false);

  const selected = deals.find((d) => d.id === selId) || null;
  const pipeline = deals.filter((d) => d.stato !== "Abort");
  const filtered = useMemo(() => {
    let r = pipeline.filter((d) => {
      const sq = `${d.progetto} ${d.indirizzo} ${d.citta} ${d.zona} ${d.id} ${d.owner} ${d.nomeInseritore} ${d.cognomeInseritore}`.toLowerCase().includes(q.toLowerCase());
      const sm = !soloMiei || d.owner?.toLowerCase().includes("corrente") || `${d.nomeInseritore} ${d.cognomeInseritore}`.toLowerCase().includes("corrente");
      return sq && sm;
    });
    if (sort.key) { const g = SORT_GET[sort.key]; if (g) r = [...r].sort((a, b) => (g(a) - g(b)) * (sort.dir === "asc" ? 1 : -1)); }
    return r;
  }, [pipeline, q, soloMiei, sort]);

  const kpis = useMemo(() => {
    const att   = pipeline.filter((d) => d.stato === "Attivata").length;
    const hot   = pipeline.filter((d) => mesiTrascorsi(d.dataInizioCommercializzazione) > 12).length;
    const scarti = deals.filter((d) => d.stato === "Abort").length;
    return { tot: pipeline.length, att, hot, scarti };
  }, [deals, pipeline]);

  const openNew  = () => { setEditing(null); setSeed(null); setFormOpen(true); };
  const openEdit = (d) => { setSelId(null); setEditing(d); setSeed(null); setFormOpen(true); };
  const openDup  = (d) => { setSelId(null); setEditing(null); setSeed(d); setFormOpen(true); };
  const save = (data) => {
    if (editing) dispatch({ type: "UPDATE", payload: { ...data, id: editing.id, dataCaricamento: editing.dataCaricamento, noteLog: editing.noteLog || [] } });
    else dispatch({ type: "ADD", payload: data });
    setFormOpen(false); setEditing(null); setSeed(null);
  };
  const del          = (id)    => { dispatch({ type: "DELETE", id }); setSelId(null); };
  const toggleSort   = (k)    => setSort((s) => (s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" }));
  const saveGA       = (data) => { dispatch({ type: "UPDATE", payload: data }); setGestioneAgente(null); setSelId(null); };
  const addNote      = (id, testo) => dispatch({ type: "ADD_NOTE", id, testo });
  const handleAbort  = (motivo)   => { dispatch({ type: "ABORT_WITH_REASON", id: abortId, motivo }); setAbortId(null); };
  const restoreDeal  = (id)       => dispatch({ type: "MOVE", id, stato: "Stand-by" });

  const isEmpty       = pipeline.length === 0;
  const STATI_PIPELINE = STATI.filter((s) => s !== "Abort");

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-lg font-semibold text-neutral-900">Bacheca Deals</h1><p className="text-xs text-neutral-500">Hub logistico commerciale · calcoli complessi su ONBILD</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {!isEmpty && (
            <>
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca…" className="w-48 rounded-md border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900" />
              </div>
              <button onClick={() => setSoloMiei((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${soloMiei ? "bg-neutral-900 text-white ring-neutral-900" : "bg-white text-neutral-600 ring-neutral-300 hover:bg-neutral-50"}`}><User className="h-3 w-3" />Solo i miei</button>
              <div className="flex rounded-md border border-neutral-300 bg-neutral-50 p-0.5">
                <button onClick={() => setView("grid")} className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${view === "grid" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}><Table2 className="h-3.5 w-3.5" />Tabella</button>
                <button onClick={() => setView("kanban")} className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${view === "kanban" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}><LayoutGrid className="h-3.5 w-3.5" />Kanban</button>
              </div>
              <button onClick={() => exportCsv(filtered)} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"><Download className="h-4 w-4" />CSV</button>
              <button onClick={() => setArchivioOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
                <Archive className="h-4 w-4" />Scarti{kpis.scarti > 0 && <span className="ml-0.5 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold">{kpis.scarti}</span>}
              </button>
            </>
          )}
          <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"><Plus className="h-4 w-4" />Nuova pratica</button>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm"><Inbox className="h-6 w-6 text-neutral-400" /></div>
          <h2 className="mt-5 text-lg font-semibold text-neutral-900">Bacheca vuota</h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-500">Inserisci il primo deal con i link essenziali.</p>
          <button onClick={openNew} className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"><Plus className="h-4 w-4" />Nuova pratica</button>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 divide-x divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white lg:grid-cols-4">
            <div className="px-5 py-4"><div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">In pipeline</div><div className="mt-1 text-2xl font-semibold tabular-nums">{kpis.tot}</div></div>
            <div className="px-5 py-4"><div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Attivate</div><div className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600">{kpis.att}</div></div>
            <div className="px-5 py-4"><div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Forte trattabilità</div><div className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums text-amber-600"><AlertTriangle className="h-5 w-5" />{kpis.hot}</div></div>
            <div className="px-5 py-4 cursor-pointer hover:bg-neutral-50" onClick={() => setArchivioOpen(true)}><div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Archivio scarti</div><div className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums text-neutral-400"><Archive className="h-5 w-5" />{kpis.scarti}</div></div>
          </div>

          {view === "grid" && (
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                    <th className="px-4 py-2.5">NDG / Progetto</th>
                    <th className="px-4 py-2.5">Città · Zona</th>
                    <th className="px-4 py-2.5">Inseritore</th>
                    <SortableTh label="MQ" sortKey="mq" sort={sort} onSort={toggleSort} align="right" />
                    <SortableTh label="ROI ONBILD" sortKey="roi" sort={sort} onSort={toggleSort} align="right" />
                    <th className="px-4 py-2.5 text-right">Richiesto</th>
                    <th className="px-4 py-2.5 text-right">On market</th>
                    <th className="px-4 py-2.5">Stato</th>
                    <th className="px-4 py-2.5">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((d) => (
                    <tr key={d.id} onClick={() => setSelId(d.id)} className="group cursor-pointer border-l-4 border-l-transparent transition-all duration-150 hover:bg-neutral-50/80 hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] hover:border-l-neutral-400">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">{d.id}{d.dataCaricamento === oggi() && <NewBadge />}<PrioritaChip p={d.priorita} /></div>
                        <div className="font-medium text-neutral-900 transition-all group-hover:font-semibold">{d.progetto}</div>
                        {d.subStato && <div className="text-[11px] text-neutral-400">{d.subStato}</div>}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{d.citta}{d.zona ? ` · ${d.zona}` : ""}</td>
                      <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-xs text-neutral-500"><Avatar nome={`${d.nomeInseritore} ${d.cognomeInseritore}`} />{d.nomeInseritore} {d.cognomeInseritore}</span></td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{(d.mq || 0).toLocaleString("it-IT")}</td>
                      <td className="px-4 py-3 text-right">{toNum(d.roiOnbild) > 0 ? <RoiTag roi={toNum(d.roiOnbild)} /> : <span className="text-neutral-300">—</span>}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{d.prezzoTotaleAnnuncio > 0 ? eurK(d.prezzoTotaleAnnuncio) : "—"}</td>
                      <td className="px-4 py-3 text-right"><MesiFlag mesi={mesiTrascorsi(d.dataInizioCommercializzazione)} /></td>
                      <td className="px-4 py-3"><StatoChip stato={d.stato} /></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {LINK_DEFS.filter(({ key }) => d[key]).map(({ key, icon: Icon, label }) => (
                            <a key={key} href={d[key]} target="_blank" rel="noopener noreferrer" title={label} className="rounded-md border border-neutral-200 p-1.5 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50"><Icon className="h-3.5 w-3.5" /></a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="px-4 py-12 text-center text-sm text-neutral-400">Nessuna pratica corrisponde ai filtri.</div>}
            </div>
          )}

          {view === "kanban" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {STATI_PIPELINE.map((col) => {
                const items = filtered.filter((d) => d.stato === col);
                return (
                  <div key={col} className="rounded-lg border border-neutral-200 bg-neutral-100/50">
                    <div className="flex items-center justify-between border-b border-neutral-200 px-3.5 py-2.5">
                      <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATO_STYLE[col].dot}`} /><span className="text-sm font-semibold text-neutral-700">{col}</span></div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-500 ring-1 ring-inset ring-neutral-200">{items.length}</span>
                    </div>
                    <div className="space-y-2.5 p-2.5">
                      {items.map((d) => <KanbanCard key={d.id} deal={d} onOpen={() => setSelId(d.id)} dispatch={dispatch} onAbort={(id) => setAbortId(id)} />)}
                      {items.length === 0 && <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 py-8 text-center"><Inbox className="h-5 w-5 text-neutral-300" /><span className="text-xs text-neutral-400">Nessuna pratica</span></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <DealDetailModal deal={selected} onClose={() => setSelId(null)} onEdit={openEdit} onDuplicate={openDup} onDelete={del} onGestioneAgente={(d) => { setSelId(null); setGestioneAgente(d); }} />
      <DealSlideOver open={formOpen} editing={editing} seed={seed} onClose={() => { setFormOpen(false); setEditing(null); setSeed(null); }} onSave={save} zones={zones} />
      <GestioneAgenteSlideOver open={!!gestioneAgente} deal={gestioneAgente} onClose={() => setGestioneAgente(null)} onSave={saveGA} onAddNote={addNote} />
      <AbortModal open={!!abortId} onConfirm={handleAbort} onCancel={() => setAbortId(null)} />
      <ArchivioScartiModal deals={deals} open={archivioOpen} onClose={() => setArchivioOpen(false)} onRestore={restoreDeal} />
    </>
  );
}

/* ============================================================ */
/*  DISCOVERY MERCATO                                           */
/* ============================================================ */
function DiscoveryMercato({ zones, dispatch }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [cantForm, setCantForm] = useState(null);
  const [cf, setCf]             = useState(CANT_EMPTY);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div><h1 className="text-lg font-semibold text-neutral-900">Discovery Mercato</h1><p className="text-xs text-neutral-500">Archivio analisi di zona · cantieri comparabili</p></div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"><Plus className="h-4 w-4" />Nuova analisi di zona</button>
      </div>

      {zones.length === 0 ? (
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm"><Compass className="h-6 w-6 text-neutral-400" /></div>
          <h2 className="mt-5 text-lg font-semibold text-neutral-900">Nessuna analisi di zona</h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-500">Crea la prima scheda Discovery per censire una zona e i relativi cantieri comparabili.</p>
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"><Plus className="h-4 w-4" />Nuova analisi</button>
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((z) => {
            const open     = expanded === z.id;
            const askMean  = z.cantieri.length ? z.cantieri.reduce((s, c) => s + (toNum(c.mq) > 0 ? toNum(c.asking) / toNum(c.mq) : 0), 0) / z.cantieri.length : 0;
            const closMean = z.cantieri.length ? z.cantieri.reduce((s, c) => s + toNum(c.closing), 0) / z.cantieri.length : 0;
            const scartoMedio  = askMean > 0 ? ((closMean - askMean) / askMean) * 100 : 0;
            const obi          = toNum(z.prezzoObiettivo);
            const closingTrend = obi > 0 && closMean > 0 ? (closMean >= obi ? "up" : "down") : null;
            return (
              <div key={z.id} className="rounded-lg border border-neutral-200 bg-white">
                <button onClick={() => setExpanded(open ? null : z.id)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400"><Compass className="h-3.5 w-3.5" />{z.id} · {z.citta}</div>
                    <div className="mt-0.5 text-base font-semibold text-neutral-900">{z.macrozona}</div>
                    <div className="text-xs text-neutral-500">{z.tipologia} · {z.rating} · TTS {z.tts || "—"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {obi > 0 && <div className="text-right"><div className="text-[10px] uppercase tracking-wide text-neutral-400">Obiettivo</div><div className="text-sm font-semibold tabular-nums">{eurMq(obi)}</div></div>}
                    <div className={`rounded-md border p-1.5 transition ${open ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-400 hover:border-neutral-400"}`}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-neutral-200">
                    <div className="grid grid-cols-3 divide-x divide-neutral-100 border-b border-neutral-200 bg-neutral-50/50">
                      <div className="px-4 py-3"><div className="text-[10px] uppercase tracking-wide text-neutral-400">Rating</div><div className="mt-0.5 text-sm font-semibold">{z.rating}</div></div>
                      <div className="px-4 py-3"><div className="text-[10px] uppercase tracking-wide text-neutral-400">TTS atteso</div><div className="mt-0.5 text-sm font-semibold">{z.tts || "—"}</div></div>
                      <div className="px-4 py-3"><div className="text-[10px] uppercase tracking-wide text-neutral-400">Prezzo MQ obiettivo</div><div className="mt-0.5 text-sm font-semibold tabular-nums">{obi > 0 ? eurMq(obi) : "—"}</div></div>
                    </div>
                    <div className="px-5 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cantieri comparabili ({z.cantieri.length})</span>
                        <button onClick={() => { setCantForm(z.id); setCf(CANT_EMPTY); }} className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"><Plus className="h-3 w-3" />Aggiungi</button>
                      </div>
                      {cantForm === z.id && (
                        <div className="mb-3 grid grid-cols-6 gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2">
                          <input placeholder="Nome" value={cf.nome} onChange={(e) => setCf({ ...cf, nome: e.target.value })} className="col-span-2 rounded border border-neutral-300 px-2 py-1.5 text-xs" />
                          <input placeholder="Indirizzo" value={cf.indirizzo} onChange={(e) => setCf({ ...cf, indirizzo: e.target.value })} className="rounded border border-neutral-300 px-2 py-1.5 text-xs" />
                          <input placeholder="Locali" inputMode="numeric" value={cf.locali} onChange={(e) => setCf({ ...cf, locali: e.target.value })} className="rounded border border-neutral-300 px-2 py-1.5 text-xs text-right" />
                          <input placeholder="MQ" inputMode="numeric" value={cf.mq} onChange={(e) => setCf({ ...cf, mq: e.target.value })} className="rounded border border-neutral-300 px-2 py-1.5 text-xs text-right" />
                          <input placeholder="Asking €" inputMode="numeric" value={cf.asking} onChange={(e) => setCf({ ...cf, asking: e.target.value })} className="rounded border border-neutral-300 px-2 py-1.5 text-xs text-right" />
                          <input placeholder="Closing €/mq" inputMode="numeric" value={cf.closing} onChange={(e) => setCf({ ...cf, closing: e.target.value })} className="col-span-2 rounded border border-neutral-300 px-2 py-1.5 text-xs text-right" />
                          <div className="col-span-4 flex items-center gap-2">
                            <button onClick={() => { if (!cf.nome.trim()) return; dispatch({ type: "ADD_CANTIERE", zoneId: z.id, payload: { ...cf, locali: toNum(cf.locali), mq: toNum(cf.mq), asking: toNum(cf.asking), closing: toNum(cf.closing) } }); setCantForm(null); }} className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-neutral-800"><Check className="h-3 w-3" />Salva</button>
                            <button onClick={() => setCantForm(null)} className="text-[11px] text-neutral-500 hover:text-neutral-700">Annulla</button>
                          </div>
                        </div>
                      )}
                      {z.cantieri.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[620px] border-collapse text-sm">
                            <thead><tr className="border-b border-neutral-200 bg-neutral-50/80 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                              <th className="px-3 py-2">Cantiere</th><th className="px-3 py-2 text-right">Loc.</th><th className="px-3 py-2 text-right">MQ</th><th className="px-3 py-2 text-right">Asking €</th><th className="px-3 py-2 text-right">Asking €/mq</th><th className="px-3 py-2 text-right">Closing €/mq</th><th className="px-3 py-2 w-8"></th>
                            </tr></thead>
                            <tbody className="divide-y divide-neutral-100">
                              {z.cantieri.map((c, i) => (
                                <tr key={i} className="hover:bg-neutral-50">
                                  <td className="px-3 py-2"><div className="font-medium text-neutral-900">{c.nome}</div><div className="text-xs text-neutral-500">{c.indirizzo}</div></td>
                                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">{c.locali}</td>
                                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">{toNum(c.mq).toLocaleString("it-IT")}</td>
                                  <td className="px-3 py-2 text-right tabular-nums font-medium text-neutral-900">{eur(c.asking)}</td>
                                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">{toNum(c.mq) > 0 ? eurMq(toNum(c.asking) / toNum(c.mq)) : "—"}</td>
                                  <td className="px-3 py-2 text-right tabular-nums font-medium text-neutral-900">{eurMq(c.closing)}</td>
                                  <td className="px-3 py-2"><button onClick={() => dispatch({ type: "DELETE_CANTIERE", zoneId: z.id, idx: i })} className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3 w-3" /></button></td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-neutral-200 bg-neutral-50/60 text-xs">
                                <td className="px-3 py-2 font-medium uppercase tracking-wide text-neutral-500" colSpan={4}>Media zona</td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold text-neutral-800">{eurMq(askMean)}</td>
                                <td className="px-3 py-2 text-right">
                                  <span className="inline-flex items-center gap-1 tabular-nums font-semibold text-neutral-800">
                                    {eurMq(closMean)}
                                    {closingTrend === "up"   && <TrendingUp   className="h-3.5 w-3.5 text-emerald-600" title="Closing sopra obiettivo" />}
                                    {closingTrend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-500"     title="Closing sotto obiettivo" />}
                                  </span>
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                            <span>Scarto asking → closing</span>
                            <span className={`font-semibold tabular-nums ${scartoMedio < 0 ? "text-emerald-600" : "text-red-600"}`}>{pct(scartoMedio)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">Nessun cantiere — clicca "Aggiungi".</div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3">
                      <button onClick={() => { setEditing(z); setFormOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"><Pencil className="h-3 w-3" />Modifica zona</button>
                      <button onClick={() => dispatch({ type: "DELETE_ZONE", id: z.id })} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" />Elimina zona</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <DiscoveryZoneForm open={formOpen} editing={editing} onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={(data) => {
          if (editing) dispatch({ type: "UPDATE_ZONE", payload: { ...data, id: editing.id, cantieri: editing.cantieri } });
          else dispatch({ type: "ADD_ZONE", payload: data });
          setFormOpen(false); setEditing(null);
        }} />
    </>
  );
}

function DiscoveryZoneForm({ open, editing, onClose, onSave }) {
  const [f, setF] = useState(DISC_EMPTY);
  useEffect(() => { if (open) setF(editing ? { citta: editing.citta, macrozona: editing.macrozona, tipologia: editing.tipologia, rating: editing.rating, tts: editing.tts, prezzoObiettivo: String(editing.prezzoObiettivo ?? "") } : DISC_EMPTY); }, [open, editing]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const zoneSuggestions = GEO_SUGGESTIONS[f.citta] || [];
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${open ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl transition-all duration-300 ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <h2 className="text-lg font-semibold text-neutral-900">{editing ? "Modifica zona" : "Nuova analisi di zona"}</h2>
        <div className="mt-4 space-y-4">
          <ComboField label="Città" value={f.citta} onChange={(e) => setF((s) => ({ ...s, citta: e.target.value, macrozona: "" }))} suggestions={ALL_CITIES} placeholder="Es. Milano…" id="dc" />
          <ComboField label="Macrozona" value={f.macrozona} onChange={set("macrozona")} suggestions={zoneSuggestions} placeholder="Es. Segrate - Viale Milano" id="dz" />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Tipologia" options={TIPO_DISC} value={f.tipologia} onChange={set("tipologia")} />
            <SelectField label="Rating assorbimento" options={RATINGS_ZONA} value={f.rating} onChange={set("rating")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="TTS atteso" placeholder="Es. 4-6 mesi" value={f.tts} onChange={set("tts")} />
            <NumField label="Prezzo MQ obiettivo" suffix="€/mq" placeholder="0" value={f.prezzoObiettivo} onChange={set("prezzoObiettivo")} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Annulla</button>
          <button onClick={() => { if (!f.macrozona.trim()) return; onSave({ ...f, prezzoObiettivo: toNum(f.prezzoObiettivo) }); }} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"><Check className="h-4 w-4" />{editing ? "Salva" : "Crea"}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  ROOT                                                         */
/* ============================================================ */
export default function ElektaBachecaOS() {
  const [dealState, dealDispatch] = useReducer(dealReducer, undefined, () => loadLS(LS_DEALS, DEAL_INIT));
  const [discState, discDispatch] = useReducer(discReducer, undefined, () => loadLS(LS_DISC,  DISC_INIT));
  const [tab, setTab]             = useState("bacheca");

  useEffect(() => { saveLS(LS_DEALS, dealState); }, [dealState]);
  useEffect(() => { saveLS(LS_DISC,  discState);  }, [discState]);

  const pipelineCount = dealState.deals.filter((d) => d.stato !== "Abort").length;
  const followupCount = dealState.deals.filter((d) => {
    const gg = d.ultimaModifica ? giorniTrascorsiISO(d.ultimaModifica) : giorniTrascorsi(d.dataCaricamento);
    return d.stato === "Stand-by" && gg > 7;
  }).length;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 antialiased" style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <span className="text-lg font-semibold tracking-tight">Elekta <span className="text-neutral-400">Bacheca OS</span> <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 tabular-nums">v8</span></span>
          <nav className="flex rounded-md border border-neutral-300 bg-neutral-50 p-0.5">
            <button onClick={() => setTab("bacheca")} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${tab === "bacheca" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
              <LayoutGrid className="h-3.5 w-3.5" />Bacheca
              {pipelineCount > 0 && <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">{pipelineCount}</span>}
            </button>
            <button onClick={() => setTab("discovery")} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${tab === "discovery" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Compass className="h-3.5 w-3.5" />Discovery
            </button>
            <button onClick={() => setTab("agenda")} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${tab === "agenda" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Bell className="h-3.5 w-3.5" />Agenda
              {followupCount > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 tabular-nums">{followupCount}</span>}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        {tab === "bacheca"   && <BachecaDeals deals={dealState.deals} dispatch={dealDispatch} zones={discState.zones} />}
        {tab === "discovery" && <DiscoveryMercato zones={discState.zones} dispatch={discDispatch} />}
        {tab === "agenda"    && <AgendaCommerciale deals={dealState.deals} />}
      </main>
    </div>
  );
}
