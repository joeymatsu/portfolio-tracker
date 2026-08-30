const STORAGE_KEY = "portfolioTracker.v1";
const SETTINGS_KEY = "portfolioTracker.settings.v1";
const AUTO_REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
let autoRefreshTimer = null;

const state = {
  holdings: [],
  settings: { usdJpy: 147.0, theme: "light" },
  filters: { search: "", market: "ALL", asset: "ALL" }
};

const $ = (id) => document.getElementById(id);
const el = {
  totalValue: $("totalValue"),
  totalValueSub: $("totalValueSub"),
  totalCost: $("totalCost"),
  totalPL: $("totalPL"),
  totalPLPct: $("totalPLPct"),
  holdingCount: $("holdingCount"),
  holdingsBody: $("holdingsBody"),
  emptyState: $("emptyState"),
  addHoldingBtn: $("addHoldingBtn"),
  emptyAddBtn: $("emptyAddBtn"),
  dialog: $("holdingDialog"),
  form: $("holdingForm"),
  closeDialogBtn: $("closeDialogBtn"),
  cancelBtn: $("cancelBtn"),
  deleteBtn: $("deleteBtn"),
  ticker: $("ticker"),
  name: $("name"),
  market: $("market"),
  assetType: $("assetType"),
  quantity: $("quantity"),
  currency: $("currency"),
  buyPrice: $("buyPrice"),
  currentPrice: $("currentPrice"),
  holdingId: $("holdingId"),
  formTitle: $("formTitle"),
  formEyebrow: $("formEyebrow"),
  searchInput: $("searchInput"),
  marketFilter: $("marketFilter"),
  assetFilter: $("assetFilter"),
  usdJpyInput: $("usdJpyInput"),
  themeToggle: $("themeToggle"),
  exportBtn: $("exportBtn"),
  importInput: $("importInput"),
  refreshBtn: $("refreshBtn")
};

function load() {
  try {
    state.holdings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    state.settings = { ...state.settings, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
  } catch (_) {}
  el.usdJpyInput.value = state.settings.usdJpy;
  document.body.classList.toggle("dark", state.settings.theme === "dark");
  render();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.holdings));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function money(value, currency = "JPY") {
  return new Intl.NumberFormat(currency === "JPY" ? "ja-JP" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2
  }).format(value || 0);
}

function number(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value || 0);
}

