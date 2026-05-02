/* ── CONFIG ── */
const SUPABASE_URL = 'https://difumwahbazkoglmtnon.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZXMHYB4buYuBFLaboNmECA_zA34o6pI';

// Guard: verificar que la libreria de Supabase cargo antes de usarla
if (typeof window.supabase === 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loadingState');
    if (loading) {
      loading.innerHTML = `
        <div style="text-align:center;max-width:400px;margin:0 auto;padding:40px;">
          <div style="font-size:2rem;margin-bottom:16px;">⚠️</div>
          <h3 style="color:var(--red);margin-bottom:8px;">No se pudo cargar Supabase</h3>
          <p style="color:var(--muted)">
            Es probable que un ad-blocker o extension de navegador esté bloqueando
            la librería de Supabase. Intentá desactivarlas para este sitio o probá
            con otro navegador.
          </p>
          <p style="color:var(--muted2);font-size:.75rem;margin-top:16px;">
            Error: window.supabase is undefined
          </p>
        </div>
      `;
    }
  });
  throw new Error('Supabase library not loaded. Aborting app.');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── STATE ── */
let state = {
  page: 1, perPage: 50, total: 0,
  sortBy: 'market_cap', sortDir: 'desc',
  filters: {}, searchQuery: '',
  activeColumns: ['ticker','market_cap','ev_fcf','p_e','p_bv','revenue','adj_fcf','fcf_margin','roe','rsi_14','perf_1m','perf_3m','going_concern'],
};

const ALL_COLUMNS = [
  { key:'ticker',         label:'Ticker',       fmt:'ticker', always:true },
  { key:'market_cap',     label:'Mkt Cap',       fmt:'money_m' },
  { key:'ev_fcf',         label:'EV/FCF',        fmt:'ratio' },
  { key:'p_e',            label:'P/E',           fmt:'ratio' },
  { key:'p_bv',           label:'P/BV',          fmt:'ratio' },
  { key:'p_ocf',          label:'P/OCF',         fmt:'ratio' },
  { key:'p_s',            label:'P/S',           fmt:'ratio' },
  { key:'ev_revenue',     label:'EV/Rev',        fmt:'ratio' },
  { key:'revenue',        label:'Revenue',       fmt:'money_m' },
  { key:'net_income',     label:'Net Income',    fmt:'money_m_signed' },
  { key:'ocf',            label:'OCF',           fmt:'money_m_signed' },
  { key:'adj_fcf',        label:'Adj FCF',       fmt:'money_m_signed' },
  { key:'capex',          label:'CapEx',         fmt:'money_m' },
  { key:'net_debt',       label:'Net Debt',      fmt:'money_m_signed' },
  { key:'equity',         label:'Equity',        fmt:'money_m' },
  { key:'fcf_margin',     label:'FCF Margin',    fmt:'pct' },
  { key:'roe',            label:'ROE',           fmt:'pct' },
  { key:'roa',            label:'ROA',           fmt:'pct' },
  { key:'accrual_ratio',  label:'Accrual',       fmt:'decimal' },
  { key:'debt_equity',    label:'D/E',           fmt:'ratio' },
  { key:'revenue_growth_yoy', label:'Rev Grw', fmt:'pct_signed' },
  { key:'fcf_growth_yoy', label:'FCF Grw',       fmt:'pct_signed' },
  { key:'rsi_14',         label:'RSI(14)',        fmt:'decimal' },
  { key:'perf_1m',        label:'1M %',          fmt:'pct_signed' },
  { key:'perf_3m',        label:'3M %',          fmt:'pct_signed' },
  { key:'perf_6m',        label:'6M %',          fmt:'pct_signed' },
  { key:'perf_1y',        label:'1Y %',          fmt:'pct_signed' },
  { key:'precio_vs_52w_high', label:'vs 52W H', fmt:'pct_signed' },
  { key:'beta',           label:'Beta',          fmt:'decimal' },
  { key:'short_float_pct',label:'Short %',       fmt:'pct' },
  { key:'insider_ownership', label:'Insider%',   fmt:'pct' },
  { key:'sector',         label:'Sector',        fmt:'pill' },
  { key:'going_concern',  label:'⚠ GC',          fmt:'flag' },
  { key:'cash_runway_months', label:'Cash Mo.',  fmt:'decimal' },
  { key:'ultimo_precio_date', label:'Updated',   fmt:'date' },
];

