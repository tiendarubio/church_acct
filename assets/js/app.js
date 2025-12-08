// app.js — Helpers para JSONBin y Google Sheets (categorías de iglesia)

function loadChurchCategories() {
  return fetch('/api/church-data')
    .then(r => {
      if (!r.ok) throw new Error('Error al cargar categorías (' + r.status + ')');
      return r.json();
    })
    .catch(e => {
      console.error('Error loadChurchCategories:', e);
      return { incomes: [], expenses: [] };
    });
}

function saveToBin(binId, payload) {
  if (!binId) {
    return Promise.reject(new Error('BIN no configurado.'));
  }

  return fetch('/api/jsonbin-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId, payload })
  }).then(r => {
    if (!r.ok) throw new Error('Error al guardar en servidor (' + r.status + ')');
    return r.json();
  });
}

function loadFromBin(binId) {
  if (!binId) return Promise.resolve(null);
  const url = '/api/jsonbin-load?binId=' + encodeURIComponent(binId);

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
