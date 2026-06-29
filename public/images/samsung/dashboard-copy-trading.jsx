import React, { useState, useEffect, useRef } from "react";

/* ============================================================
   Tableau de bord — Copy Trading (démonstratif)
   - Cours crypto RÉELS (marché en direct, maj 30s)
   - Tout le reste est modifiable : clic sur un chiffre = édition,
     glisser les points du graphique = modifier la courbe
   - Sauvegarde automatique des réglages
   ============================================================ */

const KEY = "ct_copytrade_dashboard_v1";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

.ct-root{
  --canvas:#F4F6F8; --surface:#FFFFFF; --border:#E7EAEF; --border-2:#DCE0E6;
  --ink:#15171C; --ink-soft:#3C424D; --muted:#787E8A; --muted-2:#A4AAB6;
  --brand:#0E7A57; --brand-soft:#E8F4EE; --brand-ink:#0A5C42;
  --pos:#138A4C; --pos-soft:#E7F6EC; --neg:#D2342C; --neg-soft:#FCECEB;
  --shadow:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.06);
  --shadow-lg:0 8px 28px rgba(16,24,40,.09);
  --r:14px; --r-sm:10px;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  color:var(--ink); background:var(--canvas);
  min-height:100%; padding:22px 18px 40px;
  -webkit-font-smoothing:antialiased;
}
.ct-wrap{ max-width:1180px; margin:0 auto; }
.ct-num{ font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
.ct-disp{ font-family:'Plus Jakarta Sans',sans-serif; }

/* ---- top bar ---- */
.ct-top{ display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:22px; }
.ct-brand{ display:flex; align-items:center; gap:11px; }
.ct-logo{ width:38px; height:38px; border-radius:11px; background:var(--brand);
  display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(14,122,87,.28); flex:none; }
.ct-brand-name{ font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:18.5px; letter-spacing:-.02em; }
.ct-brand-sub{ font-size:11.5px; color:var(--muted); margin-top:-1px; }
.ct-top-right{ margin-left:auto; display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
.ct-mkt{ display:flex; align-items:center; gap:7px; font-size:12.5px; color:var(--ink-soft); font-weight:500;
  background:var(--surface); border:1px solid var(--border); padding:6px 11px; border-radius:999px; box-shadow:var(--shadow); }
.ct-dot{ width:7px; height:7px; border-radius:50%; background:var(--pos); flex:none; }
.ct-dot.off{ background:var(--muted-2); }
.ct-bal-mini{ text-align:right; }
.ct-bal-mini .l{ font-size:11px; color:var(--muted); letter-spacing:.03em; text-transform:uppercase; }
.ct-bal-mini .v{ font-family:'Plus Jakarta Sans',sans-serif; font-weight:700; font-size:19px; }

/* ---- hint ---- */
.ct-hint{ display:flex; align-items:center; gap:9px; font-size:12.5px; color:var(--brand-ink);
  background:var(--brand-soft); border:1px solid #CDE7DC; padding:8px 12px; border-radius:var(--r-sm);
  margin-bottom:18px; }
.ct-hint b{ font-weight:600; }
.ct-hint .x{ margin-left:auto; cursor:pointer; color:var(--brand-ink); opacity:.6; background:none; border:none;
  font-size:16px; line-height:1; padding:0 2px; }
.ct-hint .x:hover{ opacity:1; }

/* ---- editable ---- */
.ct-editable{ font:inherit; color:inherit; letter-spacing:inherit; background:none; border:none; padding:0 3px;
  margin:0 -1px; cursor:pointer; border-radius:6px; position:relative; display:inline-flex; align-items:center; }
.ct-editable:hover{ background:rgba(14,122,87,.08); box-shadow:inset 0 0 0 1px rgba(14,122,87,.35); }
.ct-editable:focus-visible{ outline:2px solid var(--brand); outline-offset:1px; }
.ct-pencil{ opacity:0; margin-left:4px; color:var(--brand); transition:opacity .12s; flex:none; }
.ct-editable:hover .ct-pencil{ opacity:.65; }
.ct-edit-input{ font:inherit; color:var(--ink); letter-spacing:inherit; background:#fff;
  border:1.5px solid var(--brand); border-radius:7px; padding:1px 5px; outline:none; min-width:2ch;
  box-shadow:0 0 0 3px rgba(14,122,87,.12); }

/* ---- stat cards ---- */
.ct-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; }
.ct-card{ background:var(--surface); border:1px solid var(--border); border-radius:var(--r);
  padding:17px 18px; box-shadow:var(--shadow); }
.ct-card-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; }
.ct-card-label{ font-size:11.5px; color:var(--muted); letter-spacing:.035em; text-transform:uppercase; font-weight:600; }
.ct-card-ic{ width:30px; height:30px; border-radius:9px; background:var(--brand-soft); color:var(--brand);
  display:flex; align-items:center; justify-content:center; flex:none; }