/* ── FORMAT HELPERS ── */
function fmt(value, type) {
  if (value === null || value === undefined) return '<span class="val-na">—</span>';
  switch (type) {
    case 'money_m': {
      const m = value / 1e6;
      const cls = 'val-neutral';
      return `<span class="${cls}">${m >= 1000 ? (m/1000).toFixed(1)+'B' : m.toFixed(1)+'M'}</span>`;
    }
    case 'money_m_signed': {
      const m = value / 1e6;
      const cls = value >= 0 ? 'val-positive' : 'val-negative';
      const s = m >= 1000 ? (m/1000).toFixed(1)+'B' : m.toFixed(1)+'M';
      return `<span class="${cls}">${value >= 0 ? '' : '-'}${Math.abs(m) >= 1000 ? (Math.abs(m)/1000).toFixed(1)+'B' : Math.abs(m).toFixed(1)+'M'}</span>`;
    }
    case 'ratio': {
      if (value <= 0) return '<span class="val-na">N/A</span>';
      const cls = value < 15 ? 'val-positive' : value < 30 ? 'val-neutral' : 'val-negative';
      return `<span class="${cls}">${value.toFixed(1)}x</span>`;
    }
    case 'pct':
      return `<span class="val-neutral">${value.toFixed(1)}%</span>`;
    case 'pct_signed': {
      const cls = value > 0 ? 'val-positive' : value < 0 ? 'val-negative' : 'val-neutral';
      return `<span class="${cls}">${value > 0 ? '+' : ''}${value.toFixed(1)}%</span>`;
    }
    case 'decimal':
      return `<span class="val-neutral">${value.toFixed(2)}</span>`;
    case 'pill':
      return `<span class="sector-pill" title="${value}">${value}</span>`;
    case 'flag':
      return value ? '<span class="flag-badge">⚠ GC</span>' : '<span class="val-na">—</span>';
    case 'date':
      return `<span class="val-neutral">${value ? value.substring(0,10) : '—'}</span>`;
    default: return value;
  }
}

