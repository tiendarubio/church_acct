// api/church-data.js — Proxy a Google Sheets para categorías de ingresos y egresos
export default async function handler(req, res) {
  try {
    const apiKey  = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    const range   = process.env.GOOGLE_SHEETS_CHURCH_RANGE || 'church_data!A2:B5000';

    if (!apiKey || !sheetId) {
      return res.status(500).json({ error: 'Faltan variables de entorno GOOGLE_SHEETS_API_KEY o GOOGLE_SHEETS_SHEET_ID.' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Error al consultar Google Sheets (church_data)', details: text });
    }

    const data = await response.json();
    const rows = Array.isArray(data.values) ? data.values : [];

    const incomes = [];
    const expenses = [];

    rows.forEach(row => {
      const inc = (row[0] || '').toString().trim();
      const exp = (row[1] || '').toString().trim();
      if (inc) incomes.push(inc);
      if (exp) expenses.push(exp);
    });

    return res.status(200).json({ incomes, expenses });
  } catch (err) {
    console.error('Error interno en /api/church-data:', err);
    return res.status(500).json({ error: 'Error interno en /api/church-data' });
  }
}
