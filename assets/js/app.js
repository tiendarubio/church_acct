// app.js — Helpers compartidos para la app de la iglesia (Vercel)

// BIN único para la contabilidad de la iglesia
const CHURCH_BIN_ID = '6937440743b1c97be9e08143';

// Cache de categorías
let CHURCH_INCOME_CATEGORIES = [];
let CHURCH_EXPENSE_CATEGORIES = [];

// Cargar categorías desde Google Sheets -> /api/church-data
async function loadChurchCategories() {
  try {
    const res = await fetch('/api/church-data');
    if (!res.ok) {
      throw new Error('Error al cargar categorías (' + res.status + ')');
    }
    const data = await res.json();
    CHURCH_INCOME_CATEGORIES = Array.isArray(data.incomes) ? data.incomes : [];
    CHURCH_EXPENSE_CATEGORIES = Array.isArray(data.expenses) ? data.expenses : [];
    return { incomes: CHURCH_INCOME_CATEGORIES, expenses: CHURCH_EXPENSE_CATEGORIES };
  } catch (err) {
    console.error('Error loadChurchCategories:', err);
    CHURCH_INCOME_CATEGORIES = [];
    CHURCH_EXPENSE_CATEGORIES = [];
    throw err;
  }
}

// JSONBin helpers usando APIs internas (llaves ocultas)
function saveChurchData(payload) {
  if (!CHURCH_BIN_ID) {
    return Promise.reject(new Error('BIN de iglesia no configurado.'));
  }
  return fetch('/api/jsonbin-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId: CHURCH_BIN_ID, payload })
  }).then((r) => {
    if (!r.ok) throw new Error('Error al guardar (' + r.status + ')');
    return r.json();
  });
}

function loadChurchData() {
  if (!CHURCH_BIN_ID) return Promise.resolve(null);
  return fetch('/api/jsonbin-load?binId=' + encodeURIComponent(CHURCH_BIN_ID))
    .then((r) => {
      if (!r.ok) throw new Error('Error al cargar (' + r.status + ')');
      return r.json();
    })
    .then((d) => d.record || d || null)
    .catch((err) => {
      console.error('JSONBin load error:', err);
      return null;
    });
}

// Formatear fecha/hora a formato ES-SV
function formatSV(iso) {
  if (!iso) return 'Aún no guardado.';
  try {
    const dt = new Date(iso);
    return dt.toLocaleString('es-SV', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return 'Aún no guardado.';
  }
}