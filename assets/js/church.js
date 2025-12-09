document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  // Referencias a elementos
  const dateInput = $('dateInput');
  const eventInput = $('eventInput');
  const btnTipoIngreso = $('btnTipoIngreso');
  const btnTipoEgreso = $('btnTipoEgreso');
  const categorySelect = $('categorySelect');
  const amountInput = $('amountInput');
  const descriptionInput = $('descriptionInput');
  const btnAddMovement = $('btnAddMovement');

  const movementsBody = $('movementsBody');

  const totalIncomesEl = $('totalIncomes');
  const totalExpensesEl = $('totalExpenses');
  const balanceEl = $('balance');
  const filterStatusEl = $('filterStatus');

  const filterFrom = $('filterFrom');
  const filterTo = $('filterTo');
  const filterText = $('filterText');
  const btnApplyFilters = $('btnApplyFilters');
  const btnClearFilters = $('btnClearFilters');

  const btnSaveCloud = $('btnSaveCloud');
  const btnExportPDF = $('btnExportPDF');
  const btnExportExcel = $('btnExportExcel');
  const btnClearAll = $('btnClearAll');

  // Estado
  let incomeCategories = [];
  let expenseCategories = [];
  let currentType = null; // 'ingreso' o 'egreso'
  let movements = [];
  let autoId = 1;

  const currentFilters = {
    from: null,
    to: null,
    text: ''
  };

  // Helpers numéricos
  const parseNum = (v) => {
    if (v === null || v === undefined) return 0;
    const str = String(v).replace(',', '.');
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  };

  const fix2 = (n) => Math.round(n * 100) / 100;

  // ==========================
  // Inicialización
  // ==========================

  // Fecha por defecto = hoy
  const hoyISO = new Date().toISOString().slice(0, 10);
  if (dateInput) {
    dateInput.value = hoyISO;
  }

  // Foco en evento para flujo cómodo
  eventInput && eventInput.focus();

  // 1) Cargar categorías desde Google Sheets
  try {
    const cats = await loadChurchCategories();
    incomeCategories = cats.incomes || [];
    expenseCategories = cats.expenses || [];
  } catch (e) {
    Swal.fire(
      'Error al cargar categorías',
      'No se pudieron cargar las categorías de ingresos y egresos. Verifique la conexión o consulte al administrador.',
      'error'
    );
  }

  // 2) Cargar datos previos desde JSONBin (si existen)
  try {
    const record = await loadChurchDataFromJSONBin();
    if (record && Array.isArray(record.items)) {
      movements = record.items.map((it, idx) => ({
        id: it.id || idx + 1,
        fecha: it.fecha || hoyISO,
        evento: it.evento || '',
        tipo: it.tipo || 'ingreso',
        categoria: it.categoria || '',
        monto: parseNum(it.monto),
        descripcion: it.descripcion || ''
      }));
      autoId = movements.length ? Math.max(...movements.map((m) => m.id)) + 1 : 1;
    }
  } catch (e) {
    console.error('Error al cargar datos previos:', e);
  }

  // Render inicial
  renderAll();

  // ==========================
  // Manejo de tipo ingreso/egreso
  // ==========================

  function setCurrentType(type) {
    currentType = type; // 'ingreso' | 'egreso'
    populateCategorySelect();
  }

  function populateCategorySelect() {
    const cats =
      currentType === 'ingreso' ? incomeCategories : currentType === 'egreso' ? expenseCategories : [];

    const previousValue = categorySelect.value;
    categorySelect.innerHTML = '<option value="">Seleccione una categoría…</option>';

    (cats || []).forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      categorySelect.appendChild(opt);
    });

    // Si la categoría anterior existe en las nuevas opciones, la mantenemos
    if (cats.includes(previousValue)) {
      categorySelect.value = previousValue;
    } else {
      categorySelect.value = '';
    }
  }

  btnTipoIngreso.addEventListener('change', () => {
    if (btnTipoIngreso.checked) {
      setCurrentType('ingreso');
    }
  });

  btnTipoEgreso.addEventListener('change', () => {
    if (btnTipoEgreso.checked) {
      setCurrentType('egreso');
    }
  });

  // ==========================
  // Agregar movimiento
  // ==========================

  btnAddMovement.addEventListener('click', () => {
    addMovement();
  });

  // Enter en monto -> agregar
  amountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMovement();
    }
  });

  function addMovement() {
    const fecha = (dateInput.value || '').trim();
    const evento = (eventInput.value || '').trim();
    const tipo = currentType;
    const categoria = categorySelect.value;
    const monto = parseNum(amountInput.value);
    const descripcion = (descriptionInput.value || '').trim();

    // Validaciones sencillas pero claras
    if (!fecha) {
      Swal.fire('Fecha requerida', 'Por favor indique la fecha del movimiento.', 'warning');
      return;
    }
    if (!tipo) {
      Swal.fire('Tipo requerido', 'Seleccione si el movimiento es un ingreso o un egreso.', 'warning');
      return;
    }
    if (!categoria) {
      Swal.fire('Categoría requerida', 'Seleccione una categoría para el movimiento.', 'warning');
      return;
    }
    if (!(monto > 0)) {
      Swal.fire('Monto inválido', 'El monto debe ser mayor que 0.', 'warning');
      return;
    }

    // Crear objeto movimiento
    const movement = {
      id: autoId++,
      fecha,
      evento,
      tipo,
      categoria,
      monto: fix2(monto),
      descripcion
    };

    movements.push(movement);

    // Limpiar solo lo necesario
    amountInput.value = '';
    descriptionInput.value = '';
    amountInput.focus();

    renderAll();
  }

  // ==========================
  // Filtros
  // ==========================

  btnApplyFilters.addEventListener('click', () => {
    currentFilters.from = filterFrom.value || null;
    currentFilters.to = filterTo.value || null;
    currentFilters.text = (filterText.value || '').trim().toLowerCase();
    renderAll();
  });

  btnClearFilters.addEventListener('click', () => {
    currentFilters.from = null;
    currentFilters.to = null;
    currentFilters.text = '';
    filterFrom.value = '';
    filterTo.value = '';
    filterText.value = '';
    renderAll();
  });

  function applyFilters(list) {
    const from = currentFilters.from;
    const to = currentFilters.to;
    const text = currentFilters.text;

    return list.filter((m) => {
      if (from && m.fecha < from) return false;
      if (to && m.fecha > to) return false;

      if (text) {
        const haystack = [
          m.evento || '',
          m.descripcion || '',
          m.categoria || '',
          m.tipo || ''
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(text)) return false;
      }

      return true;
    });
  }

  function updateFilterStatus(filteredCount, totalCount) {
    if (!filterStatusEl) return;
    const hasFilters = currentFilters.from || currentFilters.to || currentFilters.text;
    if (!hasFilters) {
      filterStatusEl.textContent = `Mostrando todos los movimientos (${totalCount})`;
    } else {
      filterStatusEl.textContent = `Filtros activos: ${filteredCount} de ${totalCount} movimientos`;
    }
  }

  // ==========================
  // Render de tabla y totales
  // ==========================

  function calculateTotals(list) {
    let ingresos = 0;
    let egresos = 0;

    (list || []).forEach((m) => {
      if (m.tipo === 'ingreso') ingresos += m.monto;
      else if (m.tipo === 'egreso') egresos += m.monto;
    });

    ingresos = fix2(ingresos);
    egresos = fix2(egresos);
    const saldo = fix2(ingresos - egresos);

    return { ingresos, egresos, saldo };
  }

  function updateSummary(listForSummary) {
    const { ingresos, egresos, saldo } = calculateTotals(listForSummary);

    totalIncomesEl.textContent = `$${ingresos.toLocaleString('es-SV', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

    totalExpensesEl.textContent = `$${egresos.toLocaleString('es-SV', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

    balanceEl.textContent = `$${saldo.toLocaleString('es-SV', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

    balanceEl.classList.remove('saldo-positive', 'saldo-negative', 'saldo-neutral');

    if (saldo > 0) {
      balanceEl.classList.add('saldo-positive');
    } else if (saldo < 0) {
      balanceEl.classList.add('saldo-negative');
    } else {
      balanceEl.classList.add('saldo-neutral');
    }
  }

  function renderTable(filteredList) {
    movementsBody.innerHTML = '';

    filteredList.forEach((m, idx) => {
      const tr = document.createElement('tr');

      const badgeClass = m.tipo === 'ingreso' ? 'badge-tipo-ingreso' : 'badge-tipo-egreso';
      const badgeText = m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso';

      tr.innerHTML = `
        <td class="text-center">${idx + 1}</td>
        <td>${m.fecha}</td>
        <td>${escapeHTML(m.evento || '')}</td>
        <td>
          <span class="${badgeClass}">
            ${badgeText}
          </span>
        </td>
        <td>${escapeHTML(m.categoria || '')}</td>
        <td class="text-end">
          $${m.monto.toLocaleString('es-SV', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </td>
        <td>${escapeHTML(m.descripcion || '')}</td>
        <td class="text-center">
          <button
            class="btn btn-outline-danger btn-sm btn-delete-movement"
            data-id="${m.id}"
            title="Eliminar este movimiento"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      `;

      movementsBody.appendChild(tr);
    });
  }

  function updateToolbarButtons() {
    const hasMovements = movements.length > 0;
    btnSaveCloud.disabled = !hasMovements;
    btnExportPDF.disabled = !hasMovements;
    btnExportExcel.disabled = !hasMovements;
    btnClearAll.disabled = !hasMovements;
  }

  function renderAll() {
    const filtered = applyFilters(movements);
    renderTable(filtered);
    updateSummary(filtered);
    updateFilterStatus(filtered.length, movements.length);
    updateToolbarButtons();
  }

  // ==========================
  // Eliminar movimiento
  // ==========================

  movementsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete-movement');
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const movement = movements.find((m) => m.id === id);
    const label = movement
      ? `${movement.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} de $${movement.monto.toFixed(2)}`
      : 'este movimiento';

    Swal.fire({
      title: '¿Eliminar movimiento?',
      text: `Se eliminará ${label}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        movements = movements.filter((m) => m.id !== id);
        renderAll();
      }
    });
  });

  // ==========================
  // Guardar en la nube (JSONBin)
  // ==========================

  btnSaveCloud.addEventListener('click', () => {
    if (!movements.length) return;

    const { ingresos, egresos, saldo } = calculateTotals(movements);
    const nowIso = new Date().toISOString();

    const payload = {
      meta: {
        iglesia: 'Misión Pentecostal de Jesucristo',
        updatedAt: nowIso
      },
      items: movements.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        evento: m.evento,
        tipo: m.tipo,
        categoria: m.categoria,
        monto: m.monto,
        descripcion: m.descripcion
      })),
      totales: {
        ingresos,
        egresos,
        saldo
      }
    };

    saveChurchDataToJSONBin(payload)
      .then(() => {
        Swal.fire('Guardado', 'La información se guardó correctamente en la nube.', 'success');
      })
      .catch((e) => {
        Swal.fire('Error', String(e), 'error');
      });
  });

  // ==========================
  // Exportar PDF
  // ==========================

  btnExportPDF.addEventListener('click', () => {
    if (!movements.length) return;
    exportPDF();
  });

  function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const filtered = applyFilters(movements);
    const { ingresos, egresos, saldo } = calculateTotals(filtered);
    const hoy = new Date().toISOString().slice(0, 10);

    doc.setFontSize(14);
    doc.text('Misión Pentecostal de Jesucristo', 14, 16);
    doc.setFontSize(11);
    doc.text('Control de ingresos y egresos', 14, 23);
    doc.text(`Fecha de generación: ${hoy}`, 14, 30);

    doc.text(
      `Ingresos: $${ingresos.toFixed(2)}   |   Egresos: $${egresos.toFixed(2)}   |   Saldo: $${saldo.toFixed(
        2
      )}`,
      14,
      38
    );

    const body = filtered.map((m, idx) => [
      idx + 1,
      m.fecha,
      m.evento || '',
      m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
      m.categoria || '',
      m.monto.toFixed(2),
      m.descripcion || ''
    ]);

    doc.autoTable({
      startY: 44,
      head: [['#', 'Fecha', 'Evento', 'Tipo', 'Categoría', 'Monto', 'Descripción']],
      body,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240] }
    });

    const filename = `MPJ_movimientos_${hoy}.pdf`;
    doc.save(filename);
  }

  // ==========================
  // Exportar Excel
  // ==========================

  btnExportExcel.addEventListener('click', () => {
    if (!movements.length) return;
    exportExcel();
  });

  function exportExcel() {
    const filtered = applyFilters(movements);
    const hoy = new Date().toISOString().slice(0, 10);

    const data = [
      ['Fecha', 'Evento', 'Tipo', 'Categoría', 'Monto', 'Descripción']
    ];

    filtered.forEach((m) => {
      data.push([
        m.fecha,
        m.evento || '',
        m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        m.categoria || '',
        m.monto,
        m.descripcion || ''
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MPJ_movimientos_${hoy}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ==========================
  // Limpiar todo
  // ==========================

  btnClearAll.addEventListener('click', () => {
    if (!movements.length) return;

    Swal.fire({
      title: '¿Limpiar todos los movimientos?',
      text: 'Se borrarán todos los ingresos y egresos de la lista actual.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar todo',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        movements = [];
        autoId = 1;
        renderAll();

        // Opcional: guardar vacío en JSONBin
        const nowIso = new Date().toISOString();
        const payload = {
          meta: {
            iglesia: 'Misión Pentecostal de Jesucristo',
            updatedAt: nowIso
          },
          items: [],
          totales: {
            ingresos: 0,
            egresos: 0,
            saldo: 0
          }
        };

        saveChurchDataToJSONBin(payload).catch((e) =>
          console.error('Error al guardar vacío en JSONBin:', e)
        );
      }
    });
  });

  // ==========================
  // Helper simple para evitar inyección en HTML
  // ==========================

  function escapeHTML(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
