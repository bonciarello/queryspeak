/**
 * QuerySpeak — Generatore di dati fittizi
 *
 * Produce righe coerenti con la query SQL generata, usando nomi,
 * cognomi e città italiane realistiche.
 */

// ─── Dataset italiani realistici ──────────────────────────────────

const NOMI = [
  'Marco', 'Sofia', 'Lorenzo', 'Giulia', 'Alessandro', 'Chiara', 'Francesco',
  'Valentina', 'Matteo', 'Aurora', 'Leonardo', 'Alice', 'Andrea', 'Ginevra',
  'Riccardo', 'Beatrice', 'Federico', 'Martina', 'Gabriele', 'Emma',
  'Simone', 'Elena', 'Davide', 'Gaia', 'Luca', 'Sara', 'Pietro', 'Noemi',
  'Tommaso', 'Anna', 'Giovanni', 'Rebecca', 'Antonio', 'Viola',
  'Nicolò', 'Bianca', 'Michele', 'Diana', 'Paolo', 'Caterina',
];

const COGNOMI = [
  'Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Romano', 'Colombo',
  'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca',
  'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti',
  'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso',
  'Ferrara', 'Galli', 'Pellegrini', 'Donati', 'Leone', 'Martini',
  'Vitale', 'Coppola', 'Parisi', 'De Santis', 'Fiore', 'Amato',
  'Silvestri', 'Pace', 'D\'Angelo', 'Grassi',
];

const CITTA = [
  'Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna',
  'Firenze', 'Bari', 'Catania', 'Venezia', 'Verona', 'Messina', 'Padova',
  'Trieste', 'Brescia', 'Parma', 'Taranto', 'Prato', 'Modena', 'Reggio Calabria',
  'Perugia', 'Livorno', 'Ravenna', 'Cagliari', 'Foggia', 'Rimini', 'Salerno',
  'Ferrara', 'Sassari', 'Siracusa', 'Pescara', 'Monza', 'Bergamo', 'Trento',
];

const CATEGORIE = [
  'Elettronica', 'Abbigliamento', 'Alimentari', 'Casa', 'Sport',
  'Libri', 'Musica', 'Giochi', 'Bellezza', 'Giardinaggio',
];

const STATI_ORDINE = ['In elaborazione', 'Spedito', 'Consegnato', 'Annullato'];
const RUOLI = ['Impiegato', 'Manager', 'Tecnico', 'Direttore', 'Analista'];

const DOMINI_EMAIL = ['email.it', 'posta.it', 'libero.it', 'outlook.it', 'yahoo.it'];

