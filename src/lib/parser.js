/**
 * QuerySpeak — Parser NLP Italiano → SQL
 *
 * Sistema rule-based che analizza frasi in italiano e produce query SQL.
 * Funziona completamente offline, senza API esterne.
 */

// ─── Dizionari e regole ───────────────────────────────────────────

const SELECT_KEYWORDS = [
  'trova', 'mostra', 'visualizza', 'cerca', 'seleziona', 'estrai',
  'recupera', 'ottieni', 'fammi vedere', 'elenca', 'tira fuori',
  'dimmi', 'dammi', 'voglio vedere', 'voglio', 'vorrei vedere'
];

const ALL_PATTERNS = [
  /\btutti\b/i, /\btutte\b/i, /\btutti i\b/i, /\btutte le\b/i,
  /\bogni\b/i, /\bciascun\b/i
];

const AGGREGATE_MAP = {
  conta:    { fn: 'COUNT',  col: null, alias: 'conteggio' },
  conteggio:{ fn: 'COUNT',  col: null, alias: 'conteggio' },
  'numero di': { fn: 'COUNT', col: null, alias: 'conteggio' },
  quanti:   { fn: 'COUNT',  col: null, alias: 'conteggio' },
  somma:    { fn: 'SUM',    col: null, alias: 'somma' },
  totale:   { fn: 'SUM',    col: null, alias: 'totale' },
  media:    { fn: 'AVG',    col: null, alias: 'media' },
  'valore medio': { fn: 'AVG', col: null, alias: 'media' },
  massimo:  { fn: 'MAX',    col: null, alias: 'massimo' },
  'più grande': { fn: 'MAX', col: null, alias: 'massimo' },
  'il più grande': { fn: 'MAX', col: null, alias: 'massimo' },
  minimo:   { fn: 'MIN',    col: null, alias: 'minimo' },
  'più piccolo': { fn: 'MIN', col: null, alias: 'minimo' },
  'il più piccolo': { fn: 'MIN', col: null, alias: 'minimo' },
};