/* ── TOAST ── */
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast show ${type}`;
  setTimeout(() => t.className = 'toast', 3000);
}

/* ── VIEWS ── */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.getElementById(`nav-${name}`).classList.add('active');
  if (name === 'dashboard') loadDashboard();
}

/* ── SIDEBAR TOGGLE ── */
document.getElementById('sidebarToggle').onclick = () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
};

/* ── COLUMN CHIPS ── */
function renderColChips() {
  const container = document.getElementById('colChips');
  container.innerHTML = '';
  ALL_COLUMNS.filter(c => !c.always).forEach(col => {
    const chip = document.createElement('button');
    chip.className = 'col-chip' + (state.activeColumns.includes(col.key) ? ' active' : '');
    chip.textContent = col.label;
    chip.onclick = () => {
      if (state.activeColumns.includes(col.key)) {
        state.activeColumns = state.activeColumns.filter(k => k !== col.key);
      } else {
        state.activeColumns.push(col.key);
      }
      chip.classList.toggle('active');
      renderTableHeader();
      fetchStocks();
    };
    container.appendChild(chip);
  });
}

/* ── TABLE HEADER ── */
function renderTableHeader() {
  const cols = ALL_COLUMNS.filter(c => state.activeColumns.includes(c.key) || c.always);
  const thead = document.getElementById('tableHead');
  thead.innerHTML = '<tr>' + cols.map(col => {
    const sorted = state.sortBy === col.key;
    const arrow = sorted ? (state.sortDir === 'desc' ? '↓' : '↑') : '↕';
    return `<th class="${sorted ? 'sorted' : ''}" onclick="setSort('${col.key}')">
      ${col.label} <span class="sort-arrow">${arrow}</span>
    </th>`;
  }).join('') + '</tr>';
}

/* ── FETCH & RENDER STOCKS ── */
async function fetchStocks() {
  document.getElementById('loadingState').style.display = 'flex';
  document.getElementById('screenerTable').style.display = 'none';

  try {
    let query = supabase.from('stocks').select('*', { count: 'exact' })
      .not.is('nombre', null);   // Solo mostrar empresas con datos cargados

    const f = state.filters;
    if (f.minCap)        query = query.gte('market_cap', f.minCap * 1e6);
    if (f.maxCap)        query = query.lte('market_cap', f.maxCap * 1e6);
    if (f.sector)        query = query.eq('sector', f.sector);
    if (f.minEvFcf)      query = query.gte('ev_fcf', f.minEvFcf);
    if (f.maxEvFcf)      query = query.lte('ev_fcf', f.maxEvFcf);
    if (f.maxPE)         query = query.lte('p_e', f.maxPE);
    if (f.minFcfMargin)  query = query.gte('fcf_margin', f.minFcfMargin);
    if (f.rsiMin)        query = query.gte('rsi_14', f.rsiMin);
    if (f.rsiMax)        query = query.lte('rsi_14', f.rsiMax);
    if (f.goingConcern)  query = query.eq('going_concern', true);

    if (state.searchQuery) {
      query = query.or(`ticker.ilike.%${state.searchQuery}%,nombre.ilike.%${state.searchQuery}%`);
    }

    query = query.order(state.sortBy, { ascending: state.sortDir === 'asc', nullsFirst: false });
    
    const from = (state.page - 1) * state.perPage;
    const to = from + state.perPage - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    console.log('DEBUG Supabase response:', { dataLength: data ? data.length : 0, count, error });
    if (error) throw error;
    
    state.total = count || 0;
    renderTable(data);
    renderPagination(Math.ceil(state.total / state.perPage));
    document.getElementById('totalCount').textContent = state.total.toLocaleString();
  } catch (e) {
    console.error('DEBUG Supabase error:', e);
    showToast('Supabase error: ' + e.message, 'error');
  } finally {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('screenerTable').style.display = 'table';
  }
}

function renderTable(stocks) {
  const cols = ALL_COLUMNS.filter(c => state.activeColumns.includes(c.key) || c.always);
  const tbody = document.getElementById('tableBody');

  if (!stocks || !stocks.length) {
    tbody.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center;padding:40px;color:var(--muted)">No stocks match the current filters</td></tr>`;
    return;
  }

  tbody.innerHTML = stocks.map(s => {
    const cells = cols.map(col => {
      if (col.key === 'ticker') {
        return `<td><div class="ticker-cell">
          <span class="ticker-sym">${s.ticker}</span>
          <span class="ticker-name" title="${s.nombre || ''}">${s.nombre || ''}</span>
        </div></td>`;
      }
      return `<td>${fmt(s[col.key], col.fmt)}</td>`;
    });
    return `<tr onclick="openDetail('${s.ticker}')">${cells.join('')}</tr>`;
  }).join('');
}

/* ── SORT ── */
function setSort(col) {
  if (state.sortBy === col) {
    state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
  } else {
    state.sortBy = col; state.sortDir = 'desc';
  }
  state.page = 1;
  renderTableHeader();
  fetchStocks();
}