// ─── Utility ──────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEmail(nome, cognome) {
  const n = nome.toLowerCase().replace(/\s+/g, '.');
  const c = cognome.toLowerCase().replace(/['\s]/g, '').replace(/[àá]/g,'a')
    .replace(/[èé]/g,'e').replace(/[ìí]/g,'i').replace(/[òó]/g,'o').replace(/[ùú]/g,'u');
  return `${n}.${c}@${pick(DOMINI_EMAIL)}`;
}

function generatePhone() {
  const prefix = pick(['320', '328', '333', '339', '345', '347', '349', '366', '380', '388', '391']);
  return `+39 ${prefix} ${String(rand(1000000, 9999999))}`;
}

function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

// ─── Generatore principale ────────────────────────────────────────

export function generateFakeData(parsed, rowCount = 10) {
  const { table, tableInfo, conditions, orderBy, limit } = parsed;
  const cols = tableInfo.cols;
  let rows = [];

  // Generate base rows
  for (let i = 0; i < rowCount; i++) {
    const row = {};

    for (const col of cols) {
      switch (col) {
        case 'id':
          row.id = i + 1;
          break;
        case 'nome':
          row.nome = pick(NOMI);
          break;
        case 'cognome':
          row.cognome = pick(COGNOMI);
          break;
        case 'età':
          // Default range 18-80, adjusted by conditions
          row['età'] = rand(18, 80);
          break;
        case 'città':
          row['città'] = pick(CITTA);
          break;
        case 'email':
          // Will be filled after nome/cognome
          row.email = '';
          break;
        case 'telefono':
          row.telefono = generatePhone();
          break;
        case 'data_registrazione':
        case 'data_assunzione':
          row[col] = randomDate(new Date('2018-01-01'), new Date('2025-12-31'));
          break;
        case 'data':
          row.data = randomDate(new Date('2023-01-01'), new Date('2025-06-30'));
          break;
        case 'ruolo':
          row.ruolo = pick(RUOLI);
          break;
        case 'stipendio':
          row.stipendio = rand(18000, 65000);
          break;
        case 'prezzo':
          row.prezzo = parseFloat((Math.random() * 199 + 1).toFixed(2));
          break;
        case 'quantità':
          row['quantità'] = rand(1, 200);
          break;
        case 'categoria':
          row.categoria = pick(CATEGORIE);
          break;
        case 'fornitore':
          row.fornitore = pick(['FornItalia', 'EuroSupply', 'GlobalTrade', 'LogisticaNord', 'PrimeDistribuzione']);
          break;
        case 'importo':
          row.importo = parseFloat((Math.random() * 950 + 50).toFixed(2));
          break;
        case 'stato':
          row.stato = pick(STATI_ORDINE);
          break;
        case 'iva':
          row.iva = pick([4, 10, 22]);
          break;
        case 'prodotti':
          row.prodotti = rand(1, 10);
          break;
        case 'cliente_id':
          row.cliente_id = rand(1, 100);
          break;
        default:
          row[col] = `valore_${i + 1}`;
      }
    }

    // Fill email after nome/cognome are set
    if (cols.includes('email')) {
      row.email = generateEmail(row.nome || 'utente', row.cognome || 'sconosciuto');
    }

    rows.push(row);
  }

  // Apply conditions to ensure data matches WHERE
  for (const cond of (conditions || [])) {
    rows = rows.map(row => {
      const adjusted = { ...row };
      if (cond.col === 'età' && adjusted['età'] !== undefined) {
        const target = parseInt(cond.val, 10);
        switch (cond.op) {
          case '>':  adjusted['età'] = rand(target + 1, Math.max(target + 30, target + 5)); break;
          case '<':  adjusted['età'] = rand(Math.min(target - 1, 18), target - 1); break;
          case '>=': adjusted['età'] = rand(target, Math.max(target + 30, target + 5)); break;
          case '<=': adjusted['età'] = rand(Math.min(target, 18), target); break;
          case '=':  adjusted['età'] = target; break;
          case '!=':
            let v = rand(18, 80);
            while (v === target) v = rand(18, 80);
            adjusted['età'] = v;
            break;
        }
      }
      if (cond.col === 'città' && adjusted['città'] !== undefined) {
        if (cond.op === '=') adjusted['città'] = cond.val;
        else if (cond.op === '!=') {
          let c = pick(CITTA);
          while (c.toLowerCase() === cond.val.toLowerCase()) c = pick(CITTA);
          adjusted['città'] = c;
        }
      }
      if (cond.col === 'nome' && adjusted['nome'] !== undefined) {
        if (cond.op === '=') adjusted['nome'] = cond.val;
      }
      if (cond.col === 'cognome' && adjusted['cognome'] !== undefined) {
        if (cond.op === '=') adjusted['cognome'] = cond.val;
      }
      if (cond.col === 'prezzo' && adjusted['prezzo'] !== undefined) {
        const target = parseFloat(cond.val);
        switch (cond.op) {
          case '>':  adjusted['prezzo'] = parseFloat((target + Math.random() * 100).toFixed(2)); break;
          case '<':  adjusted['prezzo'] = parseFloat((Math.max(target - Math.random() * target, 0.01)).toFixed(2)); break;
          case '=':  adjusted['prezzo'] = target; break;
        }
      }
      if (cond.col === 'importo' && adjusted['importo'] !== undefined) {
        const target = parseFloat(cond.val);
        switch (cond.op) {
          case '>':  adjusted['importo'] = parseFloat((target + Math.random() * 500).toFixed(2)); break;
          case '<':  adjusted['importo'] = parseFloat((Math.max(target - Math.random() * target, 0.01)).toFixed(2)); break;
          case '=':  adjusted['importo'] = target; break;
        }
      }
      if (cond.col === 'stipendio' && adjusted['stipendio'] !== undefined) {
        const target = parseInt(cond.val, 10);
        switch (cond.op) {
          case '>':  adjusted['stipendio'] = rand(target + 100, target + 30000); break;
          case '<':  adjusted['stipendio'] = rand(15000, target - 100); break;
          case '=':  adjusted['stipendio'] = target; break;
        }
      }
      return adjusted;
    });
  }

  // Apply ORDER BY
  if (orderBy) {
    const { col, dir } = orderBy;
    const multiplier = dir === 'DESC' ? -1 : 1;
    rows.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'number' && typeof vb === 'number') {
        return multiplier * (va - vb);
      }
      return multiplier * String(va).localeCompare(String(vb), 'it');
    });
  }

  // Apply LIMIT
  if (limit && limit > 0 && limit < rows.length) {
    rows = rows.slice(0, limit);
  }

  return rows;
}