function pct(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function toJPY(value, currency) {
  return currency === "USD" ? value * Number(state.settings.usdJpy || 0) : value;
}

function holdingMetrics(h) {
  const costLocal = h.quantity * h.buyPrice;
  const valueLocal = h.quantity * h.currentPrice;
  const plLocal = valueLocal - costLocal;
  const plPct = costLocal ? (plLocal / costLocal) * 100 : 0;
  return {
    costLocal,
    valueLocal,
    plLocal,
    plPct,
    costJPY: toJPY(costLocal, h.currency),
    valueJPY: toJPY(valueLocal, h.currency),
    plJPY: toJPY(plLocal, h.currency)
  };
}

function filteredHoldings() {
  const q = state.filters.search.toLowerCase().trim();
  return state.holdings.filter(h => {
    const matchesSearch = !q || h.ticker.toLowerCase().includes(q) || (h.name || "").toLowerCase().includes(q);
    const matchesMarket = state.filters.market === "ALL" || h.market === state.filters.market;
    const matchesAsset = state.filters.asset === "ALL" || h.assetType === state.filters.asset;
    return matchesSearch && matchesMarket && matchesAsset;
  });
}

function render() {
  const totals = state.holdings.reduce((acc, h) => {
    const m = holdingMetrics(h);
    acc.cost += m.costJPY;
    acc.value += m.valueJPY;
    acc.pl += m.plJPY;
    return acc;
  }, { cost: 0, value: 0, pl: 0 });

  el.totalValue.textContent = money(totals.value, "JPY");
  el.totalValueSub.textContent = money(totals.value / Number(state.settings.usdJpy || 1), "USD");
  el.totalCost.textContent = money(totals.cost, "JPY");
  el.totalPL.textContent = `${totals.pl >= 0 ? "+" : ""}${money(totals.pl, "JPY")}`;
  el.totalPL.className = totals.pl >= 0 ? "pl-positive" : "pl-negative";
  const totalPct = totals.cost ? totals.pl / totals.cost * 100 : 0;
  el.totalPLPct.textContent = pct(totalPct);
  el.holdingCount.textContent = state.holdings.length;

  const rows = filteredHoldings();
  el.holdingsBody.innerHTML = rows.map(h => {
    const m = holdingMetrics(h);
    const cls = m.plLocal >= 0 ? "pl-positive" : "pl-negative";
    const sign = m.plLocal >= 0 ? "+" : "";
    const short = h.assetType === "Mutual Fund" ? "MF" : h.assetType === "ETF" ? "ETF" : h.market;
    return `
      <tr>
        <td>
          <div class="asset">
            <div class="asset-badge">${escapeHtml(short)}</div>
            <div class="asset-meta">
              <strong>${escapeHtml(h.ticker)}</strong>
              <span>${escapeHtml(h.name || h.assetType)}</span>
            </div>
          </div>
        </td>
        <td><span class="market-pill">${h.market} · ${escapeHtml(h.assetType)}</span></td>
        <td>${number(h.quantity)}</td>
        <td>${money(h.buyPrice, h.currency)}</td>
        <td>${money(h.currentPrice, h.currency)}
          <span class="quote-meta"><span class="status-dot ${h.quoteSource ? "" : "manual"}"></span>${escapeHtml(h.quoteSource || "Manual")}${h.lastUpdated ? " · " + new Date(h.lastUpdated).toLocaleString() : ""}</span>
        </td>
        <td>${money(m.valueLocal, h.currency)}</td>
        <td class="${cls}">
          ${sign}${money(m.plLocal, h.currency)}
          <div>${pct(m.plPct)}</div>
        </td>
        <td><button class="row-action" onclick="editHolding('${h.id}')" aria-label="Edit">•••</button></td>
      </tr>`;
  }).join("");

  el.emptyState.classList.toggle("hidden", rows.length > 0);
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

function openAdd() {
  el.form.reset();
  el.holdingId.value = "";
  el.formTitle.textContent = "Add holding";
  el.formEyebrow.textContent = "NEW POSITION";
  el.market.value = "JP";
  el.currency.value = "JPY";
  el.assetType.value = "Stock";
  el.deleteBtn.classList.add("hidden");
  el.dialog.showModal();
}

window.editHolding = function(id) {
  const h = state.holdings.find(x => x.id === id);
  if (!h) return;
  el.holdingId.value = h.id;
  el.ticker.value = h.ticker;
  el.name.value = h.name || "";
  el.market.value = h.market;
  el.assetType.value = h.assetType;
  el.quantity.value = h.quantity;
  el.currency.value = h.currency;
  el.buyPrice.value = h.buyPrice;
  el.currentPrice.value = h.currentPrice;
  el.formTitle.textContent = "Edit holding";
  el.formEyebrow.textContent = "POSITION";
  el.deleteBtn.classList.remove("hidden");
  el.dialog.showModal();
}

function closeDialog() { el.dialog.close(); }

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = el.holdingId.value || crypto.randomUUID();
  const holding = {
    id,
    ticker: el.ticker.value.trim().toUpperCase(),
    name: el.name.value.trim(),
    market: el.market.value,
    assetType: el.assetType.value,
    quantity: Number(el.quantity.value),
    currency: el.currency.value,
    buyPrice: Number(el.buyPrice.value),
    currentPrice: Number(el.currentPrice.value),
    quoteSource: (state.holdings.find(h => h.id === id) || {}).quoteSource || null,
    lastUpdated: (state.holdings.find(h => h.id === id) || {}).lastUpdated || null
  };
  const idx = state.holdings.findIndex(h => h.id === id);
  if (idx >= 0) state.holdings[idx] = holding;
  else state.holdings.push(holding);
  save();
  render();
  closeDialog();
});

el.deleteBtn.addEventListener("click", () => {
  const id = el.holdingId.value;
  state.holdings = state.holdings.filter(h => h.id !== id);
  save();
  render();
  closeDialog();
});

el.addHoldingBtn.addEventListener("click", openAdd);
el.emptyAddBtn.addEventListener("click", openAdd);
el.closeDialogBtn.addEventListener("click", closeDialog);
el.cancelBtn.addEventListener("click", closeDialog);

