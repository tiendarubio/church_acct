export default async function handler(req, res) {
  try {
    const apiKey  = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_ID;

    if (!apiKey || !sheetId) {
      res.status(500).json({ error: 'Faltan variables de entorno de Google Sheets' });
      return;
    }

    const range = 'church_data!A2:B5000';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      res.status(resp.status).json({ error: 'Error en Google Sheets', details: text });
      return;
    }

    const data = await resp.json();
    const values = Array.isArray(data.values) ? data.values : [];

    const incomesSet = new Set();
    const expensesSet = new Set();

    values.forEach(row => {
      if (!Array.isArray(row)) return;
      const inc = (row[0] || '').trim();
      const exp = (row[1] || '').trim();
      if (inc) incomesSet.add(inc);
      if (exp) expensesSet.add(exp);
    });

    const incomes = Array.from(incomesSet);
    const expenses = Array.from(expensesSet);

    res.status(200).json({ incomes, expenses });
  } catch (err) {
    console.error('church-data error', err);
    res.status(500).json({ error: 'Error interno en church-data', details: String(err) });
  }
}
