document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  const fechaInput       = $('fechaInput');
  const eventoInput      = $('eventoInput');
  const tipoIngresoRadio = $('tipoIngreso');
  const tipoEgresoRadio  = $('tipoEgreso');
  const categoriaSelect  = $('categoriaSelect');
  const montoInput       = $('montoInput');
  const descripcionInput = $('descripcionInput');
  const btnAgregar       = $('btnAgregar');

  const movBody          = $('movBody');
  const totalIngresosEl  = $('totalIngresos');
  const totalEgresosEl   = $('totalEgresos');
  const saldoEl          = $('saldo');
  const lastSavedEl      = $('lastSaved');
  const msgCategorias    = $('msgCategorias');

  const btnGuardar       = $('btnGuardar');
  const btnPDF           = $('btnPDF');
  const btnExcel         = $('btnExcel');
  const btnLimpiar       = $('btnLimpiar');

  const today = new Date().toISOString().split('T')[0];
  fechaInput.value = today;

  function parseNum(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  function fix2(n) {
    return Math.round(n * 100) / 100;
  }

  // --- Cargar categorías desde backend ---
  async function initCategorias() {
    try {
      msgCategorias.style.display = 'none';
      categoriaSelect.innerHTML = '<option value="">Cargando categorías...</option>';

      const { incomes, expenses } = await loadChurchCategories();
      if (!incomes.length && !expenses.length) {
        categoriaSelect.innerHTML = '<option value="">No se encontraron categorías en church_data</option>';
        msgCategorias.textContent = 'Revise la hoja "church_data": columna A (ingresos) y columna B (egresos), desde la fila 2.';
        msgCategorias.style.display = 'block';
        return;
      }
      // Por defecto se muestran ingresos (porque el toggle inicia en ingreso)
      fillCategoriaOptions('ingreso');
    } catch (err) {
      categoriaSelect.innerHTML = '<option value="">No se pudieron cargar las categorías</option>';
      msgCategorias.textContent = 'No se pudo conectar con /api/church-data. Revise las variables de entorno en Vercel.';
      msgCategorias.style.display = 'block';
    }
  }

  function fillCategoriaOptions(tipo) {
    categoriaSelect.innerHTML = '';
    const list = (tipo === 'ingreso') ? CHURCH_INCOME_CATEGORIES : CHURCH_EXPENSE_CATEGORIES;
    if (!list || !list.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No hay categorías configuradas para ' + (tipo === 'ingreso' ? 'ingresos' : 'egresos');
      categoriaSelect.appendChild(opt);
      return;
    }
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = 'Seleccione una categoría';
    categoriaSelect.appendChild(opt0);

    list.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categoriaSelect.appendChild(opt);
    });
  }

  tipoIngresoRadio.addEventListener('change', () => {
    if (tipoIngresoRadio.checked) fillCategoriaOptions('ingreso');
  });
  tipoEgresoRadio.addEventListener('change', () => {
    if (tipoEgresoRadio.checked) fillCategoriaOptions('egreso');
  });

  await initCategorias();

  // --- Manejo de tabla ---
  function renumber() {
    [...movBody.getElementsByTagName('tr')].forEach((row, idx) => {
      row.cells[0].textContent = idx + 1;
    });
  }

  function recalcTotals() {
    let ingresos = 0;
    let egresos  = 0;

    [...movBody.getElementsByTagName('tr')].forEach((tr) => {
      const tipo  = tr.dataset.tipo || '';
      const monto = parseNum(tr.dataset.monto || tr.cells[5].innerText.replace(/[^\d.-]/g, ''));
      if (tipo === 'ingreso') ingresos += monto;
      else if (tipo === 'egreso') egresos += monto;
    });

    ingresos = fix2(ingresos);
    egresos  = fix2(egresos);
    const saldo = fix2(ingresos - egresos);

    totalIngresosEl.textContent = '$' + ingresos.toFixed(2);
    totalEgresosEl.textContent  = '$' + egresos.toFixed(2);

    saldoEl.textContent = '$' + saldo.toFixed(2);
    saldoEl.classList.remove('text-success', 'text-danger');
    if (saldo >= 0) saldoEl.classList.add('text-success');
    else saldoEl.classList.add('text-danger');
  }

  function addRowFromData(item) {
    const tr = document.createElement('tr');
    tr.dataset.tipo  = item.tipo || '';
    tr.dataset.monto = item.monto != null ? String(item.monto) : '0';

    const tipoLabel = item.tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
    const tipoBadgeClass = item.tipo === 'ingreso' ? 'bg-success' : 'bg-danger';

    tr.innerHTML = `
      <td class="text-center"></td>
      <td>${item.fecha || ''}</td>
      <td>${item.evento || ''}</td>
      <td class="text-nowrap">
        <span class="badge ${tipoBadgeClass}">${tipoLabel}</span>
      </td>
      <td>${item.categoria || ''}</td>
      <td class="text-end">$${fix2(item.monto || 0).toFixed(2)}</td>
      <td>${item.descripcion || ''}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-danger btn-delete" title="Eliminar">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    movBody.appendChild(tr);
    renumber();
    recalcTotals();

    const delBtn = tr.querySelector('.btn-delete');
    delBtn.addEventListener('click', () => {
      Swal.fire({
        title: '¿Eliminar registro?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar'
      }).then((res) => {
        if (res.isConfirmed) {
          tr.remove();
          renumber();
          recalcTotals();
        }
      });
    });
  }

  // --- Cargar datos guardados previamente en JSONBin ---
  async function loadExistingData() {
    const record = await loadChurchData();
    if (record && Array.isArray(record.movimientos)) {
      record.movimientos.forEach(addRowFromData);
      if (record.meta && record.meta.updatedAt) {
        lastSavedEl.innerHTML =
          '<i class="fa-solid fa-clock-rotate-left me-1"></i> Última actualización: ' +
          formatSV(record.meta.updatedAt);
      }
    }
    recalcTotals();
  }

  await loadExistingData();

  // --- Agregar nuevo registro ---
  function getSelectedTipo() {
    return tipoIngresoRadio.checked ? 'ingreso' : 'egreso';
  }

  btnAgregar.addEventListener('click', () => {
    const fecha = fechaInput.value || today;
    const evento = eventoInput.value.trim();
    const tipo = getSelectedTipo();
    const categoria = categoriaSelect.value || '';
    const monto = parseNum(montoInput.value);
    const descripcion = descripcionInput.value.trim();

    if (!(monto > 0)) {
      Swal.fire('Monto requerido', 'Por favor ingrese un monto mayor a 0.', 'info');
      montoInput.focus();
      return;
    }

    if (!categoria) {
      Swal.fire('Categoría recomendada', 'Seleccione una categoría para llevar un mejor control.', 'info');
      categoriaSelect.focus();
      return;
    }

    const item = { fecha, evento, tipo, categoria, monto, descripcion };
    addRowFromData(item);

    eventoInput.value = '';
    montoInput.value = '';
    descripcionInput.value = '';
    eventoInput.focus();
  });

  // --- Guardar en JSONBin ---
  btnGuardar.addEventListener('click', () => {
    const movimientos = [...movBody.getElementsByTagName('tr')].map((tr) => {
      const fecha = tr.cells[1].innerText.trim();
      const evento = tr.cells[2].innerText.trim();
      const tipoText = tr.dataset.tipo || (tr.cells[3].innerText.includes('Ingreso') ? 'ingreso' : 'egreso');
      const categoria = tr.cells[4].innerText.trim();
      const monto = parseNum(tr.dataset.monto || tr.cells[5].innerText.replace(/[^\d.-]/g, ''));
      const descripcion = tr.cells[6].innerText.trim();
      return { fecha, evento, tipo: tipoText, categoria, monto, descripcion };
    });

    const totalIng = parseNum(totalIngresosEl.textContent.replace(/[^\d.-]/g, ''));
    const totalEgr = parseNum(totalEgresosEl.textContent.replace(/[^\d.-]/g, ''));
    const saldoVal = parseNum(saldoEl.textContent.replace(/[^\d.-]/g, ''));

    const payload = {
      meta: {
        iglesia: 'Misión Pentecostal de Jesucristo',
        updatedAt: new Date().toISOString()
      },
      movimientos,
      totales: {
        ingresos: fix2(totalIng),
        egresos: fix2(totalEgr),
        saldo: fix2(saldoVal)
      }
    };

    saveChurchData(payload)
      .then(() => {
        lastSavedEl.innerHTML =
          '<i class="fa-solid fa-clock-rotate-left me-1"></i> Última actualización: ' +
          formatSV(payload.meta.updatedAt);
        Swal.fire('Guardado', 'Los datos se guardaron correctamente.', 'success');
      })
      .catch((e) => {
        console.error(e);
        Swal.fire('Error', String(e), 'error');
      });
  });

  // --- Exportar a PDF ---
  btnPDF.addEventListener('click', () => {
    if (!movBody.rows.length) {
      Swal.fire('Sin datos', 'No hay registros para exportar.', 'info');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fechaHoy = new Date().toISOString().split('T')[0];

    doc.setFontSize(12);
    doc.text('Misión Pentecostal de Jesucristo', 10, 10);
    doc.text('Control de ingresos y egresos', 10, 18);
    doc.text('Fecha de reporte: ' + fechaHoy, 10, 26);

    const rows = [...movBody.getElementsByTagName('tr')].map((tr, idx) => {
      const fecha = tr.cells[1].innerText.trim();
      const evento = tr.cells[2].innerText.trim();
      const tipo   = tr.dataset.tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
      const cat    = tr.cells[4].innerText.trim();
      const monto  = tr.cells[5].innerText.trim();
      const desc   = tr.cells[6].innerText.trim();
      return [idx + 1, fecha, evento, tipo, cat, monto, desc];
    });

    doc.autoTable({
      startY: 34,
      head: [['#', 'Fecha', 'Evento', 'Tipo', 'Categoría', 'Monto', 'Descripción']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { cellWidth: 35 },
        3: { cellWidth: 18 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 },
        6: { cellWidth: 60 }
      }
    });

    const y = doc.lastAutoTable.finalY + 6;
    doc.text(
      'Total Ingresos: ' + totalIngresosEl.textContent +
      '   |   Total Egresos: ' + totalEgresosEl.textContent +
      '   |   Saldo: ' + saldoEl.textContent,
      10,
      y
    );

    doc.save('MPJ_ingresos_egresos_' + fechaHoy + '.pdf');
  });

  // --- Exportar a Excel ---
  btnExcel.addEventListener('click', () => {
    if (!movBody.rows.length) {
      Swal.fire('Sin datos', 'No hay registros para exportar.', 'info');
      return;
    }
    const fechaHoy = new Date().toISOString().split('T')[0];
    const data = [['Fecha', 'Evento', 'Tipo', 'Categoría', 'Monto', 'Descripción']];

    [...movBody.getElementsByTagName('tr')].forEach((tr) => {
      const fecha = tr.cells[1].innerText.trim();
      const evento = tr.cells[2].innerText.trim();
      const tipoText = tr.dataset.tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
      const cat = tr.cells[4].innerText.trim();
      const monto = tr.cells[5].innerText.replace(/[^\d.-]/g, '');
      const desc = tr.cells[6].innerText.trim();
      data.push([fecha, evento, tipoText, cat, parseFloat(monto) || 0, desc]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'MPJ');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'MPJ_ingresos_egresos_' + fechaHoy + '.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // --- Limpiar todo ---
  btnLimpiar.addEventListener('click', () => {
    if (!movBody.rows.length &&
        !eventoInput.value.trim() &&
        !montoInput.value.trim() &&
        !descripcionInput.value.trim()) {
      return;
    }

    Swal.fire({
      title: '¿Limpiar todo?',
      text: 'Se vaciará la tabla y el formulario. Luego puede volver a guardar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        movBody.innerHTML = '';
        eventoInput.value = '';
        montoInput.value = '';
        descripcionInput.value = '';
        fechaInput.value = today;
        recalcTotals();
        lastSavedEl.innerHTML =
          '<i class="fa-solid fa-clock-rotate-left me-1"></i> Aún no guardado.';
      }
    });
  });
});