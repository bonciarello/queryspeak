<script>
  import { parseItalianToSQL } from './lib/parser.js';
  import { generateFakeData } from './lib/generator.js';
  import { EXAMPLES } from './lib/examples.js';

  let inputPhrase = $state('');
  let parsedResult = $state(null);
  let fakeData = $state([]);
  let errorMsg = $state('');
  let hasSearched = $state(false);
  let activeExample = $state(null);
  let copiedSQL = $state(false);

  const ROW_COUNT = 8;

  function doTranslate() {
    hasSearched = true;
    copiedSQL = false;
    const phrase = inputPhrase.trim();
    if (!phrase) {
      errorMsg = 'Inserisci una frase in italiano per generare la query SQL.';
      parsedResult = null;
      fakeData = [];
      return;
    }

    const result = parseItalianToSQL(phrase);
    if (result.error) {
      errorMsg = result.error;
      parsedResult = null;
      fakeData = [];
      return;
    }

    errorMsg = '';
    parsedResult = result;
    fakeData = generateFakeData(result, ROW_COUNT);
  }

  function handleExampleClick(ex) {
    activeExample = ex.label;
    inputPhrase = ex.text;
    // Auto-translate after setting example
    setTimeout(() => doTranslate(), 50);
  }

  function handleInputKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      doTranslate();
    }
  }

  function getDisplayColumns() {
    if (!parsedResult) return [];
    // If aggregate, show group col + aggregate
    if (parsedResult.aggregate) {
      const cols = [];
      if (parsedResult.groupBy) cols.push(parsedResult.groupBy);
      if (parsedResult.aggregate.col && parsedResult.aggregate.col !== '*') {
        if (!cols.includes(parsedResult.aggregate.col)) cols.push(parsedResult.aggregate.col);
      }
      cols.push(parsedResult.aggregate.alias || parsedResult.aggregate.fn.toLowerCase());
      // Add any extra select cols
      for (const col of (parsedResult.columns || [])) {
        if (!cols.includes(col) && col !== parsedResult.aggregate.col) cols.push(col);
      }
      return cols;
    }
    if (parsedResult.columns && parsedResult.columns.length > 0 && parsedResult.columns.length < 6) {
      return parsedResult.columns;
    }
    // For SELECT *, show first 5-6 relevant columns
    const all = parsedResult.tableInfo?.cols || [];
    return all.slice(0, 5);
  }

  function formatColumnLabel(col) {
    const labels = {
      id: 'ID',
      nome: 'Nome',
      cognome: 'Cognome',
      'età': 'Età',
      'città': 'Città',
      email: 'Email',
      telefono: 'Telefono',
      data_registrazione: 'Registrazione',
      data_assunzione: 'Assunzione',
      data: 'Data',
      ruolo: 'Ruolo',
      stipendio: 'Stipendio',
      prezzo: 'Prezzo',
      'quantità': 'Qtà',
      categoria: 'Categoria',
      fornitore: 'Fornitore',
      importo: 'Importo',
      stato: 'Stato',
      iva: 'IVA',
      prodotti: 'Prodotti',
      cliente_id: 'ID Cliente',
      conteggio: 'Conteggio',
      somma: 'Somma',
      media: 'Media',
      massimo: 'Massimo',
      minimo: 'Minimo',
      totale: 'Totale',
    };
    return labels[col] || col.charAt(0).toUpperCase() + col.slice(1);
  }

  function formatCellValue(col, val) {
    if (val === null || val === undefined) return '—';
    if (col === 'prezzo' || col === 'importo' || col === 'stipendio') {
      if (typeof val === 'number') {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: col === 'stipendio' ? 0 : 2 }).format(val);
      }
    }
    if (col === 'data' || col === 'data_registrazione' || col === 'data_assunzione') {
      if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Intl.DateTimeFormat('it-IT').format(new Date(val));
      }
    }
    if (col === 'età' && typeof val === 'number') {
      return `${val} anni`;
    }
    if (col === 'iva' && typeof val === 'number') {
      return `${val}%`;
    }
    return String(val);
  }

  async function copySQL() {
    if (!parsedResult?.sql) return;
    try {
      await navigator.clipboard.writeText(parsedResult.sql);
      copiedSQL = true;
      setTimeout(() => (copiedSQL = false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = parsedResult.sql;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copiedSQL = true;
      setTimeout(() => (copiedSQL = false), 2000);
    }
  }

  function highlightSQL(sql) {
    if (!sql) return '';
    return sql
      .replace(/\b(SELECT|FROM|WHERE|ORDER BY|GROUP BY|LIMIT|AS|AND|ASC|DESC|COUNT|SUM|AVG|MAX|MIN)\b/g,
        '<span class="kw">$1</span>')
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="str">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="num">$1</span>')
      .replace(/(\*)/g, '<span class="star">$1</span>')
      .replace(/;/g, '<span class="semi">;</span>');
  }
</script>

<svelte:head>
  <title>QuerySpeak — Italiano → SQL</title>
</svelte:head>

<div class="app">
  <!-- Header -->
  <header class="header">
    <a href="./" class="logo" aria-label="QuerySpeak — torna alla home">
      <span class="logo-mark" aria-hidden="true">{'{ }'}</span>
      <span class="logo-text">QuerySpeak</span>
    </a>
    <p class="tagline">Scrivi in italiano, leggi in SQL.</p>
  </header>

  <main class="main">
    <!-- Input Section -->
    <section class="input-section" aria-label="Inserisci la tua frase in italiano">
      <label class="input-label" for="phrase-input">
        Cosa vuoi chiedere al database?
      </label>
      <div class="input-row">
        <div class="input-wrapper">
          <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="4" y1="4" x2="20" y2="20"/><line x1="18" y1="4" x2="8" y2="14"/><polyline points="4 10 8 14 14 8"/>
          </svg>
          <input
            id="phrase-input"
            type="text"
            class="phrase-input"
            placeholder="es. Trova tutti i clienti con più di 30 anni…"
            bind:value={inputPhrase}
            onkeydown={handleInputKeydown}
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <button class="btn-translate" onclick={doTranslate} aria-label="Traduci in SQL">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="btn-text">Traduci</span>
        </button>
      </div>
      {#if errorMsg}
        <p class="error-msg" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {errorMsg}
        </p>
      {/if}
    </section>

    <!-- Examples -->
    <nav class="examples-bar" aria-label="Frasi di esempio">
      <span class="examples-label">Prova con:</span>
      {#each EXAMPLES as ex}
        <button
          class="example-chip"
          class:active={activeExample === ex.label}
          onclick={() => handleExampleClick(ex)}
          aria-pressed={activeExample === ex.label}
        >
          {ex.label}
        </button>
      {/each}
    </nav>

    <!-- Results -->
    {#if hasSearched && parsedResult}
      <div class="results" role="region" aria-label="Risultati della traduzione">
        <!-- Translation Bridge (signature element) -->
        <div class="bridge" aria-hidden="true">
          <div class="bridge-line"></div>
          <div class="bridge-node from-node">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </div>
          <div class="bridge-node to-node">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14"/></svg>
          </div>
        </div>

        <!-- SQL Panel -->
        <section class="sql-panel" aria-label="Query SQL generata">
          <div class="panel-header">
            <h2 class="panel-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              Query SQL
            </h2>
            <button class="btn-copy" onclick={copySQL} aria-label={copiedSQL ? 'Copiato!' : 'Copia query SQL'}>
              {#if copiedSQL}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                Copiato!
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copia
              {/if}
            </button>
          </div>
          <pre class="sql-code" aria-label="Codice SQL"><code>{@html highlightSQL(parsedResult.sql)}</code></pre>
        </section>

        <!-- Data Table -->
        <section class="data-panel" aria-label="Anteprima dati di esempio">
          <div class="panel-header">
            <h2 class="panel-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              Esempio risultato
              {#if parsedResult.table}
                <span class="table-badge">Tabella: {parsedResult.table}</span>
              {/if}
            </h2>
            <span class="row-count">{fakeData.length} righe</span>
          </div>
          <div class="table-scroll" role="table" aria-label="Dati di esempio">
            <table>
              <thead>
                <tr>
                  {#each getDisplayColumns() as col}
                    <th scope="col">{formatColumnLabel(col)}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each fakeData as row, i}
                  <tr style="animation-delay: {i * 40}ms">
                    {#each getDisplayColumns() as col}
                      <td data-label={formatColumnLabel(col)}>{formatCellValue(col, row[col])}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="data-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Dati fittizi generati automaticamente — servono solo a illustrare il risultato della query.
          </p>
        </section>

        <!-- Query Explanation -->
        <section class="explain-panel" aria-label="Spiegazione della query">
          <div class="panel-header">
            <h2 class="panel-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Cosa fa questa query
            </h2>
          </div>
          <div class="explain-content">
            <ul class="explain-list">
              <li>
                <strong>SELECT</strong> —
                {#if parsedResult.aggregate}
                  Calcola <em>{parsedResult.aggregate.fn}</em>{#if parsedResult.aggregate.col && parsedResult.aggregate.col !== '*'} sulla colonna <em>{parsedResult.aggregate.col}</em>{/if}
                {:else if parsedResult.columns && parsedResult.columns.length > 0 && !parsedResult.tableInfo?.cols?.every(c => parsedResult.columns.includes(c))}
                  Restituisce le colonne: <em>{parsedResult.columns.join(', ')}</em>
                {:else}
                  Restituisce tutte le colonne della tabella <em>{parsedResult.table}</em>
                {/if}
              </li>
              <li>
                <strong>FROM</strong> — Dalla tabella <em>{parsedResult.table}</em>
              </li>
              {#if parsedResult.conditions && parsedResult.conditions.length > 0}
                <li>
                  <strong>WHERE</strong> — Filtra i risultati dove:
                  <ul class="condition-list">
                    {#each parsedResult.conditions as cond}
                      <li><em>{cond.col}</em> {cond.op} {cond.numeric ? cond.val : `'${cond.val}'`}</li>
                    {/each}
                  </ul>
                </li>
              {/if}
              {#if parsedResult.groupBy}
                <li><strong>GROUP BY</strong> — Raggruppa per <em>{parsedResult.groupBy}</em></li>
              {/if}
              {#if parsedResult.orderBy}
                <li><strong>ORDER BY</strong> — Ordina per <em>{parsedResult.orderBy.col}</em> in ordine {parsedResult.orderBy.dir === 'ASC' ? 'crescente' : 'decrescente'}</li>
              {/if}
              {#if parsedResult.limit}
                <li><strong>LIMIT</strong> — Restituisce al massimo <em>{parsedResult.limit}</em> risultati</li>
              {/if}
            </ul>
          </div>
        </section>
      </div>
    {:else if hasSearched && !parsedResult}
      <!-- Empty state after failed search handled by errorMsg -->
    {:else}
      <!-- Empty state -->
      <div class="empty-state" role="status">
        <div class="empty-illustration" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <p class="empty-title">Traduci una frase in SQL</p>
        <p class="empty-desc">
          Scrivi quello che vuoi ottenere dal database in italiano —<br />
          QuerySpeak lo trasforma in una query SQL pronta all'uso.
        </p>
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="footer">
    <p>
      <span>QuerySpeak</span>
      <span aria-hidden="true" class="footer-dot">·</span>
      <span>Funziona offline — nessun dato viene inviato a server esterni.</span>
    </p>
  </footer>
</div>

<style>
  /* ─── Design tokens ──────────────────────────────── */
  :global(body) {
    --color-surface: #FFFFFF;
    --color-ink: #1A1C20;
    --color-primary: #FF5E35;
    --color-primary-hover: #E84A24;
    --color-secondary: #00856A;
    --color-surface-alt: #F4F2ED;
    --color-border: #E6E3DC;
    --color-error: #DC2626;
    --color-muted: #787674;
    --color-code-bg: #F8F7F3;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
    --font-display: 'DM Serif Display', Georgia, serif;
    --font-body: 'DM Sans', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
    --space-unit: 8px;
    margin: 0;
    padding: 0;
    background: var(--color-surface);
    color: var(--color-ink);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(*), :global(*::before), :global(*::after) {
    box-sizing: border-box;
  }

  :global(:focus-visible) {
    outline: 2.5px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(*), :global(*::before), :global(*::after) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* ─── App layout ─────────────────────────────────── */
  .app {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    max-width: 880px;
    margin: 0 auto;
    padding: 0 16px;
  }

  /* ─── Header ──────────────────────────────────────── */
  .header {
    padding: 20px 0 12px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: inherit;
    border-radius: var(--radius-sm);
  }

  .logo-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: var(--color-primary);
    color: #fff;
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.5px;
  }

  .logo-text {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.3px;
    line-height: 1;
  }

  .tagline {
    margin: 0;
    color: var(--color-muted);
    font-size: 15px;
    font-style: italic;
    font-family: var(--font-display);
  }

  /* ─── Main ────────────────────────────────────────── */
  .main {
    flex: 1;
    padding: 24px 0 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ─── Input section ──────────────────────────────── */
  .input-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .input-label {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-ink);
  }

  .input-row {
    display: flex;
    gap: 8px;
  }

  .input-wrapper {
    flex: 1;
    position: relative;
  }

  .input-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted);
    pointer-events: none;
  }

  .phrase-input {
    width: 100%;
    height: 48px;
    padding: 0 40px 0 40px;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: 16px;
    background: var(--color-surface);
    color: var(--color-ink);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .phrase-input::placeholder {
    color: #B0ADAA;
    font-style: italic;
  }

  .phrase-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(255, 94, 53, 0.12);
  }

  /* ─── Translate button ──────────────────────────── */
  .btn-translate {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 48px;
    padding: 0 20px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: #fff;
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.15s ease;
    min-width: 44px;
    min-height: 44px;
  }

  .btn-translate:hover {
    background: var(--color-primary-hover);
    box-shadow: 0 2px 8px rgba(255, 94, 53, 0.25);
  }

  .btn-translate:active {
    transform: scale(0.97);
  }

  @media (max-width: 480px) {
    .btn-text {
      display: none;
    }
    .btn-translate {
      padding: 0 14px;
    }
  }

  /* ─── Error ──────────────────────────────────────── */
  .error-msg {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    background: #FEF2F2;
    color: var(--color-error);
    font-size: 14px;
    font-weight: 500;
  }

  /* ─── Examples ───────────────────────────────────── */
  .examples-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 4px 0;
  }

  .examples-label {
    font-size: 13px;
    color: var(--color-muted);
    font-weight: 500;
    white-space: nowrap;
  }

  .example-chip {
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    padding: 6px 14px;
    border: 1.5px solid var(--color-border);
    border-radius: 20px;
    background: var(--color-surface);
    color: var(--color-ink);
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }

  .example-chip:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: #FFF5F2;
  }

  .example-chip.active {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: #fff;
  }

  /* ─── Results ────────────────────────────────────── */
  .results {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ─── Bridge (signature element) ────────────────── */
  .bridge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 8px 0;
    position: relative;
  }

  .bridge-line {
    position: absolute;
    top: 50%;
    left: calc(50% - 80px);
    right: calc(50% - 80px);
    height: 2px;
    background: linear-gradient(
      90deg,
      var(--color-ink) 0%,
      var(--color-primary) 45%,
      var(--color-secondary) 55%,
      var(--color-secondary) 100%
    );
    border-radius: 1px;
  }

  .bridge-node {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 1;
    color: #fff;
  }

  .from-node {
    background: var(--color-ink);
  }

  .to-node {
    background: var(--color-secondary);
  }

  @media (prefers-reduced-motion: no-preference) {
    .bridge-line {
      animation: bridgeGrow 0.6s ease-out both;
    }
    .from-node {
      animation: nodePop 0.4s ease-out 0.15s both;
    }
    .to-node {
      animation: nodePop 0.4s ease-out 0.35s both;
    }
  }

  @keyframes bridgeGrow {
    from { transform: scaleX(0.3); opacity: 0; }
    to   { transform: scaleX(1); opacity: 1; }
  }

  @keyframes nodePop {
    from { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.2); }
    to   { transform: scale(1); opacity: 1; }
  }

  /* ─── Panel shared ──────────────────────────────── */
  .sql-panel,
  .data-panel,
  .explain-panel {
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--color-surface);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-alt);
  }

  .panel-title {
    margin: 0;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-ink);
  }

  .table-badge {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 2px 8px;
    border-radius: 4px;
    color: var(--color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  /* ─── SQL panel ─────────────────────────────────── */
  .sql-code {
    margin: 0;
    padding: 20px 18px;
    background: var(--color-code-bg);
    font-family: var(--font-mono);
    font-size: 13.5px;
    line-height: 1.8;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .sql-code code {
    color: var(--color-ink);
    font-weight: 400;
  }

  :global(.sql-code .kw) {
    color: var(--color-primary);
    font-weight: 600;
  }

  :global(.sql-code .str) {
    color: var(--color-secondary);
  }

  :global(.sql-code .num) {
    color: #2563EB;
  }

  :global(.sql-code .star) {
    color: #9333EA;
  }

  :global(.sql-code .semi) {
    color: var(--color-muted);
    font-weight: 700;
  }

  .btn-copy {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-ink);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
  }

  .btn-copy:hover {
    border-color: var(--color-secondary);
    color: var(--color-secondary);
    background: #F0FAF6;
  }

  /* ─── Data table ────────────────────────────────── */
  .row-count {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-muted);
  }

  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }

  thead {
    background: var(--color-code-bg);
  }

  th {
    padding: 10px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-muted);
    border-bottom: 2px solid var(--color-border);
    white-space: nowrap;
  }

  td {
    padding: 10px 16px;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
    color: var(--color-ink);
  }

  tbody tr {
    transition: background 0.15s ease;
  }

  tbody tr:hover {
    background: #FEFAF7;
  }

  @media (prefers-reduced-motion: no-preference) {
    tbody tr {
      animation: fadeSlideIn 0.35s ease-out both;
    }
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Mobile table */
  @media (max-width: 640px) {
    thead {
      display: none;
    }

    table, tbody, tr, td {
      display: block;
    }

    tr {
      padding: 10px 0;
      border-bottom: 1.5px solid var(--color-border);
    }

    tr:last-child {
      border-bottom: none;
    }

    td {
      border-bottom: none;
      padding: 6px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    td::before {
      content: attr(data-label);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-muted);
      flex-shrink: 0;
    }
  }

  /* ─── Data note ─────────────────────────────────── */
  .data-note {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 12px 18px;
    font-size: 12.5px;
    color: var(--color-muted);
    border-top: 1px solid var(--color-border);
    background: var(--color-code-bg);
  }

  /* ─── Explanation ───────────────────────────────── */
  .explain-content {
    padding: 16px 18px;
  }

  .explain-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .explain-list > li {
    font-size: 14.5px;
    line-height: 1.6;
    padding-left: 4px;
  }

  .explain-list strong {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-primary);
    background: #FFF5F2;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .explain-list em {
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 13px;
    color: var(--color-secondary);
    background: #F0FAF6;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
  }

  .condition-list {
    margin: 6px 0 0 20px;
    padding: 0;
    list-style: disc;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 14px;
  }

  /* ─── Empty state ───────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 48px 16px;
    gap: 12px;
  }

  .empty-illustration {
    color: var(--color-border);
    margin-bottom: 4px;
  }

  .empty-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--color-ink);
  }

  .empty-desc {
    margin: 0;
    font-size: 15px;
    color: var(--color-muted);
    line-height: 1.7;
    max-width: 400px;
  }

  /* ─── Footer ────────────────────────────────────── */
  .footer {
    padding: 16px 0 24px;
    border-top: 1px solid var(--color-border);
    text-align: center;
  }

  .footer p {
    margin: 0;
    font-size: 12.5px;
    color: var(--color-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .footer-dot {
    color: var(--color-border);
  }

  /* ─── Responsive ────────────────────────────────── */
  @media (max-width: 480px) {
    .app {
      padding: 0 12px;
    }

    .header {
      padding: 14px 0 10px;
      gap: 8px;
    }

    .logo-text {
      font-size: 19px;
    }

    .tagline {
      font-size: 13px;
    }

    .main {
      padding: 16px 0 20px;
      gap: 14px;
    }

    .sql-code {
      font-size: 11.5px;
      padding: 14px 12px;
    }

    .panel-header {
      padding: 12px 14px;
    }

    .explain-content {
      padding: 12px 14px;
    }
  }
</style>
