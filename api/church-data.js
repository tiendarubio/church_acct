// api/church-data.js — Lee categorías de ingresos y egresos desde Google Sheets
export default async function handler(req, res) {
  try {
    const apiKey  = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_CHURCH_SHEET || 'church_data';
    const range   = process.env.GOOGLE_SHEETS_CHURCH_RANGE || `${sheetName}!A2:B5000`;

    if (!apiKey || !sheetId) {
      return res.status(500).json({ error: 'Faltan GOOGLE_SHEETS_API_KEY o GOOGLE_SHEETS_SHEET_ID en variables de entorno.' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Error al consultar Google Sheets (church_data)', details: text });
    }

    const data = await response.json();
    const values = Array.isArray(data.values) ? data.values : [];

    const incomes = [];
    const expenses = [];

    for (const row of values) {
      if (row[0] && String(row[0]).trim() !== '') {
        incomes.push(String(row[0]).trim());
      }
      if (row[1] && String(row[1]).trim() !== '') {
        expenses.push(String(row[1]).trim());
      }
    }

    return res.status(200).json({ incomes, expenses });
  } catch (err) {
    console.error('church-data error', err);
    return res.status(500).json({ error: 'Error interno en /api/church-data', details: String(err) });
  }
}