import { useState, useEffect, useRef } from "react";

const PROXY = "https://corsproxy.io/?url=";
const SHOW_API = "https://mlb26.theshow.com/apis/listings.json";
const TAX = 0.9;

async function showFetch(params) {
  const qs = new URLSearchParams({ type: "mlb_card", ...params });
  const target = `${SHOW_API}?${qs}`;
  const r = await fetch(PROXY + encodeURIComponent(target));
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function askClaude(messages, system) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || r.status); }
  const d = await r.json();
  return d.content?.[0]?.text || "No response.";
}

const fmt = (n) => {
  if (n == null || isNaN(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.round(n).toLocaleString();
};
const pct = (n) => (n == null || isNaN(n) ? "—" : (n >= 0 ? "+" : "") + n.toFixed(1) + "%");

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body,#root{background:#07090d;min-height:100vh}
.app{min-height:100vh;background:#07090d;color:#d4dce8;font-family:'Manrope',sans-serif;font-size:13px;line-height:1.4}
.hdr{background:#0a0d12;border-bottom:1px solid #161d28;padding:11px 20px;display:flex;align-items:center;gap:20px}
.logo{font-family:'Orbitron',monospace;font-size:16px;font-weight:900;letter-spacing:3px;color:#c9a227;text-transform:uppercase}
.logo em{color:#fff;font-style:normal}
.sub{font-family:'JetBrains Mono';font-size:9px;color:#3a4a5e;letter-spacing:1.5px;margin-top:3px}
.hval{font-family:'JetBrains Mono';font-size:14px;font-weight:600;margin-top:1px}
.hlbl{font-family:'JetBrains Mono';font-size:9px;color:#3a4a5e;text-transform:uppercase;letter-spacing:1px}
.navs{background:#080b0f;border-bottom:1px solid #161d28;display:flex;padding:0 20px;gap:2px}
.nav{background:none;border:none;border-bottom:2px solid transparent;padding:9px 15px;font-family:'JetBrains Mono';font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:#3a4a5e;cursor:pointer;transition:all .15s}
.nav:hover{color:#7a8a9e}
.nav.on{color:#c9a227;border-bottom-color:#c9a227}
.pg{padding:16px 20px;max-width:1200px}
.panel{background:#0a0d12;border:1px solid #161d28;border-radius:8px;padding:14px;margin-bottom:13px}
.ptitle{font-family:'JetBrains Mono';font-size:10px;font-weight:600;color:#3a4a5e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px;display:flex;align-items:center;gap:7px}
.ptitle::before{content:'';display:inline-block;width:3px;height:11px;background:#c9a227;border-radius:2px}
.sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:13px}
.sbox{background:#0a0d12;border:1px solid #161d28;border-radius:8px;padding:12px 14px}
.slbl{font-family:'JetBrains Mono';font-size:9px;color:#3a4a5e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:5px}
.sval{font-family:'JetBrains Mono';font-size:18px;font-weight:600}
.ssub{font-size:11px;margin-top:2px;color:#3a4a5e}
.row{display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
input[type=text],input[type=number]{background:#060810;border:1px solid #161d28;border-radius:6px;color:#d4dce8;padding:7px 11px;font-size:13px;font-family:'Manrope';outline:none;transition:border-color .15s}
input:focus{border-color:#c9a227}
.btn{padding:7px 14px;border-radius:6px;font-size:10px;font-weight:700;font-family:'JetBrains Mono';letter-spacing:.5px;cursor:pointer;border:none;transition:all .15s;text-transform:uppercase}
.bg{background:#c9a227;color:#06090d}
.bg:hover{background:#ddb82e}
.bg:disabled{background:#2e2410;color:#5a4820;cursor:not-allowed}
.bo{background:transparent;border:1px solid #161d28;color:#5a6a7e}
.bo:hover{border-color:#c9a227;color:#c9a227}
.br{background:transparent;border:1px solid #261010;color:#ef4444;padding:4px 8px;font-size:10px}
.br:hover{background:#261010}
.bsm{padding:4px 10px;font-size:10px}
.sres{background:#060810;border:1px solid #161d28;border-radius:6px;max-height:190px;overflow-y:auto;margin-bottom:10px}
.sri{display:flex;align-items:center;gap:8px;padding:7px 11px;cursor:pointer;border-bottom:1px solid #0e1218;transition:background .1s}
.sri:last-child{border-bottom:none}
.sri:hover{background:#0c1020}
.sri.sel{background:#121c2e;border-left:2px solid #c9a227}
.ovr{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono';font-size:9px;font-weight:700;background:#c9a22718;color:#c9a227;border:1px solid #c9a22740;flex-shrink:0}
table{width:100%;border-collapse:collapse}
th{font-family:'JetBrains Mono';font-size:9px;font-weight:600;color:#3a4a5e;text-transform:uppercase;letter-spacing:1px;padding:7px 8px;text-align:left;border-bottom:1px solid #161d28}
td{padding:7px 8px;border-bottom:1px solid #0e1218;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#0b0f16}
.mn{font-family:'JetBrains Mono';font-size:12px}
.g{color:#22c55e}.rd{color:#ef4444}.gl{color:#c9a227}.mu{color:#3a4a5e}
.badge{display:inline-block;padding:2px 6px;border-radius:3px;font-family:'JetBrains Mono';font-size:9px;font-weight:700}
.bg-g{background:#0a1e10;color:#22c55e;border:1px solid #143a20}
.bg-r{background:#1c0808;color:#ef4444;border:1px solid #380e0e}
.bg-b{background:#0a1226;color:#60a5fa;border:1px solid #12204a}
.bg-o{background:#1c1200;color:#c9a227;border:1px solid #362200}
.empty{text-align:center;padding:28px;color:#242e3a;font-family:'JetBrains Mono';font-size:12px}
.spin{display:inline-block;width:10px;height:10px;border:2px solid #161d28;border-top-color:#c9a227;border-radius:50%;animation:sp .6s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.err{color:#ef4444;font-size:11px;font-family:'JetBrains Mono';padding:6px 10px;background:#180808;border:1px solid #380e0e;border-radius:4px;margin-top:8px}
.pbar{height:3px;background:#161d28;border-radius:2px;margin-top:10px}
.pfill{height:100%;background:#c9a227;border-radius:2px;transition:width .2s}
.chat{height:320px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.msg{max-width:88%;padding:9px 13px;border-radius:7px;line-height:1.55;font-size:13px;white-space:pre-wrap}
.umsg{background:#121c2e;border:1px solid #1c2e44;align-self:flex-end}
.amsg{background:#0c1320;border:1px solid #161d28;border-left:2px solid #c9a227;align-self:flex-start;color:#b0c0d0}
.ldmsg{align-self:flex-start;color:#3a4a5e;font-style:italic;font-size:12px;display:flex;align-items:center;gap:6px}
.qps{display:flex;flex-wrap:wrap;gap:5px;padding:8px 12px;border-bottom:1px solid #161d28}
.qb{padding:4px 9px;background:#0a0d12;border:1px solid #161d28;border-radius:4px;color:#5a6a7e;font-size:10px;font-family:'JetBrains Mono';cursor:pointer;transition:all .1s}
.qb:hover{border-color:#c9a227;color:#c9a227}
.cirow{display:flex;gap:8px;padding:9px 12px;border-top:1px solid #161d28}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:#07090d}
::-webkit-scrollbar-thumb{background:#161d28;border-radius:3px}
`;

// ── PORTFOLIO TAB ──────────────────────────────────────────────────────────
function PortfolioTab({ portfolio, setPortfolio }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [sel, setSel] = useState(null);
  const [bp, setBp] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  async function search() {
    if (!q.trim()) return;
    setLoading(true); setErr(""); setRes([]);
    try {
      const d = await showFetch({ name: q.trim(), page: 1 });
      const items = d.listings?.slice(0, 10) || [];
      setRes(items);
      if (!items.length) setErr("No cards found. Try a different name.");
    } catch { setErr("API unavailable — CORS proxy may be down. Try again."); }
    setLoading(false);
  }

  function addCard() {
    if (!sel || !bp) return;
    const card = {
      id: String(Date.now()),
      name: sel.listing_name,
      uuid: sel.item?.uuid,
      ovr: sel.item?.ovr,
      team: sel.item?.team_short_name,
      series: sel.item?.series,
      img: sel.item?.img,
      buyPrice: parseFloat(bp),
      buyDate: new Date().toISOString().split("T")[0],
      currentSellPrice: sel.best_sell_price || 0,
      currentBuyPrice: sel.best_buy_price || 0,
      updatedAt: Date.now(),
    };
    setPortfolio(p => [...p, card]);
    setSel(null); setRes([]); setQ(""); setBp("");
  }

  async function refreshAll() {
    if (!portfolio.length) return;
    setRefreshing(true);
    const updated = [...portfolio];
    for (let i = 0; i < updated.length; i++) {
      try {
        const words = updated[i].name.split(" ").slice(0, 2).join(" ");
        const d = await showFetch({ name: words, page: 1 });
        const match = d.listings?.find(l => l.item?.uuid === updated[i].uuid) || d.listings?.[0];
        if (match) updated[i] = { ...updated[i], currentSellPrice: match.best_sell_price || 0, currentBuyPrice: match.best_buy_price || 0, updatedAt: Date.now() };
      } catch {}
    }
    setPortfolio(updated);
    setRefreshing(false);
  }

  const totalCost = portfolio.reduce((s, c) => s + (c.buyPrice || 0), 0);
  const totalVal = portfolio.reduce((s, c) => s + (c.currentSellPrice || 0) * TAX, 0);
  const totalPnL = totalVal - totalCost;
  const totalPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return (
    <>
      <div className="sgrid">
        {[
          { l: "Total Invested", v: fmt(totalCost), s: "stubs cost basis", c: "#d4dce8" },
          { l: "Market Value", v: fmt(totalVal), s: "after 10% tax", c: "#d4dce8" },
          { l: "Unrealized P&L", v: (totalPnL >= 0 ? "+" : "") + fmt(totalPnL), s: pct(totalPct), c: totalPnL >= 0 ? "#22c55e" : "#ef4444" },
          { l: "Cards Held", v: portfolio.length, s: "open positions", c: "#c9a227" },
        ].map(s => (
          <div key={s.l} className="sbox">
            <div className="slbl">{s.l}</div>
            <div className="sval" style={{ color: s.c }}>{s.v}</div>
            <div className="ssub">{s.s}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="ptitle">Add Card to Portfolio</div>
        <div className="row">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="Search player name (e.g. Shohei Ohtani)..." style={{ flex: 1 }} />
          <button className="btn bg" onClick={search} disabled={loading}>{loading ? <span className="spin" /> : "Search"}</button>
        </div>
        {res.length > 0 && (
          <div className="sres">
            {res.map(r => (
              <div key={r.listing_name} className={`sri ${sel?.listing_name === r.listing_name ? "sel" : ""}`} onClick={() => { setSel(r); setBp(String(r.best_sell_price || "")); }}>
                {r.item?.img && <img src={r.item.img} style={{ width: 30, height: 30, objectFit: "contain" }} alt="" />}
                <div className="ovr">{r.item?.ovr}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{r.listing_name}</div>
                  <div className="mu" style={{ fontSize: 11 }}>{r.item?.series} · {r.item?.team_short_name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mn g" style={{ fontSize: 11 }}>BID {fmt(r.best_buy_price)}</div>
                  <div className="mn rd" style={{ fontSize: 11 }}>ASK {fmt(r.best_sell_price)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {sel && (
          <div className="row">
            <span className="gl" style={{ fontWeight: 700 }}>{sel.listing_name}</span>
            <span className="mu">· Your actual buy price:</span>
            <input type="number" value={bp} onChange={e => setBp(e.target.value)} style={{ width: 120 }} />
            <button className="btn bg" onClick={addCard} disabled={!bp}>+ Add to Portfolio</button>
            <button className="btn bo bsm" onClick={() => { setSel(null); }}>Cancel</button>
          </div>
        )}
        {err && <div className="err">{err}</div>}
      </div>

      <div className="panel">
        <div className="ptitle" style={{ justifyContent: "space-between" }}>
          <span>Holdings</span>
          <button className="btn bo bsm" onClick={refreshAll} disabled={refreshing || !portfolio.length}>
            {refreshing ? <><span className="spin" /> Refreshing...</> : "↻ Refresh All Prices"}
          </button>
        </div>
        {!portfolio.length ? (
          <div className="empty">No positions. Search and add cards above to start tracking P&L.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Card</th>
                  <th>OVR</th>
                  <th>Series</th>
                  <th style={{ textAlign: "right" }}>Bought At</th>
                  <th style={{ textAlign: "right" }}>Mkt Ask</th>
                  <th style={{ textAlign: "right" }}>Net Sell</th>
                  <th style={{ textAlign: "right" }}>P&L</th>
                  <th style={{ textAlign: "right" }}>P&L %</th>
                  <th style={{ textAlign: "right" }}>Bought</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map(c => {
                  const net = (c.currentSellPrice || 0) * TAX;
                  const pl = net - (c.buyPrice || 0);
                  const pp = c.buyPrice > 0 ? (pl / c.buyPrice) * 100 : 0;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          {c.img && <img src={c.img} style={{ width: 24, height: 24, objectFit: "contain" }} alt="" />}
                          <span style={{ fontWeight: 600 }}>{c.name}</span>
                        </div>
                      </td>
                      <td><div className="ovr" style={{ margin: "0 auto" }}>{c.ovr}</div></td>
                      <td><span className="badge bg-b">{(c.series || "").slice(0, 14)}</span></td>
                      <td className="mn" style={{ textAlign: "right" }}>{fmt(c.buyPrice)}</td>
                      <td className="mn" style={{ textAlign: "right" }}>{fmt(c.currentSellPrice)}</td>
                      <td className="mn" style={{ textAlign: "right" }}>{fmt(Math.round(net))}</td>
                      <td className={`mn ${pl >= 0 ? "g" : "rd"}`} style={{ textAlign: "right", fontWeight: 700 }}>
                        {pl >= 0 ? "+" : ""}{fmt(Math.round(pl))}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className={`badge ${pp >= 0 ? "bg-g" : "bg-r"}`}>{pct(pp)}</span>
                      </td>
                      <td className="mu mn" style={{ textAlign: "right", fontSize: 10 }}>{c.buyDate}</td>
                      <td><button className="btn br" onClick={() => setPortfolio(p => p.filter(x => x.id !== c.id))}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── SCANNER TAB ────────────────────────────────────────────────────────────
function ScannerTab({ portfolio, setPortfolio }) {
  const [name, setName] = useState("");
  const [pages, setPages] = useState(5);
  const [results, setResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState("");
  const abortRef = useRef(false);

  async function scan() {
    setScanning(true); setErr(""); setResults([]); setProg(0);
    abortRef.current = false;
    const opps = [];
    try {
      for (let p = 1; p <= pages; p++) {
        if (abortRef.current) break;
        const params = { page: p };
        if (name.trim()) params.name = name.trim();
        const d = await showFetch(params);
        const listings = d.listings || [];
        if (!listings.length) break;
        for (const l of listings) {
          if (!l.best_buy_price || !l.best_sell_price) continue;
          const profit = Math.round(l.best_buy_price * TAX - l.best_sell_price);
          const spread = l.best_sell_price - l.best_buy_price;
          const spreadPct = l.best_sell_price > 0 ? (spread / l.best_sell_price) * 100 : 0;
          const roi = l.best_sell_price > 0 ? (profit / l.best_sell_price) * 100 : 0;
          opps.push({ ...l, profit, spread, spreadPct, roi });
        }
        setProg(Math.round((p / pages) * 100));
      }
      opps.sort((a, b) => b.profit - a.profit);
      setResults(opps.slice(0, 60));
      if (!opps.length) setErr("No results. API may be rate-limited — try fewer pages or add a player name filter.");
    } catch (e) { setErr("Scan failed: " + e.message); }
    setScanning(false); setProg(0);
  }

  return (
    <>
      <div className="panel">
        <div className="ptitle">Scanner Config</div>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div>
            <div className="slbl" style={{ marginBottom: 4 }}>Player/Card Name (optional)</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Blank = scan all cards" style={{ width: 200 }} />
          </div>
          <div>
            <div className="slbl" style={{ marginBottom: 4 }}>Pages to Scan</div>
            <input type="number" value={pages} min={1} max={25} onChange={e => setPages(+e.target.value || 1)} style={{ width: 80 }} />
          </div>
          <button className="btn bg" onClick={scan} disabled={scanning}>
            {scanning ? <><span className="spin" /> Scanning {prog}%...</> : "Scan Market"}
          </button>
          {scanning && <button className="btn bo" onClick={() => abortRef.current = true}>Stop</button>}
        </div>
        {scanning && <div className="pbar"><div className="pfill" style={{ width: prog + "%" }} /></div>}
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#060810", borderRadius: 6, border: "1px solid #161d28" }}>
          <div className="slbl" style={{ marginBottom: 4 }}>Profit Formula</div>
          <div style={{ fontSize: 11, color: "#3a4a5e", fontFamily: "JetBrains Mono", lineHeight: 1.7 }}>
            Buy at ASK → Sell to highest BID order → After 10% tax: BID × 0.9<br />
            <span className="gl">Profit = BID × 0.9 − ASK</span> · Positive values = instant arbitrage · Negative = patience flip opportunity
          </div>
        </div>
        {err && <div className="err">{err}</div>}
      </div>

      {results.length > 0 && (
        <div className="panel">
          <div className="ptitle">{results.length} listings · sorted by flip profit</div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Card</th>
                  <th>OVR</th>
                  <th style={{ textAlign: "right" }}>ASK (Buy Now)</th>
                  <th style={{ textAlign: "right" }}>BID (Sell To)</th>
                  <th style={{ textAlign: "right" }}>Net After Tax</th>
                  <th style={{ textAlign: "right" }}>Profit</th>
                  <th style={{ textAlign: "right" }}>ROI</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        {r.item?.img && <img src={r.item.img} style={{ width: 24, height: 24, objectFit: "contain" }} alt="" />}
                        <span style={{ fontWeight: 600 }}>{r.listing_name}</span>
                      </div>
                    </td>
                    <td><div className="ovr">{r.item?.ovr}</div></td>
                    <td className="mn rd" style={{ textAlign: "right" }}>{fmt(r.best_sell_price)}</td>
                    <td className="mn g" style={{ textAlign: "right" }}>{fmt(r.best_buy_price)}</td>
                    <td className="mn" style={{ textAlign: "right" }}>{fmt(Math.round(r.best_buy_price * TAX))}</td>
                    <td className={`mn ${r.profit >= 0 ? "g" : "rd"}`} style={{ textAlign: "right", fontWeight: 700 }}>
                      {r.profit >= 0 ? "+" : ""}{fmt(r.profit)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${r.roi >= 0 ? "bg-g" : "bg-r"}`}>{pct(r.roi)}</span>
                    </td>
                    <td>
                      <button className="btn bo bsm" onClick={() => {
                        if (portfolio.find(p => p.uuid === r.item?.uuid)) return;
                        setPortfolio(p => [...p, {
                          id: String(Date.now()), name: r.listing_name, uuid: r.item?.uuid,
                          ovr: r.item?.ovr, team: r.item?.team_short_name, series: r.item?.series,
                          img: r.item?.img, buyPrice: r.best_sell_price || 0,
                          buyDate: new Date().toISOString().split("T")[0],
                          currentSellPrice: r.best_sell_price || 0, currentBuyPrice: r.best_buy_price || 0,
                          updatedAt: Date.now(),
                        }]);
                      }}>+ Track</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── AI ADVISOR TAB ─────────────────────────────────────────────────────────
function AdvisorTab({ portfolio }) {
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    text: "What's up Wyatt 👋 I'm your SHOWFLIP market advisor. I have full visibility into your portfolio — cost basis, current prices, and unrealized P&L on every card. Ask me what to sell, what to hold, flip targets, or which cards are likely to spike.",
  }]);
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs]);

  const buildSystem = () => {
    const cards = portfolio.map(c => {
      const net = (c.currentSellPrice || 0) * TAX;
      const pl = net - (c.buyPrice || 0);
      const pp = c.buyPrice > 0 ? ((pl / c.buyPrice) * 100).toFixed(1) : "N/A";
      return `• ${c.name} (${c.ovr} OVR, ${c.series || "?"}) — Cost: ${c.buyPrice?.toLocaleString()} | Mkt Ask: ${c.currentSellPrice?.toLocaleString()} | Net sell: ${Math.round(net).toLocaleString()} | P&L: ${pl >= 0 ? "+" : ""}${Math.round(pl).toLocaleString()} (${pp}%) | Bought: ${c.buyDate}`;
    }).join("\n") || "Empty portfolio.";

    return `You are SHOWFLIP AI, an expert MLB The Show 26 Diamond Dynasty market analyst. You help users maximize stubs through strategic card flipping, smart investments, and portfolio management.

User: Wyatt — active Diamond Dynasty trader and card flipper.

Current portfolio (${portfolio.length} positions):
${cards}

Core rules to always remember:
- 10% marketplace tax on all sales: net proceeds = sell_price × 0.9
- Flip profit = best_buy_price × 0.9 − best_sell_price (positive = instant arb)
- Diamond (85+ OVR) and Live Series cards dominate volume
- Program releases and Team Affinity drops cause temporary price spikes
- 99 OVR meta cards typically 30K–100K+ stubs; 95-98 OVR: 5K-20K; 90-94: 1K-5K
- Weekend Warrior and monthly programs affect position-specific demand
- Market is most active Fri–Sun; spreads tighten on new program releases

Be direct, specific, and data-driven. Reference actual stub amounts and percentages from the portfolio data. Format responses clearly. Keep it concise and actionable.`;
  };

  async function send(text) {
    if (!text.trim() || busy) return;
    const newMsgs = [...msgs, { role: "user", text }];
    setMsgs(newMsgs); setInp(""); setBusy(true);
    try {
      const apiMsgs = newMsgs.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      const reply = await askClaude(apiMsgs, buildSystem());
      setMsgs(p => [...p, { role: "assistant", text: reply }]);
    } catch (e) { setMsgs(p => [...p, { role: "assistant", text: `⚠️ API error: ${e.message}` }]); }
    setBusy(false);
  }

  const QUICK = ["What should I sell right now?", "Analyze my full portfolio", "Best flip strategy today?", "Which cards might spike soon?", "What's my worst hold?"];

  return (
    <div className="panel" style={{ padding: 0 }}>
      <div style={{ padding: "11px 14px", borderBottom: "1px solid #161d28" }}>
        <div className="ptitle" style={{ margin: 0 }}>AI Market Advisor · Claude-Powered · Portfolio Context Injected</div>
      </div>
      <div className="qps">
        {QUICK.map(q => <button key={q} className="qb" onClick={() => send(q)}>{q}</button>)}
      </div>
      <div className="chat" ref={ref}>
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "umsg" : "amsg"}`}>{m.text}</div>
        ))}
        {busy && <div className="ldmsg"><span className="spin" /> Analyzing market data...</div>}
      </div>
      <div className="cirow">
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && send(inp)} placeholder="Ask about your portfolio, flip targets, upcoming programs..." style={{ flex: 1 }} />
        <button className="btn bg" onClick={() => send(inp)} disabled={busy || !inp.trim()}>Send ↵</button>
      </div>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("portfolio");
  const [portfolio, setPortfolio] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    (async () => {
      try {
        const r = await window.storage.get("sfp-v2");
        if (r?.value) setPortfolio(JSON.parse(r.value));
      } catch {}
      setReady(true);
    })();
    return () => document.head.removeChild(s);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.storage.set("sfp-v2", JSON.stringify(portfolio)).catch(() => {});
  }, [portfolio, ready]);

  const totalCost = portfolio.reduce((s, c) => s + (c.buyPrice || 0), 0);
  const totalVal = portfolio.reduce((s, c) => s + (c.currentSellPrice || 0) * TAX, 0);
  const totalPnL = totalVal - totalCost;

  return (
    <div className="app">
      <div className="hdr">
        <div>
          <div className="logo">Show<em>Flip</em> Portfolio</div>
          <div className="sub">MLB THE SHOW 26 · MARKET INTELLIGENCE SYSTEM</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
          <div style={{ textAlign: "right" }}>
            <div className="hlbl">Portfolio Value</div>
            <div className="hval" style={{ color: "#d4dce8" }}>{fmt(totalVal)} stubs</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="hlbl">Unrealized P&L</div>
            <div className="hval" style={{ color: totalPnL >= 0 ? "#22c55e" : "#ef4444" }}>
              {totalPnL >= 0 ? "+" : ""}{fmt(totalPnL)} ({pct(totalCost > 0 ? (totalPnL / totalCost) * 100 : 0)})
            </div>
          </div>
        </div>
      </div>

      <div className="navs">
        {[{ id: "portfolio", label: "Portfolio" }, { id: "scanner", label: "Flip Scanner" }, { id: "advisor", label: "AI Advisor" }].map(t => (
          <button key={t.id} className={`nav ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="pg">
        {tab === "portfolio" && <PortfolioTab portfolio={portfolio} setPortfolio={setPortfolio} />}
        {tab === "scanner" && <ScannerTab portfolio={portfolio} setPortfolio={setPortfolio} />}
        {tab === "advisor" && <AdvisorTab portfolio={portfolio} />}
      </div>
    </div>
  );
}
