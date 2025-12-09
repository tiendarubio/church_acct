// app.js — Helpers para Cuenta Iglesia (Vercel, llaves ocultas en backend)

// BIN único para la contabilidad de la iglesia
const CHURCH_BIN_ID = '6937440743b1c97be9e08143';

// Categorías (se cargan desde Google Sheets vía /api/church-data)
let CHURCH_INCOME_CATS = [];
let CHURCH_EXPENSE_CATS = [];

/**
 * Carga categorías de ingresos y egresos desde Google Sheets.
 * Hoja: church_data
 * Columna A (desde fila 2): Ingresos
 * Columna B (desde fila 2): Egresos
 */
async function loadChurchCategories() {
  try {
    const resp = await fetch('/api/church-data');
    if (!resp.ok) {
      throw new Error('Error al cargar categorías (' + resp.status + ')');
    }
    const data = await resp.json();
    CHURCH_INCOME_CATS = Array.isArray(data.incomes) ? data.incomes : [];
    CHURCH_EXPENSE_CATS = Array.isArray(data.expenses) ? data.expenses : [];
  } catch (err) {
    console.error('Error loadChurchCategories:', err);
    CHURCH_INCOME_CATS = [];
    CHURCH_EXPENSE_CATS = [];
  }
}

/**
 * Guarda el estado completo (todas las filas) en JSONBin
 */
function saveChurchToJSONBin(payload) {
  if (!CHURCH_BIN_ID) {
    return Promise.reject(new Error('BIN de iglesia no configurado.'));
  }
  return fetch('/api/jsonbin-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId: CHURCH_BIN_ID, payload })
  }).then(r => {
    if (!r.ok) {
      throw new Error('Error al guardar en servidor (' + r.status + ')');
    }
    return r.json();
  });
}

/**
 * Carga el estado completo desde JSONBin
 */
function loadChurchFromJSONBin() {
  if (!CHURCH_BIN_ID) return Promise.resolve(null);
  return fetch('/api/jsonbin-load?binId=' + encodeURIComponent(CHURCH_BIN_ID))
    .then(r => {
      if (!r.ok) {
        throw new Error('Error al cargar desde servidor (' + r.status + ')');
      }
      return r.json();
    })
    .then(d => d.record || d || null)
    .catch(err => {
      console.error('JSONBin load error:', err);
      return null;
    });
}

/**
 * Formatea fecha/hora a formato ES-SV
 */
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
