// /api/church-data.js — Categorías de ingresos y egresos para la iglesia
export default async function handler(req, res) {
  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId =
      process.env.GOOGLE_SHEETS_SHEET_ID ||
      '1b5B9vp0GKc4T_mORssdj-J2vgc-xEO5YAFkcrVX-nHI';

    // church_data!A2:B1000 -> A ingresos, B egresos
    const range =
      process.env.GOOGLE_SHEETS_CHURCH_RANGE || 'church_data!A2:B1000';

    if (!apiKey) {
      return res
        .status(500)
        .json({ error: 'Falta GOOGLE_SHEETS_API_KEY en variables de entorno.' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
      range
    )}?key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: 'Error al consultar Google Sheets (church_data)',
        details: text
      });
    }

    const data = await response.json();
    const values = Array.isArray(data.values) ? data.values : [];

    const incomes = [];
    const expenses = [];

    values.forEach((row) => {
      const ingreso = row[0];
      const egreso = row[1];

      if (ingreso && String(ingreso).trim()) {
        incomes.push(String(ingreso).trim());
      }
      if (egreso && String(egreso).trim()) {
        expenses.push(String(egreso).trim());
      }
    });

    return res.status(200).json({ incomes, expenses });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: 'Error interno en /api/church-data' });
  }
}
