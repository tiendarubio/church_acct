document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  const lastSaved = $('lastSaved');

  const movFecha = $('movFecha');
  const movEvento = $('movEvento');
  const movTipo = $('movTipo');
  const movCategoria = $('movCategoria');
  const movMonto = $('movMonto');
  const movMetodo = $('movMetodo');
  const movResponsable = $('movResponsable');
  const movDescripcion = $('movDescripcion');
  const movNota = $('movNota');
  const btnAddMovement = $('btnAddMovement');

  const filterEvento = $('filterEvento');
  const filterTipo = $('filterTipo');
  const filterDesde = $('filterDesde');
  const filterHasta = $('filterHasta');
  const btnApplyFilters = $('btnApplyFilters');
  const btnClearFilters = $('btnClearFilters');

  const movBody = $('movBody');

  const totalIngresosEl = $('totalIngresos');
  const totalEgresosEl = $('totalEgresos');
  const saldoEl = $('saldo');

  const btnSave = $('btnSave');
  const btnPDF = $('btnPDF');
  const btnExcel = $('btnExcel');
  const btnClear = $('btnClear');

  const CHURCH_NAME = 'Misión Pentecostal de Jesucristo';
  const CHURCH_BIN = '6937440743b1c97be9e08143';

  let incomeCats = [];
  let expenseCats = [];
  let movimientos = [];
  let lastUpdateISO = null;
  let editingIndex = null;

  function setToday() {
    const today = new Date().toISOString().split('T')[0];
    if (!movFecha.value) movFecha.value = today;
    if (!filterDesde.value) filterDesde.value = today;
  }

  function updateLastSavedLabel() {
    lastSaved.innerHTML =
      '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
      (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : 'Aún no guardado.');
  }

  function refreshCategoriaOptions() {
    const tipo = movTipo.value || 'INGRESO';
    const source = tipo === 'EGRESO' ? expenseCats : incomeCats;
    movCategoria.innerHTML = '';
    const optDefault = document.createElement('option');
    optDefault.value = '';
    optDefault.textContent = 'Seleccione…';
    movCategoria.appendChild(optDefault);

    source.forEach(cat => {
      const v = (cat || '').trim();
      if (!v) return;
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      movCategoria.appendChild(opt);
    });
  }

  function clearForm() {
    const currentDate = movFecha.value;
    const currentTipo = movTipo.value;
    movEvento.value = '';
    movMonto.value = '';
    movResponsable.value = '';
    movDescripcion.value = '';
    movNota.value = '';
    movFecha.value = currentDate;
    movTipo.value = currentTipo;
    refreshCategoriaOptions();
    movCategoria.value = '';
    editingIndex = null;
    btnAddMovement.innerHTML = '<i class="fa-solid fa-plus me-1"></i> Agregar a la tabla';
  }

  function getFilteredMovimientos() {
    const evFilter = (filterEvento.value || '').trim().toLowerCase();
    const tipoFilter = filterTipo.value || 'TODOS';
    const desde = filterDesde.value || null;
    const hasta = filterHasta.value || null;

    return movimientos.filter(m => {
      if (evFilter && !m.evento.toLowerCase().includes(evFilter)) return false;
      if (tipoFilter !== 'TODOS' && m.tipo !== tipoFilter) return false;
      if (desde && m.fecha < desde) return false;
      if (hasta && m.fecha > hasta) return false;
      return true;
    });
  }

  function formatMoney(n) {
    const num = Number(n) || 0;
    return '$ ' + num.toFixed(2);
  }

  function updateSummary() {
    const data = getFilteredMovimientos();
    let totalIng = 0;
    let totalEgr = 0;

    data.forEach(m => {
      const amount = Number(m.monto) || 0;
      if (m.tipo === 'INGRESO') totalIng += amount;
      else if (m.tipo === 'EGRESO') totalEgr += amount;
    });

    totalIngresosEl.textContent = formatMoney(totalIng);
    totalEgresosEl.textContent = formatMoney(totalEgr);
    saldoEl.textContent = formatMoney(totalIng - totalEgr);
  }

  function renderTable() {
    const data = getFilteredMovimientos();
    movBody.innerHTML = '';

    data.forEach((m, idx) => {
      const globalIndex = movimientos.indexOf(m);
      const tr = document.createElement('tr');
      tr.dataset.index = String(globalIndex);

      const tipoBadgeClass = m.tipo === 'INGRESO' ? 'badge-tipo-ingreso' : 'badge-tipo-egreso';

      tr.innerHTML = `
        <td class="text-center">${idx + 1}</td>
        <td class="text-nowrap">${m.fecha || ''}</td>
        <td>${m.evento || ''}</td>
        <td class="text-nowrap">
          <span class="badge ${tipoBadgeClass}">${m.tipo || ''}</span>
        </td>
        <td>${m.categoria || ''}</td>
        <td>${m.descripcion || ''}</td>
        <td class="text-end text-nowrap">${formatMoney(m.monto)}</td>
        <td class="text-nowrap">${m.metodo_pago || ''}</td>
        <td>${m.responsable || ''}</td>
        <td class="text-center text-nowrap">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-secondary btn-edit" title="Editar">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-outline-danger btn-delete" title="Eliminar">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;

      const btnEdit = tr.querySelector('.btn-edit');
      const btnDelete = tr.querySelector('.btn-delete');

      btnEdit.addEventListener('click', () => handleEdit(globalIndex));
      btnDelete.addEventListener('click', () => handleDelete(globalIndex));

      movBody.appendChild(tr);
    });

    updateSummary();
  }

  function handleEdit(index) {
    const m = movimientos[index];
    if (!m) return;

    editingIndex = index;
    movFecha.value = m.fecha || '';
    movEvento.value = m.evento || '';
    movTipo.value = m.tipo || 'INGRESO';
    refreshCategoriaOptions();
    movCategoria.value = m.categoria || '';
    movMonto.value = m.monto != null ? m.monto : '';
    movMetodo.value = m.metodo_pago || 'Efectivo';
    movResponsable.value = m.responsable || '';
    movDescripcion.value = m.descripcion || '';
    movNota.value = m.nota || '';

    btnAddMovement.innerHTML = '<i class="fa-solid fa-check me-1"></i> Actualizar movimiento';
    movFecha.focus();
  }

  function handleDelete(index) {
    const m = movimientos[index];
    if (!m) return;
    Swal.fire({
      title: '¿Eliminar movimiento?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        movimientos.splice(index, 1);
        renderTable();
      }
    });
  }

  function buildMovementFromForm() {
    const fecha = movFecha.value;
    const evento = (movEvento.value || '').trim();
    const tipo = movTipo.value;
    const categoria = movCategoria.value;
    const monto = parseFloat(movMonto.value || '0');
    const metodo_pago = movMetodo.value;
    const responsable = (movResponsable.value || '').trim();
    const descripcion = (movDescripcion.value || '').trim();
    const nota = (movNota.value || '').trim();

    if (!fecha) {
      throw new Error('La fecha es obligatoria.');
    }
    if (!tipo) {
      throw new Error('El tipo es obligatorio.');
    }
    if (!categoria) {
      throw new Error('La categoría es obligatoria.');
    }
    if (!monto || monto <= 0) {
      throw new Error('El monto debe ser mayor que 0.');
    }
    if (!descripcion) {
      throw new Error('La descripción es obligatoria.');
    }

    const nextId = movimientos.length
      ? Math.max(...movimientos.map(m => m.id || 0)) + 1
      : 1;

    return {
      id: editingIndex != null && movimientos[editingIndex]
        ? movimientos[editingIndex].id || nextId
        : nextId,
      fecha,
      evento,
      tipo,
      categoria,
      descripcion,
      monto,
      metodo_pago,
      responsable,
      nota
    };
  }

  async function handleSave() {
    const payload = {
      meta: {
        church: CHURCH_NAME,
        updatedAt: new Date().toISOString()
      },
      movimientos
    };

    try {
      await saveToBin(CHURCH_BIN, payload);
      lastUpdateISO = payload.meta.updatedAt;
      updateLastSavedLabel();
      Swal.fire('Guardado', 'Movimientos guardados correctamente.', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('Error', String(e), 'error');
    }
  }

  async function exportPDF() {
    const data = getFilteredMovimientos();
    if (!data.length) {
      Swal.fire('Sin datos', 'No hay movimientos para exportar.', 'info');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const today = new Date().toISOString().split('T')[0];

    doc.setFontSize(12);
    doc.text(CHURCH_NAME, 10, 10);
    doc.text('Reporte de movimientos', 10, 18);
    doc.text('Fecha de generación: ' + today, 10, 26);

    const filtroEv = (filterEvento.value || '').trim();
    const filtroTipo = filterTipo.value || 'TODOS';
    const desde = filterDesde.value || '';
    const hasta = filterHasta.value || '';

    let linea = 34;
    if (filtroEv) {
      doc.text('Evento contiene: ' + filtroEv, 10, linea);
      linea += 8;
    }
    if (filtroTipo !== 'TODOS') {
      doc.text('Tipo: ' + filtroTipo, 10, linea);
      linea += 8;
    }
    if (desde || hasta) {
      doc.text('Rango fechas: ' + (desde || '---') + ' a ' + (hasta || '---'), 10, linea);
      linea += 8;
    }

    const rows = data.map((m, idx) => [
      idx + 1,
      m.fecha || '',
      m.evento || '',
      m.tipo || '',
      m.categoria || '',
      m.descripcion || '',
      (Number(m.monto) || 0).toFixed(2),
      m.metodo_pago || '',
      m.responsable || ''
    ]);

    doc.autoTable({
      startY: linea + 4,
      head: [['#', 'Fecha', 'Evento', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Método', 'Responsable']],
      body: rows,
      pageBreak: 'auto'
    });

    const fileName = 'MPJ_Movimientos_' + today + '.pdf';
    doc.save(fileName);
    Swal.fire('Éxito', 'Se generó el PDF.', 'success');
  }

  async function exportExcel() {
    const data = getFilteredMovimientos();
    if (!data.length) {
      Swal.fire('Sin datos', 'No hay movimientos para exportar.', 'info');
      return;
    }

    const fechaActual = new Date().toISOString().split('T')[0];

    const finalData = [
      ['Fecha', 'Evento', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Método', 'Responsable', 'Nota']
    ];

    data.forEach(m => {
      finalData.push([
        m.fecha || '',
        m.evento || '',
        m.tipo || '',
        m.categoria || '',
        m.descripcion || '',
        Number(m.monto) || 0,
        m.metodo_pago || '',
        m.responsable || '',
        m.nota || ''
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = 0; C <= range.e.c; ++C) {
      for (let R = 1; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellRef]) continue;
        if (C === 5) {
          ws[cellRef].t = 'n';
        } else {
          ws[cellRef].t = 's';
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'MPJ_Movimientos_' + fechaActual + '.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire('Éxito', 'Se generó el Excel.', 'success');
  }

  // ========= Inicialización =========
  try {
    setToday();
    const cats = await loadChurchCategories();
    incomeCats = Array.isArray(cats.incomes) ? cats.incomes : [];
    expenseCats = Array.isArray(cats.expenses) ? cats.expenses : [];
    refreshCategoriaOptions();

    const rec = await loadFromBin(CHURCH_BIN);
    if (rec && Array.isArray(rec.movimientos)) {
      movimientos = rec.movimientos.map(m => ({
        id: m.id,
        fecha: m.fecha,
        evento: m.evento || '',
        tipo: m.tipo || 'INGRESO',
        categoria: m.categoria || '',
        descripcion: m.descripcion || '',
        monto: Number(m.monto) || 0,
        metodo_pago: m.metodo_pago || m.metodo || 'Efectivo',
        responsable: m.responsable || '',
        nota: m.nota || ''
      }));
      lastUpdateISO = rec.meta && rec.meta.updatedAt ? rec.meta.updatedAt : null;
    } else {
      movimientos = [];
      lastUpdateISO = null;
    }
    updateLastSavedLabel();
    renderTable();
  } catch (e) {
    console.error('Error inicializando aplicación:', e);
    Swal.fire('Error', 'No se pudieron cargar los datos iniciales.', 'error');
  }

  // ========= Event Listeners =========

  movTipo.addEventListener('change', () => {
    refreshCategoriaOptions();
  });

  btnAddMovement.addEventListener('click', () => {
    try {
      const movement = buildMovementFromForm();
      if (editingIndex != null) {
        movimientos[editingIndex] = movement;
      } else {
        movimientos.push(movement);
      }
      clearForm();
      renderTable();
    } catch (e) {
      Swal.fire('Datos incompletos', e.message, 'warning');
    }
  });

  btnApplyFilters.addEventListener('click', () => {
    renderTable();
  });

  btnClearFilters.addEventListener('click', () => {
    filterEvento.value = '';
    filterTipo.value = 'TODOS';
    filterDesde.value = '';
    filterHasta.value = '';
    renderTable();
  });

  btnSave.addEventListener('click', handleSave);
  btnPDF.addEventListener('click', exportPDF);
  btnExcel.addEventListener('click', exportExcel);

  btnClear.addEventListener('click', () => {
    if (!movimientos.length) return;
    Swal.fire({
      title: '¿Limpiar todos los movimientos?',
      text: 'Se eliminarán todos los registros de la tabla y de la base de datos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Limpiar todo',
      cancelButtonText: 'Cancelar'
    }).then(async res => {
      if (res.isConfirmed) {
        movimientos = [];
        renderTable();
        await handleSave();
      }
    });
  });
});