/* ── PAGINATION ── */
function renderPagination(pages) {
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  const p = state.page;
  let html = `<button class="page-btn" onclick="goPage(${p-1})" ${p<=1?'disabled':''}>←</button>`;
  const start = Math.max(1, p-2), end = Math.min(pages, p+2);
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i===p?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<span class="page-info">of ${pages}</span>`;
  html += `<button class="page-btn" onclick="goPage(${p+1})" ${p>=pages?'disabled':''}>→</button>`;
  el.innerHTML = html;
}
function goPage(p) { state.page = p; fetchStocks(); }

/* ── FILTERS ── */
function applyFilters() {
  state.filters = {
    minCap:       +document.getElementById('minCap').value || null,
    maxCap:       +document.getElementById('maxCap').value || null,
    sector:       document.getElementById('filterSector').value || null,
    minEvFcf:     +document.getElementById('minEvFcf').value || null,
    maxEvFcf:     +document.getElementById('maxEvFcf').value || null,
    maxPE:        +document.getElementById('maxPE').value || null,
    minFcfMargin: +document.getElementById('minFcfMargin').value || null,
    rsiMin:       +document.getElementById('rsiMin').value || null,
    rsiMax:       +document.getElementById('rsiMax').value || null,
    goingConcern: document.getElementById('filterGoingConcern').checked || null,
  };
  state.page = 1;
  fetchStocks();
}

function resetFilters() {
  ['minCap','maxCap','minEvFcf','maxEvFcf','maxPE','minFcfMargin','rsiMin','rsiMax'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('filterSector').value = '';
  document.getElementById('filterGoingConcern').checked = false;
  document.getElementById('filterNoDilution').checked = false;
  state.filters = {};
  state.page = 1;
  fetchStocks();
}

function setCapPreset(min, max) {
  document.getElementById('minCap').value = min || '';
  document.getElementById('maxCap').value = max || '';
  applyFilters();
}
function setRSI(min, max) {
  document.getElementById('rsiMin').value = min;
  document.getElementById('rsiMax').value = max;
  applyFilters();
}

/* ── SEARCH ── */
let _searchTimer;
function debounceSearch() {
  clearTimeout(_searchTimer);
  state.searchQuery = document.getElementById('searchInput').value;
  _searchTimer = setTimeout(() => { state.page = 1; fetchStocks(); }, 400);
}

/* ── SECTORS DROPDOWN ── */
async function loadSectors() {
  try {
    const { data, error } = await supabase.from('stocks').select('sector');
    if (error) return;
    const counts = {};
    data.forEach(d => {
      const s = d.sector || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    const sorted = Object.entries(counts).map(([sector, count]) => ({sector, count})).sort((a,b) => b.count - a.count);
    
    const sel = document.getElementById('filterSector');
    sorted.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.sector === 'Unknown' ? '' : s.sector; 
      opt.textContent = `${s.sector} (${s.count})`;
      sel.appendChild(opt);
    });
  } catch(e) {}
}

/* ── STATUS BAR ── */
async function loadStatus() {
  try {
    const { data, error } = await supabase.from('update_log').select('timestamp').order('timestamp', { ascending: false }).limit(1);
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (!error && data && data.length > 0) {
      dot.className = 'status-dot ok';
      const d2 = new Date(data[0].timestamp);
      txt.textContent = `Updated ${d2.toLocaleDateString()}`;
    } else {
      txt.textContent = 'No data yet';
    }
  } catch(e) {
    document.getElementById('statusText').textContent = 'API offline';
  }
}

/* ── TRIGGER UPDATE ── */
async function triggerUpdate() {
  showToast('Prices are updated via the python backend script', 'neutral');
}

/* ── STOCK DETAIL MODAL ── */
async function openDetail(ticker) {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modalContent').innerHTML = '<div style="padding:40px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const { data: s, error } = await supabase.from('stocks').select('*').eq('ticker', ticker).single();
    if (error || !s) throw new Error('Not found');
    renderModal(s);
  } catch(e) {
    document.getElementById('modalContent').innerHTML = `<p style="padding:24px;color:var(--red)">Error loading ${ticker}</p>`;
  }
}

function renderModal(s) {
  const formatM = v => v != null ? (Math.abs(v)/1e6).toFixed(1) + (v < 0 ? 'M (neg)' : 'M') : '—';
  const formatR = v => v != null && v > 0 ? v.toFixed(1) + 'x' : 'N/A';
  const formatPct = v => v != null ? v.toFixed(1) + '%' : '—';

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-ticker">${s.ticker}</div>
      <div class="modal-name">${s.nombre || 'Unknown Company'}</div>
      <div class="modal-meta">
        ${s.sector ? `<span class="modal-pill">${s.sector}</span>` : ''}
        ${s.industria ? `<span class="modal-pill">${s.industria}</span>` : ''}
        ${s.exchange ? `<span class="modal-pill">${s.exchange}</span>` : ''}
        ${s.tipo_empresa ? `<span class="modal-pill">${s.tipo_empresa}</span>` : ''}
        ${s.going_concern ? '<span class="flag-badge">⚠ Going Concern</span>' : ''}
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Market Data</div>
      <div class="metrics-grid">
        <div class="metric-box"><div class="metric-label">Price</div><div class="metric-value">${s.precio != null ? '$' + s.precio.toFixed(2) : '—'}</div></div>
        <div class="metric-box"><div class="metric-label">Market Cap</div><div class="metric-value">${s.market_cap != null ? '$' + (s.market_cap/1e6).toFixed(1) + 'M' : '—'}</div></div>
        <div class="metric-box"><div class="metric-label">Enterprise Value</div><div class="metric-value">${s.ev != null ? '$' + (s.ev/1e6).toFixed(1) + 'M' : '—'}</div></div>
        <div class="metric-box"><div class="metric-label">RSI (14)</div><div class="metric-value ${s.rsi_14 < 30 ? 'good' : s.rsi_14 > 70 ? 'bad' : ''}">${s.rsi_14 != null ? s.rsi_14.toFixed(1) : '—'}</div></div>
        <div class="metric-box"><div class="metric-label">52W High</div><div class="metric-value">${s.high_52w != null ? '$'+s.high_52w.toFixed(2) : '—'}</div></div>
        <div class="metric-box"><div class="metric-label">vs 52W High</div><div class="metric-value ${s.precio_vs_52w_high < -50 ? 'good' : ''}">${formatPct(s.precio_vs_52w_high)}</div></div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Valuation</div>
      <div class="metrics-grid">
        <div class="metric-box"><div class="metric-label">EV / FCF</div><div class="metric-value ${s.ev_fcf > 0 && s.ev_fcf < 15 ? 'good' : s.ev_fcf > 30 ? 'bad' : ''}">${formatR(s.ev_fcf)}</div></div>
        <div class="metric-box"><div class="metric-label">P/E</div><div class="metric-value">${formatR(s.p_e)}</div></div>
        <div class="metric-box"><div class="metric-label">P/BV</div><div class="metric-value">${formatR(s.p_bv)}</div></div>
        <div class="metric-box"><div class="metric-label">P/OCF</div><div class="metric-value">${formatR(s.p_ocf)}</div></div>
        <div class="metric-box"><div class="metric-label">P/S</div><div class="metric-value">${formatR(s.p_s)}</div></div>
        <div class="metric-box"><div class="metric-label">EV/Revenue</div><div class="metric-value">${formatR(s.ev_revenue)}</div></div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Fundamentals (Annual)</div>
      <div class="metrics-grid">
        <div class="metric-box"><div class="metric-label">Revenue</div><div class="metric-value">${formatM(s.revenue)}</div></div>
        <div class="metric-box"><div class="metric-label">Net Income</div><div class="metric-value ${s.net_income >= 0 ? 'good' : 'bad'}">${formatM(s.net_income)}</div></div>
        <div class="metric-box"><div class="metric-label">Adj. FCF</div><div class="metric-value ${s.adj_fcf >= 0 ? 'good' : 'bad'}">${formatM(s.adj_fcf)}</div></div>
        <div class="metric-box"><div class="metric-label">FCF Margin</div><div class="metric-value ${s.fcf_margin > 10 ? 'good' : s.fcf_margin < 0 ? 'bad' : ''}">${formatPct(s.fcf_margin)}</div></div>
        <div class="metric-box"><div class="metric-label">Net Debt</div><div class="metric-value">${formatM(s.net_debt)}</div></div>
        <div class="metric-box"><div class="metric-label">Equity</div><div class="metric-value">${formatM(s.equity)}</div></div>
      </div>
    </div>

    ${s.descripcion ? `<div class="modal-section"><div class="modal-section-title">About</div><p class="desc-text">${s.descripcion}</p></div>` : ''}
    <div style="padding:12px 24px;font-size:.72rem;color:var(--muted)">
      Last price: ${s.ultimo_precio_date || 'N/A'} · Last 10-K: ${s.ultimo_sec_date || 'N/A'}
    </div>
  `;
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

/* ── EXPORT CSV ── */
async function exportCSV() {
  try {
    let query = supabase.from('stocks').select('*');
    // duplicate filters from state
    const f = state.filters;
    if (f.minCap)        query = query.gte('market_cap', f.minCap * 1e6);
    if (f.maxCap)        query = query.lte('market_cap', f.maxCap * 1e6);
    if (f.sector)        query = query.eq('sector', f.sector);
    if (f.minEvFcf)      query = query.gte('ev_fcf', f.minEvFcf);
    if (f.maxEvFcf)      query = query.lte('ev_fcf', f.maxEvFcf);
    if (f.maxPE)         query = query.lte('p_e', f.maxPE);
    if (f.minFcfMargin)  query = query.gte('fcf_margin', f.minFcfMargin);
    if (f.rsiMin)        query = query.gte('rsi_14', f.rsiMin);
    if (f.rsiMax)        query = query.lte('rsi_14', f.rsiMax);
    if (f.goingConcern)  query = query.eq('going_concern', true);

    if (state.searchQuery) {
      query = query.or(`ticker.ilike.%${state.searchQuery}%,nombre.ilike.%${state.searchQuery}%`);
    }
    query = query.order(state.sortBy, { ascending: state.sortDir === 'asc', nullsFirst: false });

    const { data, error } = await query;
    if (error) throw error;
    
    const cols = ALL_COLUMNS.filter(c => state.activeColumns.includes(c.key) || c.always);
    const headers = cols.map(c => c.label).join(',');
    const rows = data.map(s => cols.map(c => {
      const v = s[c.key];
      return v === null || v === undefined ? '' : String(v).replace(/,/g, ';');
    }).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'smallcaps_export.csv'; a.click();
    showToast('CSV exported!', 'success');
  } catch(e) { showToast('Export failed', 'error'); }
}

/* ── DASHBOARD ── */
async function loadDashboard() {
  try {
    // To avoid fetching all data, we only fetch necessary columns
    const { data, error } = await supabase.from('stocks').select('sector, market_cap, net_income');
    if (error) return;
    
    let totalStocks = 0;
    let conDatosSec = 0;
    let marketCapTotal = 0;
    const sectorsCount = {};
    const capDist = { micro: 0, nano: 0, small: 0, mid: 0 };

    data.forEach(d => {
      totalStocks++;
      if (d.net_income !== null) conDatosSec++;
      if (d.market_cap !== null) {
        marketCapTotal += d.market_cap;
        const m = d.market_cap / 1e6;
        if (m < 10) capDist.micro++;
        else if (m < 50) capDist.nano++;
        else if (m < 100) capDist.small++;
        else capDist.mid++;
      }
      const s = d.sector || 'Unknown';
      sectorsCount[s] = (sectorsCount[s] || 0) + 1;
    });

    document.getElementById('sv-total').textContent = totalStocks.toLocaleString();
    document.getElementById('sv-sec').textContent = conDatosSec.toLocaleString();
    document.getElementById('sv-cap').textContent = `$${(marketCapTotal / 1e9).toFixed(1)}B`;

    // Last update
    const { data: ud } = await supabase.from('update_log').select('timestamp').order('timestamp', { ascending: false }).limit(1);
    const upd = ud && ud.length > 0 ? new Date(ud[0].timestamp).toLocaleDateString() : '—';
    document.getElementById('sv-update').textContent = upd;

    // Sectors
    const sortedSectors = Object.entries(sectorsCount).map(([sector, count]) => ({sector, count})).sort((a,b) => b.count - a.count);
    const maxCount = Math.max(...sortedSectors.map(s => s.count), 1);
    
    document.getElementById('sectorList').innerHTML = sortedSectors.slice(0,12).map(s =>
      `<div class="sector-row">
        <span class="sector-name" title="${s.sector}">${s.sector}</span>
        <div class="sector-bar-track"><div class="sector-bar" style="width:${s.count/maxCount*100}%"></div></div>
        <span class="sector-count">${s.count}</span>
      </div>`
    ).join('');

    // Cap breakdown
    document.getElementById('capBreakdown').innerHTML = `
      <div class="cap-row"><span class="cap-label">Micro (&lt;$10M)</span><span class="cap-value">${capDist.micro}</span><span class="cap-badge">micro</span></div>
      <div class="cap-row"><span class="cap-label">Nano ($10M–$50M)</span><span class="cap-value">${capDist.nano}</span><span class="cap-badge">nano</span></div>
      <div class="cap-row"><span class="cap-label">Small ($50M–$100M)</span><span class="cap-value">${capDist.small}</span><span class="cap-badge">small</span></div>
      <div class="cap-row"><span class="cap-label">Mid+ (&gt;$100M)</span><span class="cap-value">${capDist.mid}</span><span class="cap-badge">mid</span></div>
    `;
  } catch(e) { showToast('Dashboard error: ' + e.message, 'error'); }
}

/* ── INIT ── */
(async () => {
  renderColChips();
  renderTableHeader();
  await Promise.all([loadSectors(), loadStatus()]);
  fetchStocks();
})();