el.market.addEventListener("change", () => {
  el.currency.value = el.market.value === "JP" ? "JPY" : "USD";
});

el.searchInput.addEventListener("input", e => {
  state.filters.search = e.target.value;
  render();
});
el.marketFilter.addEventListener("change", e => {
  state.filters.market = e.target.value;
  render();
});
el.assetFilter.addEventListener("change", e => {
  state.filters.asset = e.target.value;
  render();
});
el.usdJpyInput.addEventListener("input", e => {
  state.settings.usdJpy = Number(e.target.value) || 0;
  save();
  render();
});
el.themeToggle.addEventListener("click", () => {
  state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
  document.body.classList.toggle("dark", state.settings.theme === "dark");
  save();
});

el.exportBtn.addEventListener("click", () => {
  const headers = ["ticker","name","market","assetType","quantity","currency","buyPrice","currentPrice"];
  const escapeCsv = v => `"${String(v ?? "").replaceAll('"','""')}"`;
  const csv = [headers.join(","), ...state.holdings.map(h => headers.map(k => escapeCsv(h[k])).join(","))].join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "portfolio.csv";
  a.click();
  URL.revokeObjectURL(url);
});

el.importInput.addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return;
  const parseLine = line => {
    const out = [];
    let cur = "", quoted = false;
    for (let i=0; i<line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]);
  state.holdings = lines.slice(1).map(line => {
    const vals = parseLine(line);
    const obj = Object.fromEntries(headers.map((h,i) => [h, vals[i] ?? ""]));
    return {
      id: crypto.randomUUID(),
      ticker: obj.ticker || "",
      name: obj.name || "",
      market: obj.market || "JP",
      assetType: obj.assetType || "Stock",
      quantity: Number(obj.quantity || 0),
      currency: obj.currency || (obj.market === "US" ? "USD" : "JPY"),
      buyPrice: Number(obj.buyPrice || 0),
      currentPrice: Number(obj.currentPrice || 0),
      quoteSource: null,
      lastUpdated: null
    };
  });
  save();
  render();
  e.target.value = "";
});


load();


async function refreshHolding(h) {
  const params = new URLSearchParams({ ticker: h.ticker, market: h.market, assetType: h.assetType });
  const r = await fetch(`/api/quote?${params}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Quote lookup failed");
  h.currentPrice = Number(data.price);
  if (data.currency) h.currency = data.currency;
  if (!h.name && data.name) h.name = data.name;
  h.quoteSource = data.source || "Automatic";
  h.lastUpdated = Date.now();
  return data;
}

async function refreshAll({ silent = false } = {}) {
  if (!state.holdings.length) return;
  const oldText = el.refreshBtn.textContent;
  if (!silent) {
    el.refreshBtn.classList.add("refreshing");
    el.refreshBtn.disabled = true;
    el.refreshBtn.textContent = "Refreshing…";
  }

  let ok = 0, failed = 0;
  // Sequential on purpose: friendlier to free public endpoints.
  for (const h of state.holdings) {
    try { await refreshHolding(h); ok++; }
    catch (e) { failed++; console.warn(h.ticker, e.message); }
  }

  state.settings.lastAutoRefresh = new Date().toISOString();
  save();
  render();

  if (!silent) {
    el.refreshBtn.classList.remove("refreshing");
    el.refreshBtn.disabled = false;
    el.refreshBtn.textContent = failed ? `↻ Refreshed ${ok}; ${failed} manual` : `✓ Prices refreshed`;
    setTimeout(() => { el.refreshBtn.textContent = oldText; }, 2200);
  }
}

el.refreshBtn.addEventListener("click", refreshAll);


function startAutomaticRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);

  // Refresh once when the app opens.
  refreshAll({ silent: true }).catch(() => {});

  // Refresh periodically while the app remains open.
  autoRefreshTimer = setInterval(() => {
    refreshAll({ silent: true }).catch(() => {});
  }, AUTO_REFRESH_INTERVAL_MS);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    const last = state.settings.lastAutoRefresh
      ? new Date(state.settings.lastAutoRefresh).getTime()
      : 0;
    if (Date.now() - last >= AUTO_REFRESH_INTERVAL_MS) {
      refreshAll({ silent: true }).catch(() => {});
    }
  }
});

window.addEventListener("load", startAutomaticRefresh);
