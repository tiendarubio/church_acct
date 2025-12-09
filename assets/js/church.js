document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  const fechaInput       = $('fechaInput');
  const eventoInput      = $('eventoInput');
  const tipoIngresoRadio = $('tipoIngreso');
  const tipoEgresoRadio  = $('tipoEgreso');
  const categoriaSelect  = $('categoriaSelect');
  const montoInput       = $('montoInput');
  const descripcionInput = $('descripcionInput');

  const btnAddEntry  = $('btnAddEntry');
  const btnSaveAll   = $('btnSaveAll');
  const btnPDF       = $('btnPDF');
  const btnExcel     = $('btnExcel');
  const btnClearAll  = $('btnClearAll');

  const movBody      = $('movBody');
  const sumIngresos  = $('sumIngresos');
  const sumEgresos   = $('sumEgresos');
  const sumSaldo     = $('sumSaldo');
  const lastSaved    = $('lastSaved');

  // Estado en memoria
  let ledger = []; // {id, date, event, type, category, description, amount}
  let lastUpdateISO = null;

  // --- Fecha por defecto: hoy ---
  const hoy = new Date().toISOString().split('T')[0];
  fechaInput.value = hoy;

  // --- Cargar categorías desde Sheets ---
  await loadChurchCategories();
  updateCategorySelect();

  // --- Manejar cambio de tipo (Ingreso / Egreso) ---
  function updateCategorySelect() {
    const tipo = getSelectedType();
    categoriaSelect.innerHTML = '';

    if (!tipo) {
      categoriaSelect.disabled = true;
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Seleccione tipo primero…';
      categoriaSelect.appendChild(opt);
      return;
    }

    categoriaSelect.disabled = false;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Seleccione categoría…';
    categoriaSelect.appendChild(placeholder);

    const list = (tipo === 'ingreso') ? CHURCH_INCOME_CATS : CHURCH_EXPENSE_CATS;
    list.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoriaSelect.appendChild(opt);
    });
  }

  function getSelectedType() {
    if (tipoIngresoRadio.checked) return 'ingreso';
    if (tipoEgresoRadio.checked)  return 'egreso';
    return '';
  }

  tipoIngresoRadio.addEventListener('change', updateCategorySelect);
  tipoEgresoRadio.addEventListener('change', updateCategorySelect);

  // --- Añadir movimiento desde el formulario ---
  btnAddEntry.addEventListener('click', () => {
    const fecha   = (fechaInput.value || '').trim();
    const evento  = (eventoInput.value || '').trim();
    const tipo    = getSelectedType();
    const cat     = (categoriaSelect.value || '').trim();
    const monto   = parseFloat(montoInput.value);
    const desc    = (descripcionInput.value || '').trim();

    if (!fecha) {
      Swal.fire('Fecha requerida', 'Seleccione la fecha del movimiento.', 'info');
      return;
    }
    if (!evento) {
      Swal.fire('Evento requerido', 'Escriba el evento o actividad (ej. Culto general).', 'info');
      return;
    }
    if (!tipo) {
      Swal.fire('Tipo requerido', 'Seleccione si es Ingreso o Egreso.', 'info');
      return;
    }
    if (!cat) {
      Swal.fire('Categoría requerida', 'Seleccione una categoría.', 'info');
      return;
    }
    if (!(monto > 0)) {
      Swal.fire('Monto inválido', 'El monto debe ser mayor que 0.', 'warning');
      return;
    }

    const entry = {
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      date: fecha,
      event: evento,
      type: tipo,
      category: cat,
      description: desc,
      amount: Math.round(monto * 100) / 100
    };

    ledger.push(entry);
    renderTable();
    updateSummary();
    updateButtons();

    // Mantener fecha y evento, limpiar el resto
    montoInput.value = '';
    descripcionInput.value = '';
    categoriaSelect.value = '';
    montoInput.focus();
  });

  function renderTable() {
    movBody.innerHTML = '';
    ledger.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      const ingresoTxt = entry.type === 'ingreso' ? entry.amount.toFixed(2) : '';
      const egresoTxt  = entry.type === 'egreso'  ? entry.amount.toFixed(2) : '';
      tr.innerHTML = `
        <td class="text-center">${idx + 1}</td>
        <td>${entry.date}</td>
        <td>${entry.event}</td>
        <td class="text-capitalize">${entry.type}</td>
        <td>${entry.category}</td>
        <td>${entry.description || ''}</td>
        <td class="text-end">${ingresoTxt}</td>
        <td class="text-end">${egresoTxt}</td>
        <td class="text-center">
          <button class="btn btn-outline-danger btn-sm btn-delete-row" data-id="${entry.id}" title="Eliminar">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      `;
      movBody.appendChild(tr);
    });

    // Listeners para eliminar
    movBody.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        Swal.fire({
          title: '¿Eliminar movimiento?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Eliminar'
        }).then(res => {
          if (res.isConfirmed) {
            ledger = ledger.filter(e => e.id !== id);
            renderTable();
            updateSummary();
            updateButtons();
          }
        });
      });
    });
  }

  function updateSummary() {
    let totalIng = 0;
    let totalEgr = 0;
    ledger.forEach(e => {
      if (e.type === 'ingreso') totalIng += e.amount;
      else if (e.type === 'egreso') totalEgr += e.amount;
    });
    totalIng = Math.round(totalIng * 100) / 100;
    totalEgr = Math.round(totalEgr * 100) / 100;
    const saldo = Math.round((totalIng - totalEgr) * 100) / 100;

    sumIngresos.textContent = totalIng.toFixed(2);
    sumEgresos.textContent  = totalEgr.toFixed(2);
    sumSaldo.textContent    = saldo.toFixed(2);

    sumSaldo.classList.remove('positivo', 'negativo');
    if (saldo > 0) {
      sumSaldo.classList.add('positivo');
    } else if (saldo < 0) {
      sumSaldo.classList.add('negativo');
    }
  }

  function updateButtons() {
    const hasRows = ledger.length > 0;
    btnPDF.disabled   = !hasRows;
    btnExcel.disabled = !hasRows;
    btnClearAll.disabled = !hasRows;
  }

  // --- Guardar todo en JSONBin ---
  btnSaveAll.addEventListener('click', () => {
    const payload = {
      meta: {
        church: 'Misión Pentecostal de Jesucristo',
        updatedAt: new Date().toISOString()
      },
      entries: ledger
    };

    saveChurchToJSONBin(payload)
      .then(() => {
        lastUpdateISO = payload.meta.updatedAt;
        if (lastSaved) {
          lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
            'Última actualización: ' + formatSV(lastUpdateISO);
        }
        Swal.fire('Guardado', 'Los movimientos se han guardado correctamente.', 'success');
      })
      .catch(err => {
        Swal.fire('Error', String(err), 'error');
      });
  });

  // --- Limpiar todo (y guardar vacío) ---
  btnClearAll.addEventListener('click', () => {
    if (!ledger.length) return;
    Swal.fire({
      title: '¿Limpiar todos los movimientos?',
      text: 'Esto también guardará la lista vacía en la base de datos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar'
    }).then(res => {
      if (res.isConfirmed) {
        ledger = [];
        renderTable();
        updateSummary();
        updateButtons();

        const payload = {
          meta: {
            church: 'Misión Pentecostal de Jesucristo',
            updatedAt: new Date().toISOString()
          },
          entries: []
        };
        saveChurchToJSONBin(payload)
          .then(() => {
            lastUpdateISO = payload.meta.updatedAt;
            if (lastSaved) {
              lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
                'Última actualización: ' + formatSV(lastUpdateISO);
            }
            Swal.fire('Listo', 'Se vació la lista y se guardó el estado vacío.', 'success');
          })
          .catch(e => Swal.fire('Error', String(e), 'error'));
      }
    });
  });

  // --- Exportar a PDF ---
  btnPDF.addEventListener('click', () => {
    if (!ledger.length) return;
    const { jsPDF } = window.jspdf;
    const doc   = new jsPDF();
    const fecha = new Date().toISOString().split('T')[0];

    doc.setFontSize(12);
    doc.text('Misión Pentecostal de Jesucristo', 10, 10);
    doc.text('Reporte de movimientos', 10, 18);
    doc.text('Fecha de generación: ' + fecha, 10, 26);

    const rows = ledger.map((e, idx) => ([
      idx + 1,
      e.date,
      e.event,
      e.type,
      e.category,
      e.description || '',
      e.type === 'ingreso' ? e.amount.toFixed(2) : '',
      e.type === 'egreso'  ? e.amount.toFixed(2) : ''
    ]));

    doc.autoTable({
      startY: 34,
      head: [['#','Fecha','Evento','Tipo','Categoría','Descripción','Ingreso ($)','Egreso ($)']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 }
    });

    const finalY = doc.lastAutoTable.finalY + 6;
    doc.text(
      'Total ingresos: $' + sumIngresos.textContent +
      '   |   Total egresos: $' + sumEgresos.textContent +
      '   |   Saldo: $' + sumSaldo.textContent,
      10,
      finalY
    );

    const fileName = 'Cuenta_Iglesia_' + fecha + '.pdf';
    doc.save(fileName);
  });

  // --- Exportar a Excel ---
  btnExcel.addEventListener('click', () => {
    if (!ledger.length) return;

    const fecha = new Date().toISOString().split('T')[0];
    const data = [['Fecha','Evento','Tipo','Categoría','Descripción','Ingreso','Egreso']];

    ledger.forEach(e => {
      data.push([
        e.date,
        e.event,
        e.type,
        e.category,
        e.description || '',
        e.type === 'ingreso' ? e.amount : '',
        e.type === 'egreso'  ? e.amount : ''
      ]);
    });

    const wb   = XLSX.utils.book_new();
    const ws   = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob  = new Blob([wbout], { type: 'application/octet-stream' });
    const link  = document.createElement('a');
    link.href   = URL.createObjectURL(blob);
    link.download = 'Cuenta_Iglesia_' + fecha + '.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // --- Cargar datos ya guardados en JSONBin al iniciar ---
  try {
    const record = await loadChurchFromJSONBin();
    if (record && Array.isArray(record.entries)) {
      ledger = record.entries.map(e => ({
        id: e.id || (Date.now().toString() + Math.random().toString(16).slice(2)),
        date: e.date || '',
        event: e.event || '',
        type: e.type || '',
        category: e.category || '',
        description: e.description || '',
        amount: Number(e.amount) || 0
      }));
      lastUpdateISO = record.meta?.updatedAt || record.meta?.updated_at || null;
      if (lastSaved && lastUpdateISO) {
        lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
          'Última actualización: ' + formatSV(lastUpdateISO);
      }
      renderTable();
      updateSummary();
      updateButtons();
    }
  } catch (err) {
    console.error('Error al cargar datos iniciales de JSONBin:', err);
  }

  // Foco inicial cómodo
  eventoInput.focus();
});