const COMPARISON_PATTERNS = [
  { re: /\b(?:con|di|che ha|che hanno|con un(?:a)?|dove|in cui|il cui|la cui)\s+(?:età|anni)\s+(?:è\s+)?(?:maggiore|superiore)\s+(?:di|a)\s+(\d+)/i, col: 'età', op: '>' },
  { re: /\b(?:con|di|che ha|che hanno|con un(?:a)?|dove|in cui)\s+(?:età|anni)\s+(?:è\s+)?(?:minore|inferiore)\s+(?:di|a)\s+(\d+)/i, col: 'età', op: '<' },
  { re: /\b(?:con|di|che ha|che hanno|con un(?:a)?|dove|in cui)\s+(?:età|anni)\s+(?:è\s+)?(?:almeno|come minimo|non meno di)\s+(\d+)/i, col: 'età', op: '>=' },
  { re: /\b(?:con|di|che ha|che hanno|con un(?:a)?|dove|in cui)\s+(?:età|anni)\s+(?:è\s+)?(?:al massimo|come massimo|non più di)\s+(\d+)/i, col: 'età', op: '<=' },
  { re: /\b(?:con|di|che ha|che hanno|con un(?:a)?|dove|in cui)\s+(?:età|anni)\s+(?:è\s+)?(?:uguale a|pari a|esattamente)\s+(\d+)/i, col: 'età', op: '=' },
  { re: /\b(?:con|di|che ha|che hanno|con un(?:a)?|dove|in cui)\s+(?:età|anni)\s+(?:è\s+)?(?:diverso da|diversa da)\s+(\d+)/i, col: 'età', op: '!=' },

  // Più di / meno di (generici)
  { re: /\b(?:con|di|che ha|che hanno|con un(?:a)?|dove|in cui)\s+([\wàèéìòóùú]+)\s+(?:è\s+)?(?:maggiore|superiore)\s+(?:di|a)\s+(['"\wàèéìòóùú]+)/i, col: 1, op: '>', val: 2 },
  { re: /\b(?:con|di|che ha|che hanno|con un(?:a)?|dove|in cui)\s+([\wàèéìòóùú]+)\s+(?:è\s+)?(?:minore|inferiore)\s+(?:di|a)\s+(['"\wàèéìòóùú]+)/i, col: 1, op: '<', val: 2 },

  // Pattern "più di X anni" / "meno di X anni"
  { re: /\bpiù\s+di\s+(\d+)\s+anni/i, col: 'età', op: '>' },
  { re: /\bmeno\s+di\s+(\d+)\s+anni/i, col: 'età', op: '<' },
  { re: /\balmeno\s+(\d+)\s+anni/i, col: 'età', op: '>=' },
  { re: /\bal\s+massimo\s+(\d+)\s+anni/i, col: 'età', op: '<=' },

  // Generic "con X Y" pattern — con nome Mario, con città Roma
  { re: /\bcon\s+(?:il\s+|la\s+|l')?([\wàèéìòóùú]+)\s+(?:uguale\s+(?:a|al|alla|allo)?\s+)?['"]?([\wàèéìòóùú]+(?:\s+[\wàèéìòóùú]+)*?)['"]?(?:\s|$|,|\.)/i, col: 1, op: '=', val: 2 },

  // "abitano a / vivono a / risiedono a" → città =
  { re: /\b(?:abitano|vivono|risiedono|abita|vive|risiede)\s+(?:a|in)\s+(['"]?)([\wàèéìòóùú]+(?:\s+[\wàèéìòóùú]+)*?)\1?\b/i, col: 'città', op: '=', val: 2 },

  // "di Roma" / "di Milano" when referring to location
  { re: /\b(?:clienti|utenti|dipendenti|persone)\s+(?:di|della|del)\s+(['"]?)([\wàèéìòóùú]+(?:\s+[\wàèéìòóùú]+)*?)\1?(?:\s|$|,|\.|\s+con\b)/i, col: 'città', op: '=', val: 2 },

  // "che abitano a X" / "che vivono a X"
  { re: /\bche\s+(?:abitano|vivono|risiedono|abita|vive|risiede)\s+(?:a|in)\s+(['"]?)([\wàèéìòóùú]+(?:\s+[\wàèéìòóùú]+)*?)\1?\b/i, col: 'città', op: '=', val: 2 },
];

const ORDER_PATTERNS = [
  { re: /\bordinat[io]\s+(?:per|in base a|secondo)\s+(?:il\s+|la\s+|l')?([\wàèéìòóùú]+)\s*(?:(?:in ordine|in senso)\s+)?(crescente|decrescente|ascendente|discendente)?/i },
  { re: /\bin\s+ordine\s+(?:di|alfabetico\s+di)\s+(?:il\s+|la\s+|l')?([\wàèéìòóùú]+)\s*(crescente|decrescente|ascendente|discendente)?/i },
  { re: /\bordina\s+(?:per|in base a)\s+(?:il\s+|la\s+|l')?([\wàèéìòóùú]+)\s*(crescente|decrescente|ascendente|discendente)?/i },
];

const GROUP_PATTERNS = [
  { re: /\braggruppat[oi]\s+.*?\b(?:per|in base a|secondo)\s+(?:il\s+|la\s+|l')?([\wàèéìòóùú]+)/i },
  { re: /\braggruppa\s+.*?\b(?:per|in base a|secondo)\s+(?:il\s+|la\s+|l')?([\wàèéìòóùú]+)/i },
];

const LIMIT_PATTERNS = [
  { re: /\b(?:limite|limita a|limitato a)\s+(\d+)/i },
  { re: /\b(?:primi|prime)\s+(\d+)\b/i },
  { re: /\b(?:solo|soltanto)\s+(?:i\s+|le\s+)?(?:primi|prime)?\s*(\d+)\b/i },
];

const JOIN_HINTS = [
  { re: /\b(?:con|assieme a|insieme a|unito a|collegato a)\s+(?:i\s+|le\s+|gli\s+|il\s+|la\s+|l')?(\w+)\b(?!\s*(?:anni|eta|età|più|meno|almeno|massimo))/i },
];

// Tables and their known columns
const KNOWN_TABLES = {
  clienti:   { singular: 'cliente',   cols: ['id', 'nome', 'cognome', 'età', 'città', 'email', 'telefono', 'data_registrazione'] },
  utenti:    { singular: 'utente',    cols: ['id', 'nome', 'cognome', 'età', 'città', 'email', 'ruolo'] },
  prodotti:  { singular: 'prodotto',  cols: ['id', 'nome', 'categoria', 'prezzo', 'quantità', 'fornitore'] },
  ordini:    { singular: 'ordine',    cols: ['id', 'cliente_id', 'data', 'importo', 'stato', 'prodotti'] },
  dipendenti:{ singular: 'dipendente',cols: ['id', 'nome', 'cognome', 'età', 'città', 'ruolo', 'stipendio', 'data_assunzione'] },
  fatture:   { singular: 'fattura',   cols: ['id', 'cliente_id', 'data', 'importo', 'stato', 'iva'] },
};

const COLUMN_ALIASES = {
  nome: 'nome', nomi: 'nome',
  cognome: 'cognome', cognomi: 'cognome',
  'età': 'età', anni: 'età', eta: 'età', età: 'età', 'anni.': 'età',
  'città': 'città', citta: 'città', città: 'città', città: 'città',
  email: 'email', 'e-mail': 'email', mail: 'email',
  telefono: 'telefono', cellulare: 'telefono', 'numero di telefono': 'telefono',
  prezzo: 'prezzo', costo: 'prezzo', 'prezzo.': 'prezzo',
  stipendio: 'stipendio', salario: 'stipendio', paga: 'stipendio',
  importo: 'importo', totale: 'importo', 'totale.': 'importo',
  data: 'data', 'data.': 'data',
  'data_registrazione': 'data_registrazione',
  stato: 'stato',
  categoria: 'categoria',
  quantità: 'quantità', quantita: 'quantità',
  fornitore: 'fornitore',
  ruolo: 'ruolo', mansione: 'ruolo',
  id: 'id',
};

// ─── Utility ──────────────────────────────────────────────────────

function normalize(s) {
  return s.toLowerCase()
    .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
    .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
    .replace(/[^\w\sàèìòùé]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strips all accents and lowercases — used for regex pattern matching */
function normalizeForMatch(s) {
  return s.toLowerCase()
    .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
    .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveColumn(raw) {
  raw = raw.toLowerCase().replace(/[àá]/g, 'a').replace(/[èé]/g, 'e')
    .replace(/[ìí]/g, 'i').replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u');
  if (COLUMN_ALIASES[raw]) return COLUMN_ALIASES[raw];
  // Try removing trailing punctuation
  const cleaned = raw.replace(/[.,;:!?]$/, '');
  if (COLUMN_ALIASES[cleaned]) return COLUMN_ALIASES[cleaned];
  return raw;
}

function detectTable(phrase) {
  const norm = normalize(phrase);
  for (const [table, info] of Object.entries(KNOWN_TABLES)) {
    if (norm.includes(table) || norm.includes(info.singular) ||
        norm.includes(table.replace(/i$/, 'o')) || norm.includes(table.replace(/i$/, 'a'))) {
      return { table, info };
    }
  }
  // Default: assume clienti if no table found but age/customer context
  if (/\b(?:cliente|clienti|persona|persone|nome|cognome|età|anni|eta)\b/i.test(phrase)) {
    return { table: 'clienti', info: KNOWN_TABLES.clienti };
  }
  if (/\b(?:prodotto|prodotti|prezzo|costo|categoria)\b/i.test(phrase)) {
    return { table: 'prodotti', info: KNOWN_TABLES.prodotti };
  }
  if (/\b(?:ordine|ordini|importo|fattura)\b/i.test(phrase)) {
    return { table: 'ordini', info: KNOWN_TABLES.ordini };
  }
  return { table: 'clienti', info: KNOWN_TABLES.clienti }; // fallback
}

function isQuoted(val) {
  return /^['"].*['"]$/.test(val);
}

function cleanVal(val) {
  return val.replace(/^['"]|['"]$/g, '').trim();
}

function isNumeric(val) {
  return /^\d+(?:\.\d+)?$/.test(val);
}

// ─── Core parser ──────────────────────────────────────────────────

export function parseItalianToSQL(phrase) {
  if (!phrase || phrase.trim().length < 3) {
    return { sql: '', error: 'Inserisci una frase più lunga per generare una query SQL.', columns: [], conditions: [], table: null };
  }

  const norm = normalize(phrase);
  const errors = [];
  let selectAll = false;
  let selectCols = [];
  let aggregate = null;
  let conditions = [];
  let orderBy = null;
  let groupBy = null;
  let limit = null;

  // 1. Detect table
  const { table, info: tableInfo } = detectTable(phrase);

  // 2. Detect SELECT *
  for (const pat of ALL_PATTERNS) {
    if (pat.test(phrase)) { selectAll = true; break; }
  }

  // 3. Detect aggregate functions
  for (const [key, agg] of Object.entries(AGGREGATE_MAP)) {
    if (norm.includes(key)) {
      aggregate = { ...agg };
      // Try to find which column to aggregate
      const afterAgg = norm.substring(norm.indexOf(key) + key.length);
      // Look for a column name near the aggregate
      for (const col of tableInfo.cols) {
        if (afterAgg.includes(col)) {
          aggregate.col = col;
          break;
        }
      }
      break;
    }
  }

  // 4. Detect explicit column mentions
  for (const col of tableInfo.cols) {
    const colNorm = normalize(col);
    if (norm.includes(colNorm) || norm.includes(col)) {
      if (!selectCols.includes(col)) selectCols.push(col);
    }
  }

  // 5. Detect WHERE conditions — complex patterns first
  for (const pattern of COMPARISON_PATTERNS) {
    const m = phrase.match(pattern.re);
    if (m) {
      let col, op, val;
      if (typeof pattern.col === 'number') {
        col = resolveColumn(m[pattern.col]);
        op = pattern.op;
        val = m[pattern.val];
      } else {
        col = pattern.col;
        op = pattern.op;
        val = m[pattern.val] || m[1];
      }
      val = cleanVal(val);
      col = resolveColumn(col);

      // Validate column exists in table
      if (tableInfo.cols.includes(col)) {
        // Avoid duplicates
        const exists = conditions.find(c => c.col === col && c.op === op && c.val === val);
        if (!exists) {
          conditions.push({ col, op, val, numeric: isNumeric(val) });
        }
      }
    }
  }

  // 6. Detect ORDER BY
  for (const pattern of ORDER_PATTERNS) {
    const m = phrase.match(pattern.re);
    if (m) {
      const col = resolveColumn(m[1]);
      if (tableInfo.cols.includes(col)) {
        let dir = 'ASC';
        if (m[2]) {
          const d = m[2].toLowerCase();
          if (d.startsWith('dec') || d.startsWith('disc')) dir = 'DESC';
        }
        orderBy = { col, dir };
      }
      break;
    }
  }

  // 7. Detect GROUP BY
  for (const pattern of GROUP_PATTERNS) {
    const m = phrase.match(pattern.re);
    if (m) {
      const col = resolveColumn(m[1]);
      if (tableInfo.cols.includes(col)) {
        groupBy = col;
      }
      break;
    }
  }

  // 8. Detect LIMIT
  for (const pattern of LIMIT_PATTERNS) {
    const m = phrase.match(pattern.re);
    if (m) {
      limit = parseInt(m[1], 10);
      break;
    }
  }

  // 9. Build SQL
  let sql = '';

  // SELECT clause
  if (aggregate) {
    if (aggregate.col) {
      sql = `SELECT ${aggregate.fn}(${aggregate.col}) AS ${aggregate.alias}`;
    } else {
      sql = `SELECT ${aggregate.fn}(*) AS ${aggregate.alias}`;
      aggregate.col = '*';
    }
    if (groupBy) {
      sql += `, ${groupBy}`;
    }
    // If also specific columns requested
    for (const col of selectCols) {
      if (col !== aggregate.col && col !== groupBy) {
        sql += `, ${col}`;
      }
    }
  } else if (selectAll || selectCols.length === 0) {
    sql = 'SELECT *';
    selectCols = tableInfo.cols;
  } else if (selectCols.length > 0) {
    sql = `SELECT ${selectCols.join(', ')}`;
  }

  // FROM clause
  sql += `\nFROM ${table}`;

  // WHERE clause
  if (conditions.length > 0) {
    const whereParts = conditions.map(c => {
      if (c.numeric) {
        return `${c.col} ${c.op} ${c.val}`;
      } else {
        return `${c.col} ${c.op} '${c.val}'`;
      }
    });
    sql += `\nWHERE ${whereParts.join(' AND ')}`;
  }

  // GROUP BY clause
  if (groupBy) {
    sql += `\nGROUP BY ${groupBy}`;
  }

  // ORDER BY clause
  if (orderBy) {
    sql += `\nORDER BY ${orderBy.col} ${orderBy.dir}`;
  }

  // LIMIT clause
  if (limit) {
    sql += `\nLIMIT ${limit}`;
  }

  sql += ';';

  return {
    sql,
    table,
    tableInfo,
    columns: selectCols.length > 0 ? selectCols : tableInfo.cols,
    conditions,
    orderBy,
    groupBy,
    limit,
    aggregate,
    error: errors.length > 0 ? errors.join('; ') : null,
  };
}

export { KNOWN_TABLES, COLUMN_ALIASES };
