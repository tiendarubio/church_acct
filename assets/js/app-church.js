// app-church.js — Helpers específicos para la app de la iglesia

// BIN único para todos los movimientos de la iglesia
const CHURCH_BIN_ID = '6937440743b1c97be9e08143';

// Cache de categorías
let CHURCH_INCOME_CATEGORIES = [];
let CHURCH_EXPENSE_CATEGORIES = [];

/**
 * Cargar categorías de ingresos y egresos desde /api/church-data
 * Devuelve { incomes: [], expenses: [] }
 */
function loadChurchCategories() {
  // Si ya están en caché, no volvemos a llamar
  if (CHURCH_INCOME_CATEGORIES.length || CHURCH_EXPENSE_CATEGORIES.length) {
    return Promise.resolve({
      incomes: CHURCH_INCOME_CATEGORIES,
      expenses: CHURCH_EXPENSE_CATEGORIES
    });
  }

  return fetch('/api/church-data')
    .then((r) => {
      if (!r.ok) {
        throw new Error('Error al cargar categorías (' + r.status + ')');
      }
      return r.json();
    })
    .then((data) => {
      const incomes = Array.isArray(data.incomes) ? data.incomes : [];
      const expenses = Array.isArray(data.expenses) ? data.expenses : [];

      CHURCH_INCOME_CATEGORIES = incomes;
      CHURCH_EXPENSE_CATEGORIES = expenses;

      return { incomes, expenses };
    })
    .catch((err) => {
      console.error('Error loadChurchCategories:', err);
      throw err;
    });
}

/**
 * Cargar datos guardados en JSONBin para la iglesia
 */
function loadChurchDataFromJSONBin() {
  return fetch('/api/jsonbin-load?binId=' + encodeURIComponent(CHURCH_BIN_ID))
    .then((r) => {
      if (!r.ok) {
        throw new Error('Error al cargar datos (' + r.status + ')');
      }
      return r.json();
    })
    .then((d) => d.record || d || {})
    .catch((err) => {
      console.error('Error al leer JSONBin (iglesia):', err);
      return {};
    });
}

/**
 * Guardar datos en JSONBin para la iglesia
 * payload debe seguir la estructura indicada en el enunciado
 */
function saveChurchDataToJSONBin(payload) {
  return fetch('/api/jsonbin-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId: CHURCH_BIN_ID, payload })
  }).then((r) => {
    if (!r.ok) {
      throw new Error('Error al guardar en JSONBin (' + r.status + ')');
    }
    return r.json();
  });
}

/**
 * Helper para nombres de archivo (PDF / Excel)
 */
function sanitizeFilename(s) {
  return (s || '')
    .toString()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-.]/g, '_');
}
