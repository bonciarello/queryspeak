/**
 * Test suite for QuerySpeak NLP parser and data generator
 */
import { parseItalianToSQL, KNOWN_TABLES } from './src/lib/parser.js';
import { generateFakeData } from './src/lib/generator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertContains(haystack, needle, message) {
  const ok = haystack.includes(needle);
  if (ok) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
    console.error(`    Expected to contain: "${needle}"`);
    console.error(`    Got: "${haystack}"`);
  }
}

// ─── Test 1: Acceptance criteria — "trova tutti i clienti con più di 30 anni" ───
console.log('\n📋 Test 1: Criterio accettazione — clienti over 30');
const r1 = parseItalianToSQL('Trova tutti i clienti con più di 30 anni');
assert(r1.table === 'clienti', 'Riconosce tabella "clienti"');
assertContains(r1.sql, 'WHERE età > 30', 'Query contiene WHERE età > 30');
assertContains(r1.sql, 'SELECT *', 'Query contiene SELECT *');
assertContains(r1.sql, 'FROM clienti', 'Query contiene FROM clienti');

const d1 = generateFakeData(r1, 8);
assert(d1.length >= 3, 'Genera almeno 3 righe');
assert(d1.every(row => row['età'] > 30), 'Tutte le età sono > 30');
assert(d1.some(row => row.nome && row.cognome && row['città']),
  'Righe contengono nome, cognome e città');

// ─── Test 2: Clienti di Milano ───
console.log('\n📋 Test 2: Clienti di Milano');
const r2 = parseItalianToSQL('Mostra tutti i clienti che abitano a Milano');
assertContains(r2.sql, "città = 'Milano'", 'WHERE città = Milano');
const d2 = generateFakeData(r2, 8);
assert(d2.every(row => row['città'] === 'Milano' || row['città'].toLowerCase() === 'milano'),
  'Tutti i record hanno città Milano');

// ─── Test 3: Meno di X ───
console.log('\n📋 Test 3: Meno di 25 anni');
const r3 = parseItalianToSQL('Trova tutti i clienti con meno di 25 anni');
assertContains(r3.sql, 'età < 25', 'WHERE età < 25');
const d3 = generateFakeData(r3, 8);
assert(d3.every(row => row['età'] < 25), 'Tutte le età sono < 25');

// ─── Test 4: ORDER BY ───
console.log('\n📋 Test 4: ORDER BY');
const r4 = parseItalianToSQL('Mostra tutti i prodotti ordinati per prezzo crescente');
assertContains(r4.sql, 'ORDER BY prezzo ASC', 'ORDER BY prezzo ASC');

// ─── Test 5: LIMIT ───
console.log('\n📋 Test 5: LIMIT');
const r5 = parseItalianToSQL('Elenca i primi 5 clienti');
assertContains(r5.sql, 'LIMIT 5', 'LIMIT 5');
const d5 = generateFakeData(r5, 20);
assert(d5.length <= 5, 'Righe limitate a 5');

// ─── Test 6: Aggregate COUNT ───
console.log('\n📋 Test 6: COUNT');
const r6 = parseItalianToSQL('Conta quanti clienti ci sono');
assertContains(r6.sql, 'COUNT', 'Contiene COUNT');
assert(r6.aggregate !== null, 'Rileva aggregazione');

// ─── Test 7: GROUP BY ───
console.log('\n📋 Test 7: GROUP BY');
const r7 = parseItalianToSQL('Raggruppa i clienti per città');
assertContains(r7.sql, 'GROUP BY città', 'GROUP BY città');

// ─── Test 8: Almeno (>=) ───
console.log('\n📋 Test 8: Almeno (>=)');
const r8 = parseItalianToSQL('Trova tutti i clienti con almeno 30 anni');
assertContains(r8.sql, 'età >= 30', 'età >= 30');

// ─── Test 9: Table detection ───
console.log('\n📋 Test 9: Riconoscimento tabelle');
const r9a = parseItalianToSQL('Trova tutti i prodotti con prezzo maggiore di 100');
assert(r9a.table === 'prodotti', 'Riconosce prodotti');
const r9b = parseItalianToSQL('Elenca tutti gli ordini');
assert(r9b.table === 'ordini', 'Riconosce ordini');
const r9c = parseItalianToSQL('Mostra i dipendenti');
assert(r9c.table === 'dipendenti', 'Riconosce dipendenti');

// ─── Test 10: Edge cases ───
console.log('\n📋 Test 10: Edge cases');
const r10a = parseItalianToSQL('');
assert(r10a.error !== null, 'Frase vuota genera errore');
const r10b = parseItalianToSQL('Ciao mondo');
assert(r10b.sql !== '', 'Frase generica produce comunque SQL');

// ─── Test 11: Data generator respects multiple conditions ───
console.log('\n📋 Test 11: Condizioni multiple');
const r11 = parseItalianToSQL('Trova tutti i clienti di Roma con almeno 40 anni');
assert(r11.conditions.length >= 2, 'Rileva almeno 2 condizioni');
const d11 = generateFakeData(r11, 10);
assert(d11.every(row => row['città'] === 'Roma'), 'Città = Roma');
assert(d11.every(row => row['età'] >= 40), 'Età >= 40');

// ─── Test 12: Data type handling ───
console.log('\n📋 Test 12: Tipi di dato');
const d12 = generateFakeData(r1, 5);
assert(typeof d12[0].id === 'number', 'ID è numerico');
assert(typeof d12[0].nome === 'string', 'Nome è stringa');
assert(typeof d12[0]['età'] === 'number', 'Età è numerico');
assert(d12[0].email && d12[0].email.includes('@'), 'Email contiene @');
assert(d12[0].telefono && d12[0].telefono.startsWith('+39'), 'Telefono inizia con +39');

// ─── Summary ───
console.log('\n' + '='.repeat(50));
console.log(`  Totale: ${passed} passati, ${failed} falliti`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  process.exit(1);
}
