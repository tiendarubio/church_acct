// app.js — helpers comunes para la app de contabilidad de iglesia

const CHURCH_BIN_ID = '6937440743b1c97be9e08143';

// Cargar categorías desde /api/church-data
async function loadChurchCategories() {
  const res = await fetch('/api/church-data');
  if (!res.ok) {
    let extra = '';
    try {
      const err = await res.json();
      extra = err && err.details ? `\nDetalles: ${err.details}` : '';
    } catch (_) {}
    throw new Error('Error al cargar categorías (' + res.status + ')' + extra);
  }
  return res.json();
}

// JSONBin helpers
function saveToBin(payload) {
  return fetch('/api/jsonbin-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId: CHURCH_BIN_ID, payload })
  }).then(r => {
    if (!r.ok) throw new Error('Error al guardar (' + r.status + ')');
    return r.json();
  });
}

function loadFromBin() {
  const url = '/api/jsonbin-load?binId=' + encodeURIComponent(CHURCH_BIN_ID);
  return fetch(url)
    .then(r => {
      if (!r.ok) throw new Error('Error al cargar desde servidor (' + r.status + ')');
      return r.json();
    })
    .then(d => d.record || d || null)
    .catch(e => {
      console.error('JSONBin load error:', e);
      return null;
    });
}

// Formato fecha/hora ES-SV
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