.ct-card-val{ font-family:'Plus Jakarta Sans',sans-serif; font-weight:700; font-size:28px; letter-spacing:-.025em; line-height:1.05; }
.ct-card-sub{ font-size:12.5px; color:var(--muted); margin-top:7px; display:flex; align-items:center; gap:6px; }
.ct-pill{ display:inline-flex; align-items:center; gap:3px; font-size:12px; font-weight:600; padding:2px 7px; border-radius:999px; }
.ct-pill.pos{ color:var(--pos); background:var(--pos-soft); }
.ct-pill.neg{ color:var(--neg); background:var(--neg-soft); }
.pos{ color:var(--pos); } .neg{ color:var(--neg); }
.ct-bar{ height:6px; border-radius:999px; background:#EEF1F4; overflow:hidden; margin-top:10px; }
.ct-bar > span{ display:block; height:100%; background:var(--brand); border-radius:999px; transition:width .3s; }

/* ---- main grid ---- */
.ct-main{ display:grid; grid-template-columns:1.9fr 1fr; gap:16px; margin-bottom:16px; }
.ct-panel{ background:var(--surface); border:1px solid var(--border); border-radius:var(--r);
  box-shadow:var(--shadow); overflow:hidden; }
.ct-panel-head{ display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:16px 18px 12px; }
.ct-panel-title{ font-family:'Plus Jakarta Sans',sans-serif; font-weight:700; font-size:15px; letter-spacing:-.01em; }
.ct-panel-note{ font-size:11.5px; color:var(--muted-2); }

/* ---- chart ---- */
.ct-periods{ display:flex; gap:4px; background:#F1F3F6; padding:3px; border-radius:9px; }
.ct-periods button{ font:inherit; font-size:12px; font-weight:600; color:var(--muted); background:none; border:none;
  padding:4px 10px; border-radius:6px; cursor:pointer; }
.ct-periods button.on{ background:#fff; color:var(--ink); box-shadow:var(--shadow); }
.ct-chart-box{ padding:4px 14px 16px; }
.ct-chart-svg{ display:block; width:100%; height:auto; touch-action:none; }
.ct-pt-hit{ cursor:grab; }
.ct-grabbing .ct-pt-hit{ cursor:grabbing; }
.ct-xlab{ font-family:'Inter',sans-serif; font-size:10.5px; fill:var(--muted-2); }

/* ---- live prices ---- */
.ct-live-list{ padding:4px 8px 10px; }
.ct-coin{ display:flex; align-items:center; gap:11px; padding:9px 10px; border-radius:10px; }
.ct-coin:hover{ background:#FAFBFC; }
.ct-coin-dot{ width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  color:#fff; font-weight:700; font-size:11px; flex:none; font-family:'Plus Jakarta Sans',sans-serif; }
.ct-coin-name{ font-weight:600; font-size:13.5px; }
.ct-coin-sym{ font-size:11px; color:var(--muted); }
.ct-coin-right{ margin-left:auto; text-align:right; }
.ct-coin-price{ font-weight:600; font-size:13.5px; }
.ct-chg{ font-size:11.5px; font-weight:600; display:inline-flex; align-items:center; gap:2px; justify-content:flex-end; }
.ct-skel{ height:13px; border-radius:6px; background:linear-gradient(90deg,#EEF1F4,#F6F8FA,#EEF1F4);
  background-size:200% 100%; }
.ct-live-foot{ padding:10px 18px 14px; border-top:1px solid var(--border); font-size:11px; color:var(--muted-2);
  display:flex; align-items:center; gap:6px; }

/* ---- traders ---- */
.ct-trader{ display:flex; align-items:center; gap:13px; padding:13px 18px; border-top:1px solid var(--border); }
.ct-trader:first-of-type{ border-top:none; }
.ct-av{ width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  color:#fff; font-weight:700; font-size:14px; flex:none; font-family:'Plus Jakarta Sans',sans-serif; }
.ct-trader-id{ min-width:0; }
.ct-trader-name{ font-weight:600; font-size:14px; }
.ct-trader-handle{ font-size:12px; color:var(--muted); }
.ct-trader-mid{ margin-left:auto; text-align:right; }
.ct-trader-roi{ font-weight:700; font-size:15px; font-family:'Plus Jakarta Sans',sans-serif; }
.ct-trader-cop{ font-size:11.5px; color:var(--muted); }
.ct-copy-btn{ font:inherit; font-size:12.5px; font-weight:600; padding:7px 15px; border-radius:9px; cursor:pointer;
  border:1px solid var(--brand); color:#fff; background:var(--brand); white-space:nowrap; }
.ct-copy-btn.off{ background:#fff; color:var(--brand); }
.ct-copy-btn:hover{ filter:brightness(.97); }
.ct-del{ font:inherit; width:26px; height:26px; border-radius:7px; border:1px solid var(--border-2); background:#fff;
  color:var(--muted); cursor:pointer; font-size:15px; line-height:1; opacity:0; flex:none; }
.ct-trader:hover .ct-del, .ct-trow:hover .ct-del{ opacity:1; }
.ct-del:hover{ color:var(--neg); border-color:var(--neg); background:var(--neg-soft); }
.ct-add{ font:inherit; font-size:13px; font-weight:600; color:var(--brand); background:var(--brand-soft);
  border:1px dashed #BFE0D2; border-radius:9px; padding:9px; width:100%; cursor:pointer; }
.ct-add:hover{ background:#DDF0E7; }

/* ---- trades table ---- */
.ct-table{ width:100%; border-collapse:collapse; }
.ct-table th{ font-size:11px; color:var(--muted); letter-spacing:.03em; text-transform:uppercase; font-weight:600;
  text-align:left; padding:8px 18px; border-bottom:1px solid var(--border); }
.ct-table th.r, .ct-table td.r{ text-align:right; }
.ct-trow td{ padding:12px 18px; border-bottom:1px solid var(--border); font-size:13.5px; }
.ct-trow:hover{ background:#FAFBFC; }
.ct-side{ font:inherit; font-size:12px; font-weight:600; padding:3px 9px; border-radius:7px; cursor:pointer; border:none; }
.ct-side.buy{ color:var(--pos); background:var(--pos-soft); }
.ct-side.sell{ color:var(--neg); background:var(--neg-soft); }
.ct-coin-tag{ font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; }
.ct-tfoot td{ padding:13px 18px; font-weight:700; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; }

/* ---- footer ---- */
.ct-foot{ margin-top:22px; display:flex; align-items:center; gap:14px; flex-wrap:wrap;
  font-size:11.5px; color:var(--muted-2); }
.ct-reset{ font:inherit; font-size:12.5px; font-weight:600; color:var(--ink-soft); background:#fff;
  border:1px solid var(--border-2); border-radius:9px; padding:7px 13px; cursor:pointer; }
.ct-reset:hover{ border-color:var(--neg); color:var(--neg); }

@media (prefers-reduced-motion: no-preference){
  .ct-dot{ animation:ctpulse 2s ease-in-out infinite; }
  .ct-skel{ animation:ctsh 1.3s linear infinite; }
}
@keyframes ctpulse{ 0%,100%{ box-shadow:0 0 0 0 rgba(19,138,76,.4);} 50%{ box-shadow:0 0 0 5px rgba(19,138,76,0);} }
@keyframes ctsh{ to{ background-position:-200% 0; } }

@media (max-width:920px){
  .ct-stats{ grid-template-columns:repeat(2,1fr); }
  .ct-main{ grid-template-columns:1fr; }
}
@media (max-width:560px){
  .ct-stats{ grid-template-columns:1fr; }
  .ct-root{ padding:16px 12px 32px; }
}
`;

/* ---------- helpers ---------- */
const num = (v, fb = 0) => {
  const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? fb : n;
};
const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const eur = (v) => `${nf0.format(Math.round(v))} €`;
const eurS = (v) => `${v >= 0 ? "+" : "−"}${nf0.format(Math.abs(Math.round(v)))} €`;
const pctS = (v) => `${v >= 0 ? "+" : "−"}${nf1.format(Math.abs(v))} %`;
const pct = (v) => `${nf1.format(v)} %`;
const intF = (v) => nf0.format(Math.round(v));
function priceF(v, sym) {
  let s;
  if (v >= 1000) s = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v);
  else if (v >= 1) s = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  else s = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(v);
  return sym === "$" ? `$ ${s}` : `${s} €`;
}
function niceCeil(v) {
  if (v <= 0) return 1000;
  const target = v * 1.18;
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const n = target / pow;
  let nice = 10;
  if (n <= 1) nice = 1; else if (n <= 2) nice = 2; else if (n <= 2.5) nice = 2.5; else if (n <= 5) nice = 5;
  return nice * pow;
}
function catmull(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d;
}

/* ---------- icons ---------- */
const Pencil = () => (
  <svg className="ct-pencil" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
    <path d="M4 20h4L18.5 9.5l-4-4L4 16v4z M14.5 5.5l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);
const I = {
  wallet: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M3 7h16a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H3" /><circle cx="16" cy="13" r="1" fill="currentColor" /></svg>,
  trend: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7" /><path d="M17 7h4v4" /></svg>,
  pct: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2" /><circle cx="17.5" cy="17.5" r="2" /></svg>,
  target: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>,
};
const Arrow = ({ up }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? "none" : "rotate(180deg)" }}><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></svg>
);

/* ---------- EditableValue ---------- */
function Edit({ value, onCommit, format, inputMode = "decimal", ariaLabel, style }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
  if (editing) {
    const w = Math.max(String(draft).length, 2) + 1;
    return (
      <input
        ref={ref} className="ct-edit-input ct-num" style={{ width: `${w}ch`, ...style }}
        value={draft} inputMode={inputMode}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onCommit(draft); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onCommit(draft); setEditing(false); }
          else if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }
  return (
    <button type="button" className="ct-editable" style={style} aria-label={ariaLabel}
      onClick={() => { setDraft(String(value)); setEditing(true); }}>
      <span>{format ? format(value) : value}</span>
      <Pencil />
    </button>
  );
}

/* ---------- Live crypto prices (REAL) ---------- */
const COINS = [
  { id: "bitcoin", sym: "BTC", name: "Bitcoin", b: "BTCUSDT", color: "#F7931A" },
  { id: "ethereum", sym: "ETH", name: "Ethereum", b: "ETHUSDT", color: "#627EEA" },
  { id: "solana", sym: "SOL", name: "Solana", b: "SOLUSDT", color: "#16B373" },
  { id: "binancecoin", sym: "BNB", name: "BNB", b: "BNBUSDT", color: "#D8A40B" },
  { id: "ripple", sym: "XRP", name: "XRP", b: "XRPUSDT", color: "#3A4A57" },
  { id: "dogecoin", sym: "DOGE", name: "Dogecoin", b: "DOGEUSDT", color: "#B89A2E" },
];

async function fetchPrices() {
  // 1) CoinGecko en EUR
  try {
    const ids = COINS.map((c) => c.id).join(",");
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`);
    if (!r.ok) throw 0;
    const d = await r.json();
    const out = COINS.map((c) => ({ ...c, price: d[c.id]?.eur, change: d[c.id]?.eur_24h_change })).filter((x) => x.price != null);
    if (out.length) return { rows: out, sym: "€" };
  } catch (e) {}
  // 2) Binance en USDT (repli)
  try {
    const symbols = JSON.stringify(COINS.map((c) => c.b));
    const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`);
    if (!r.ok) throw 0;
    const d = await r.json();
    const m = {}; d.forEach((t) => (m[t.symbol] = t));
    const out = COINS.map((c) => { const t = m[c.b]; return t ? { ...c, price: parseFloat(t.lastPrice), change: parseFloat(t.priceChangePercent) } : null; }).filter(Boolean);
    if (out.length) return { rows: out, sym: "$" };
  } catch (e) {}
  return null;
}

function LivePrices({ onStatus }) {
  const [rows, setRows] = useState(null);
  const [sym, setSym] = useState("€");
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const got = await fetchPrices();
      if (!alive) return;
      if (got) { setRows(got.rows); setSym(got.sym); setStatus("live"); onStatus && onStatus("live"); }
      else setStatus((p) => { const s = p === "live" ? "live" : "error"; onStatus && onStatus(s); return s; });
    };
    run();
    const t = setInterval(run, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return (
    <div className="ct-panel">
      <div className="ct-panel-head">
        <div className="ct-panel-title">Cours en direct</div>
        <div className="ct-mkt" style={{ boxShadow: "none", border: "none", background: "none", padding: 0 }}>
          <span className={"ct-dot" + (status === "live" ? "" : " off")} />
          <span style={{ fontSize: 11.5, color: status === "live" ? "var(--pos)" : "var(--muted)" }}>
            {status === "live" ? "en direct" : status === "loading" ? "chargement…" : "hors ligne"}
          </span>
        </div>
      </div>
      <div className="ct-live-list">
        {rows
          ? rows.map((c) => (
              <div className="ct-coin" key={c.sym}>
                <div className="ct-coin-dot" style={{ background: c.color }}>{c.sym.slice(0, 3)}</div>
                <div>
                  <div className="ct-coin-name">{c.name}</div>
                  <div className="ct-coin-sym">{c.sym}</div>
                </div>
                <div className="ct-coin-right">
                  <div className="ct-coin-price ct-num">{priceF(c.price, sym)}</div>
                  <div className={"ct-chg " + (c.change >= 0 ? "pos" : "neg")}>
                    <Arrow up={c.change >= 0} />{pctS(c.change)}
                  </div>
                </div>
              </div>
            ))
          : status === "error"
          ? <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Cours momentanément indisponibles — nouvelle tentative en cours.</div>
          : COINS.map((c, i) => (
              <div className="ct-coin" key={i}>
                <div className="ct-skel" style={{ width: 30, height: 30, borderRadius: "50%" }} />
                <div style={{ flex: 1 }}><div className="ct-skel" style={{ width: "55%" }} /><div className="ct-skel" style={{ width: "32%", marginTop: 6, height: 10 }} /></div>
                <div className="ct-skel" style={{ width: 64, height: 16 }} />
              </div>
            ))}
      </div>
      <div className="ct-live-foot">
        <span className={"ct-dot" + (status === "live" ? "" : " off")} style={{ animation: "none" }} />
        Prix réels du marché crypto · actualisés toutes les 30 s
      </div>
    </div>
  );
}

/* ---------- Equity chart (draggable) ---------- */
function EquityChart({ values, setValues }) {
  const svgRef = useRef(null);
  const domainRef = useRef({ min: 0, max: 100 });
  const [drag, setDrag] = useState(null);

  const W = 760, H = 300, padL = 16, padR = 16, padT = 26, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB, n = values.length;
  const live = { min: 0, max: niceCeil(Math.max(...values, 1)) };
  const domain = drag != null ? domainRef.current : live;
  const X = (i) => padL + (n <= 1 ? 0 : (i * innerW) / (n - 1));
  const Y = (v) => padT + (1 - (v - domain.min) / (domain.max - domain.min)) * innerH;
  const pts = values.map((v, i) => ({ x: X(i), y: Y(v), v, i }));
  const line = catmull(pts);
  const area = `${line} L ${X(n - 1)} ${padT + innerH} L ${X(0)} ${padT + innerH} Z`;
  const labels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

  const valFromY = (clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const vbY = ((clientY - rect.top) / rect.height) * H;
    let v = domain.min + (1 - (vbY - padT) / innerH) * (domain.max - domain.min);
    return Math.round(Math.max(domain.min, Math.min(domain.max, v)));
  };
  useEffect(() => {
    if (drag == null) return;
    const move = (e) => { setValues((prev) => { const a = [...prev]; a[drag] = valFromY(e.clientY); return a; }); };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [drag]);

  const up = values[n - 1] >= values[0];
  const stroke = up ? "var(--brand)" : "var(--neg)";

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={"ct-chart-svg" + (drag != null ? " ct-grabbing" : "")} role="img" aria-label="Courbe de performance modifiable">
      <defs>
        <linearGradient id="ctArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={up ? "#0E7A57" : "#D2342C"} stopOpacity="0.16" />
          <stop offset="100%" stopColor={up ? "#0E7A57" : "#D2342C"} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line key={i} x1={padL} x2={W - padR} y1={padT + f * innerH} y2={padT + f * innerH} stroke="#EDF0F3" strokeWidth="1" strokeDasharray="3 4" />
      ))}
      <path d={area} fill="url(#ctArea)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p) => (
        <g key={p.i}>
          {drag === p.i && (
            <g>
              <rect x={Math.max(2, Math.min(W - 76, p.x - 38))} y={Math.max(2, p.y - 32)} width="76" height="22" rx="6" fill="#15171C" />
              <text x={Math.max(40, Math.min(W - 38, p.x))} y={Math.max(17, p.y - 17)} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#fff" fontFamily="Inter">{eur(p.v)}</text>
            </g>
          )}
          <circle cx={p.x} cy={p.y} r={drag === p.i ? 6.5 : 4.5} fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <circle className="ct-pt-hit" cx={p.x} cy={p.y} r="16" fill="transparent" onPointerDown={(e) => { e.preventDefault(); domainRef.current = { min: 0, max: niceCeil(Math.max(...values, 1)) }; setDrag(p.i); }} />
        </g>
      ))}
      {labels.slice(0, n).map((l, i) => (i % 2 === 0 ? <text key={i} className="ct-xlab" x={X(i)} y={H - 10} textAnchor="middle">{l}</text> : null))}
    </svg>
  );
}

/* ---------- defaults ---------- */
const DEFAULT = {
  brand: "CopyVault",
  balance: 48250,
  profit: 12480,
  profitPct: 34.9,
  roi: 28.6,
  winRate: 72,
  tradesCount: 248,
  period: "3M",
  chart: [21000, 23500, 22800, 26000, 29500, 28200, 32000, 35500, 34000, 39000, 44500, 48250],
  traders: [
    { id: 1, name: "Yanis Crypto", handle: "yanis_btc", roi: 212.4, copiers: 2156, color: "#7C3AED", copying: true },
    { id: 2, name: "Kasper SMC", handle: "kasper_smc", roi: 147.2, copiers: 1284, color: "#0E7A57", copying: true },
    { id: 3, name: "Léa Markets", handle: "lea_fx", roi: 89.6, copiers: 842, color: "#2563EB", copying: false },
    { id: 4, name: "Nora Quant", handle: "nora_quant", roi: 54.1, copiers: 463, color: "#EA580C", copying: false },
  ],
  trades: [
    { id: 1, coin: "BTC", side: "Achat", amount: 5000, entry: 58420, pnl: 842 },
    { id: 2, coin: "ETH", side: "Achat", amount: 3200, entry: 2980, pnl: 316 },
    { id: 3, coin: "SOL", side: "Vente", amount: 1800, entry: 172, pnl: -94 },
    { id: 4, coin: "BNB", side: "Achat", amount: 2400, entry: 612, pnl: 208 },
  ],
};

/* ---------- App ---------- */
export default function App() {
  const [s, setS] = useState(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [hint, setHint] = useState(true);
  const [resetArm, setResetArm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const r = await window.storage.get(KEY);
          if (r && r.value) setS({ ...DEFAULT, ...JSON.parse(r.value) });
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { try { window.storage && window.storage.set(KEY, JSON.stringify(s)); } catch (e) {} }, 400);
    return () => clearTimeout(t);
  }, [s, loaded]);

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const setTrader = (id, k, v) => setS((p) => ({ ...p, traders: p.traders.map((t) => (t.id === id ? { ...t, [k]: v } : t)) }));
  const setTrade = (id, k, v) => setS((p) => ({ ...p, trades: p.trades.map((t) => (t.id === id ? { ...t, [k]: v } : t)) }));
  const addTrader = () => setS((p) => ({ ...p, traders: [...p.traders, { id: Date.now(), name: "Nouveau trader", handle: "pseudo", roi: 0, copiers: 0, color: "#0E7A57", copying: false }] }));
  const delTrader = (id) => setS((p) => ({ ...p, traders: p.traders.filter((t) => t.id !== id) }));
  const addTrade = () => setS((p) => ({ ...p, trades: [...p.trades, { id: Date.now(), coin: "BTC", side: "Achat", amount: 1000, entry: 0, pnl: 0 }] }));
  const delTrade = (id) => setS((p) => ({ ...p, trades: p.trades.filter((t) => t.id !== id) }));
  const doReset = () => { setS(DEFAULT); setResetArm(false); try { window.storage && window.storage.delete(KEY); } catch (e) {} };

  const totalPnl = s.trades.reduce((a, t) => a + (t.pnl || 0), 0);

  return (
    <div className="ct-root">
      <style>{CSS}</style>
      <div className="ct-wrap">

        {/* top bar */}
        <div className="ct-top">
          <div className="ct-brand">
            <div className="ct-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16l5-5 4 4 7-8" /><path d="M19 7h2v2" /></svg>
            </div>
            <div>
              <div className="ct-brand-name"><Edit value={s.brand} onCommit={(v) => set("brand", v.trim() || "CopyVault")} ariaLabel="Nom de la plateforme" /></div>
              <div className="ct-brand-sub">Copy trading</div>
            </div>
          </div>
          <div className="ct-top-right">
            <div className="ct-mkt"><span className="ct-dot" /> Marché ouvert</div>
            <div className="ct-bal-mini">
              <div className="l">Solde total</div>
              <div className="v ct-num"><Edit value={s.balance} onCommit={(v) => set("balance", num(v, s.balance))} format={eur} ariaLabel="Solde" /></div>
            </div>
          </div>
        </div>

        {/* hint */}
        {hint && (
          <div className="ct-hint">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            <span><b>Astuce —</b> clique sur n'importe quel chiffre pour le modifier · glisse les points du graphique pour redessiner la courbe.</span>
            <button className="x" onClick={() => setHint(false)} aria-label="Fermer">×</button>
          </div>
        )}

        {/* stats */}
        <div className="ct-stats">
          <div className="ct-card">
            <div className="ct-card-head"><span className="ct-card-label">Solde total</span><span className="ct-card-ic">{I.wallet}</span></div>
            <div className="ct-card-val ct-num"><Edit value={s.balance} onCommit={(v) => set("balance", num(v, s.balance))} format={eur} /></div>
            <div className="ct-card-sub">Capital disponible</div>
          </div>
          <div className="ct-card">
            <div className="ct-card-head"><span className="ct-card-label">Profit total</span><span className="ct-card-ic">{I.trend}</span></div>
            <div className={"ct-card-val ct-num " + (s.profit >= 0 ? "pos" : "neg")}><Edit value={s.profit} onCommit={(v) => set("profit", num(v, s.profit))} format={eurS} /></div>
            <div className="ct-card-sub">
              <span className={"ct-pill " + (s.profitPct >= 0 ? "pos" : "neg")}><Arrow up={s.profitPct >= 0} /><Edit value={s.profitPct} onCommit={(v) => set("profitPct", num(v, s.profitPct))} format={(x) => pctS(x).replace(/[+−]/, "")} /></span>
              ce mois
            </div>
          </div>
          <div className="ct-card">
            <div className="ct-card-head"><span className="ct-card-label">Rendement (ROI)</span><span className="ct-card-ic">{I.pct}</span></div>
            <div className={"ct-card-val ct-num " + (s.roi >= 0 ? "pos" : "neg")}><Edit value={s.roi} onCommit={(v) => set("roi", num(v, s.roi))} format={pctS} /></div>
            <div className="ct-card-sub">Depuis le départ</div>
          </div>
          <div className="ct-card">
            <div className="ct-card-head"><span className="ct-card-label">Taux de réussite</span><span className="ct-card-ic">{I.target}</span></div>
            <div className="ct-card-val ct-num"><Edit value={s.winRate} onCommit={(v) => set("winRate", Math.max(0, Math.min(100, num(v, s.winRate))))} format={(x) => `${nf0.format(x)} %`} /></div>
            <div className="ct-bar"><span style={{ width: `${Math.max(0, Math.min(100, s.winRate))}%` }} /></div>
            <div className="ct-card-sub" style={{ marginTop: 8 }}>Sur <Edit value={s.tradesCount} onCommit={(v) => set("tradesCount", Math.round(num(v, s.tradesCount)))} format={intF} /> trades</div>
          </div>
        </div>

        {/* chart + live */}
        <div className="ct-main">
          <div className="ct-panel">
            <div className="ct-panel-head">
              <div>
                <div className="ct-panel-title">Performance du portefeuille</div>
                <div className="ct-panel-note">Glisse un point pour modifier la courbe</div>
              </div>
              <div className="ct-periods">
                {["1S", "1M", "3M", "1A", "Tout"].map((p) => (
                  <button key={p} className={s.period === p ? "on" : ""} onClick={() => set("period", p)}>{p}</button>
                ))}
              </div>
            </div>
            <div className="ct-chart-box">
              <EquityChart values={s.chart} setValues={(fn) => setS((p) => ({ ...p, chart: typeof fn === "function" ? fn(p.chart) : fn }))} />
            </div>
          </div>
          <LivePrices />
        </div>

        {/* traders */}
        <div className="ct-panel" style={{ marginBottom: 16 }}>
          <div className="ct-panel-head">
            <div className="ct-panel-title">Traders copiés</div>
            <div className="ct-panel-note">{s.traders.filter((t) => t.copying).length} actifs</div>
          </div>
          <div>
            {s.traders.map((t) => (
              <div className="ct-trader" key={t.id}>
                <div className="ct-av" style={{ background: t.color }}>{t.name.trim().slice(0, 2).toUpperCase()}</div>
                <div className="ct-trader-id">
                  <div className="ct-trader-name"><Edit value={t.name} onCommit={(v) => setTrader(t.id, "name", v.trim() || "Trader")} /></div>
                  <div className="ct-trader-handle">@<Edit value={t.handle} onCommit={(v) => setTrader(t.id, "handle", v.trim().replace(/^@/, ""))} /></div>
                </div>
                <div className="ct-trader-mid">
                  <div className={"ct-trader-roi " + (t.roi >= 0 ? "pos" : "neg")}><Edit value={t.roi} onCommit={(v) => setTrader(t.id, "roi", num(v, t.roi))} format={pctS} /></div>
                  <div className="ct-trader-cop"><Edit value={t.copiers} onCommit={(v) => setTrader(t.id, "copiers", Math.max(0, Math.round(num(v, t.copiers))))} format={intF} /> copieurs</div>
                </div>
                <button className={"ct-copy-btn" + (t.copying ? "" : " off")} onClick={() => setTrader(t.id, "copying", !t.copying)}>{t.copying ? "Copié" : "Copier"}</button>
                <button className="ct-del" onClick={() => delTrader(t.id)} aria-label="Supprimer">×</button>
              </div>
            ))}
            <div style={{ padding: "12px 18px" }}><button className="ct-add" onClick={addTrader}>+ Ajouter un trader</button></div>
          </div>
        </div>

        {/* trades */}
        <div className="ct-panel">
          <div className="ct-panel-head">
            <div className="ct-panel-title">Mes positions</div>
            <div className="ct-panel-note">Registre des opérations</div>
          </div>
          <table className="ct-table">
            <thead>
              <tr><th>Crypto</th><th>Sens</th><th className="r">Montant</th><th className="r">Prix d'entrée</th><th className="r">Gain / Perte</th><th></th></tr>
            </thead>
            <tbody>
              {s.trades.map((t) => (
                <tr className="ct-trow" key={t.id}>
                  <td><span className="ct-coin-tag"><Edit value={t.coin} onCommit={(v) => setTrade(t.id, "coin", v.trim().toUpperCase() || "BTC")} /></span></td>
                  <td><button className={"ct-side " + (t.side === "Achat" ? "buy" : "sell")} onClick={() => setTrade(t.id, "side", t.side === "Achat" ? "Vente" : "Achat")}>{t.side}</button></td>
                  <td className="r ct-num"><Edit value={t.amount} onCommit={(v) => setTrade(t.id, "amount", num(v, t.amount))} format={eur} /></td>
                  <td className="r ct-num"><Edit value={t.entry} onCommit={(v) => setTrade(t.id, "entry", num(v, t.entry))} format={(x) => priceF(x, "€")} /></td>
                  <td className={"r ct-num " + (t.pnl >= 0 ? "pos" : "neg")} style={{ fontWeight: 600 }}><Edit value={t.pnl} onCommit={(v) => setTrade(t.id, "pnl", num(v, t.pnl))} format={eurS} /></td>
                  <td className="r"><button className="ct-del" onClick={() => delTrade(t.id)} aria-label="Supprimer">×</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="ct-tfoot">
                <td colSpan={4}>Total</td>
                <td className={"r ct-num " + (totalPnl >= 0 ? "pos" : "neg")}>{eurS(totalPnl)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <div style={{ padding: "12px 18px" }}><button className="ct-add" onClick={addTrade}>+ Ajouter une position</button></div>
        </div>

        {/* footer */}
        <div className="ct-foot">
          <button className="ct-reset" onClick={() => (resetArm ? doReset() : setResetArm(true))} onBlur={() => setResetArm(false)}>
            {resetArm ? "Confirmer la réinitialisation ?" : "Réinitialiser le tableau de bord"}
          </button>
          <span>Cours de marché réels et en direct. Soldes, profits, traders et positions sont fictifs et modifiables — usage démonstratif.</span>
        </div>
      </div>
    </div>
  );
}
