// Préstamos View - Complete CRUD

let prestamosData = [];
let sociosForPrestamos = [];
let editingPrestamoId = null;

async function renderPrestamos() {
  const contentArea = document.getElementById('content-area');

  contentArea.innerHTML = `
    <div class="grid grid-cols-1 gap-6">
      <!-- Form Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title" id="prestamo-form-title">
            <i class="fas fa-hand-holding-usd"></i> Crear Préstamo
          </h2>
          <button class="btn btn-secondary btn-sm hidden" id="btn-cancel-prestamo-edit">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
        <form id="form-prestamo">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Socio *</label>
              <select name="socio_id" id="prestamo-socio" class="form-select" required>
                <option value="">-- Seleccione un socio --</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Monto *</label>
              <input type="number" name="monto" id="prestamo-monto" class="form-input" min="0" step="1000" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tasa de Interés (%)</label>
              <input type="number" name="tasa_interes" id="prestamo-tasa" class="form-input" min="0" max="100" step="0.1" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">Plazo (meses)</label>
              <input type="number" name="plazo_meses" id="prestamo-plazo" class="form-input" min="1" max="60" value="12">
            </div>
          </div>
          <!-- Interest Calculation Display -->
          <div id="interest-display" class="form-row" style="background: var(--primary-50); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; display: none;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Monto Préstamo</div>
                <div id="display-monto" style="font-weight: 600; color: var(--primary-700);">$0</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Interés</div>
                <div id="display-interes" style="font-weight: 600; color: var(--warning-600);">$0</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Total a Pagar</div>
                <div id="display-total" style="font-weight: 700; font-size: 1.125rem; color: var(--success-700);">$0</div>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fecha de Aprobación</label>
              <input type="date" name="fecha_aprobacion" id="prestamo-fecha-aprobacion" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Fecha de Vencimiento</label>
              <input type="date" name="fecha_vencimiento" id="prestamo-fecha-vencimiento" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Estado</label>
              <select name="estado" id="prestamo-estado" class="form-select">
                <option value="PENDIENTE">Pendiente</option>
                <option value="APROBADO">Aprobado</option>
                <option value="PAGADO">Pagado</option>
                <option value="VENCIDO">Vencido</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observaciones</label>
            <textarea name="observaciones" id="prestamo-observaciones" class="form-textarea"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Guardar Préstamo
            </button>
          </div>
        </form>
      </div>

      <!-- List Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <i class="fas fa-list"></i> Lista de Préstamos
          </h2>
          <div class="header-actions-container">
            <select id="filter-estado-prestamos" class="form-select" style="min-width: 150px;">
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="APROBADO">Aprobados</option>
              <option value="PAGADO">Pagados</option>
              <option value="VENCIDO">Vencidos</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>
        </div>
        <div class="table-responsive">
          <div id="prestamos-table-container"></div>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('form-prestamo').addEventListener('submit', handlePrestamoSubmit);
  document.getElementById('btn-cancel-prestamo-edit').addEventListener('click', resetPrestamoForm);
  document.getElementById('filter-estado-prestamos').addEventListener('change', loadPrestamos);

  // Auto-populate fecha_aprobacion with current date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('prestamo-fecha-aprobacion').value = today;

  // Auto-calculate fecha_vencimiento when plazo changes
  document.getElementById('prestamo-plazo').addEventListener('change', (e) => {
    const plazoMeses = parseInt(e.target.value) || 12;
    const today = new Date();
    const vencimiento = new Date(today);
    vencimiento.setMonth(vencimiento.getMonth() + plazoMeses);
    document.getElementById('prestamo-fecha-vencimiento').value = vencimiento.toISOString().split('T')[0];
  });

  // Calculate and display interest in real-time
  function updateInterestDisplay() {
    const monto = parseFloat(document.getElementById('prestamo-monto').value) || 0;
    const tasa = parseFloat(document.getElementById('prestamo-tasa').value) || 0;

    if (monto > 0) {
      const interes = monto * (tasa / 100);
      const total = monto + interes;

      document.getElementById('display-monto').textContent = formatCurrency(monto);
      document.getElementById('display-interes').textContent = formatCurrency(interes);
      document.getElementById('display-total').textContent = formatCurrency(total);
      document.getElementById('interest-display').style.display = 'block';
    } else {
      document.getElementById('interest-display').style.display = 'none';
    }
  }

  document.getElementById('prestamo-monto').addEventListener('input', updateInterestDisplay);
  document.getElementById('prestamo-tasa').addEventListener('input', updateInterestDisplay);

  // Trigger initial calculation
  document.getElementById('prestamo-plazo').dispatchEvent(new Event('change'));

  // Load data
  await loadSociosForSelect();
  await loadPrestamos();
}

async function loadSociosForSelect() {
  try {
    const data = await apiRequest('/socios?status=ACTIVO');
    sociosForPrestamos = data.socios || [];

    const select = document.getElementById('prestamo-socio');
    if (select) {
      select.innerHTML = '<option value="">-- Seleccione un socio --</option>';
      sociosForPrestamos.forEach(socio => {
        const option = document.createElement('option');
        option.value = socio.id;
        option.textContent = `${formatNombre(socio)} (${socio.documento})`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading socios:', error);
  }
}

async function loadPrestamos() {
  const status = document.getElementById('filter-estado-prestamos')?.value || '';

  try {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    const data = await apiRequest(`/prestamos?${params.toString()}`);
    prestamosData = data.prestamos || [];
    renderPrestamosTable();
  } catch (error) {
    showToast('Error al cargar préstamos', 'error');
  }
}

function renderPrestamosTable() {
  const container = document.getElementById('prestamos-table-container');
  if (!container) return;

  if (prestamosData.length === 0) {
    container.innerHTML = '';
    container.appendChild(createEmptyState('hand-holding-usd', 'No hay préstamos', 'No se encontraron préstamos con los filtros aplicados'));
    return;
  }

  const table = createTable(
    [
      {
        key: 'socio',
        label: 'Socio',
        render: (_, prestamo) => `
          <strong>${prestamo.nombre1} ${prestamo.apellido1}</strong><br>
          <small style="color: var(--text-tertiary);">${prestamo.documento}</small>
        `
      },
      {
        key: 'monto',
        label: 'Monto Préstamo',
        render: (value, prestamo) => `
          <div>
            <strong>${formatCurrency(value)}</strong>
            ${prestamo.monto_total ? `<div style="font-size: 0.75rem; color: var(--text-tertiary);">Total: ${formatCurrency(prestamo.monto_total)}</div>` : ''}
          </div>
        `
      },
      {
        key: 'total_pagado',
        label: 'Pagado',
        render: (value) => `<span style="color: var(--success-600);">${formatCurrency(value)}</span>`
      },
      {
        key: 'saldo',
        label: 'Saldo',
        render: (_, prestamo) => {
          const montoTotal = Number(prestamo.monto_total || prestamo.monto);
          const saldo = montoTotal - Number(prestamo.total_pagado || 0);
          const porcentaje = montoTotal > 0 ? ((Number(prestamo.total_pagado || 0) / montoTotal) * 100).toFixed(1) : 0;
          return `
            <div>
              <span style="color: var(--warning-600); font-weight: 600;">${formatCurrency(saldo)}</span>
              <div style="margin-top: 4px; font-size: 0.75rem; color: var(--text-tertiary);">${porcentaje}% pagado</div>
            </div>
          `;
        }
      },
      {
        key: 'plazo_meses',
        label: 'Plazo',
        render: (value) => `${value} meses`
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (value) => {
          const badgeMap = {
            'PENDIENTE': 'badge-warning',
            'APROBADO': 'badge-accent',
            'PAGADO': 'badge-success',
            'VENCIDO': 'badge-danger',
            'CANCELADO': 'badge-danger'
          };
          return `<span class="badge ${badgeMap[value] || 'badge-primary'}">${value}</span>`;
        }
      }
    ],
    prestamosData,
    [
      {
        text: 'Editar',
        icon: 'fas fa-edit',
        className: 'btn-secondary',
        onClick: (prestamo) => startEditPrestamo(prestamo)
      },
      {
        text: 'Pagos',
        icon: 'fas fa-money-bill-wave',
        className: 'btn-accent',
        onClick: (prestamo) => showPagosPrestamo(prestamo)
      },
      {
        text: 'Eliminar',
        icon: 'fas fa-trash',
        className: 'btn-danger',
        onClick: (prestamo) => handleDeletePrestamo(prestamo)
      }
    ]
  );

  container.innerHTML = '';
  container.appendChild(table);
}

function startEditPrestamo(prestamo) {
  editingPrestamoId = prestamo.id;

  document.getElementById('prestamo-form-title').innerHTML = '<i class="fas fa-edit"></i> Editar Préstamo';
  document.getElementById('prestamo-socio').value = prestamo.socio_id || '';
  document.getElementById('prestamo-monto').value = prestamo.monto || '';
  document.getElementById('prestamo-tasa').value = prestamo.tasa_interes || 0;
  document.getElementById('prestamo-plazo').value = prestamo.plazo_meses || 12;
  document.getElementById('prestamo-fecha-aprobacion').value = formatDateInput(prestamo.fecha_aprobacion) || '';
  document.getElementById('prestamo-fecha-vencimiento').value = formatDateInput(prestamo.fecha_vencimiento) || '';
  document.getElementById('prestamo-estado').value = prestamo.estado || 'PENDIENTE';
  document.getElementById('prestamo-observaciones').value = prestamo.observaciones || '';

  document.getElementById('btn-cancel-prestamo-edit').classList.remove('hidden');

  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetPrestamoForm() {
  editingPrestamoId = null;
  document.getElementById('form-prestamo').reset();
  document.getElementById('prestamo-form-title').innerHTML = '<i class="fas fa-hand-holding-usd"></i> Crear Préstamo';
  document.getElementById('btn-cancel-prestamo-edit').classList.add('hidden');

  // Re-populate fecha_aprobacion with current date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('prestamo-fecha-aprobacion').value = today;

  // Trigger fecha_vencimiento calculation
  document.getElementById('prestamo-plazo').dispatchEvent(new Event('change'));
}

async function handlePrestamoSubmit(e) {
  e.preventDefault();

  const formData = getFormData(e.target);

  try {
    if (editingPrestamoId) {
      await apiRequest(`/prestamos/${editingPrestamoId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      showToast('Préstamo actualizado exitosamente', 'success');
    } else {
      await apiRequest('/prestamos', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast('Préstamo creado exitosamente', 'success');
    }

    resetPrestamoForm();
    await loadPrestamos();
  } catch (error) {
    showToast(error.message || 'Error al guardar préstamo', 'error');
  }
}

async function handleDeletePrestamo(prestamo) {
  console.log('🗑️  Attempting to delete prestamo:', prestamo);

  const nombreCompleto = `${prestamo.nombre1 || ''} ${prestamo.apellido1 || ''}`.trim() || 'este préstamo';

  // Use custom modal instead of window.confirm to avoid browser restrictions
  const confirmContent = document.createElement('div');
  confirmContent.innerHTML = `
    <p style="font-size: 1.125rem; margin-bottom: 1rem;">
      ¿Está seguro de eliminar este préstamo de <strong>${nombreCompleto}</strong>?
    </p>
    <p style="color: var(--danger-600); font-size: 0.875rem;">
      <i class="fas fa-exclamation-triangle"></i> Esta acción no se puede deshacer.
    </p>
  `;

  createModal(
    'Confirmar Eliminación',
    confirmContent,
    [
      {
        text: 'Cancelar',
        className: 'btn-secondary',
        onClick: () => {
          console.log('❌ User cancelled deletion');
        }
      },
      {
        text: 'Eliminar',
        className: 'btn-danger',
        onClick: async () => {
          console.log('✅ User confirmed deletion');
          await executeDelete(prestamo);
        }
      }
    ]
  );
}

async function executeDelete(prestamo) {
  try {
    console.log('📤 Sending DELETE request to /prestamos/' + prestamo.id);
    const response = await apiRequest(`/prestamos/${prestamo.id}`, { method: 'DELETE' });
    console.log('✅ Delete response:', response);

    showToast('Préstamo eliminado exitosamente', 'success');

    console.log('🔄 Reloading prestamos list...');
    await loadPrestamos();
    console.log('✅ Prestamos list reloaded');
  } catch (error) {
    console.error('❌ Error al eliminar préstamo:', error);
    showToast(error.message || 'Error al eliminar préstamo', 'error');
  }
}

async function showPagosPrestamo(prestamo) {
  try {
    const data = await apiRequest(`/prestamos/${prestamo.id}/pagos`);
    const pagos = data.pagos || [];

    const content = document.createElement('div');

    // Use monto_total if available, otherwise fall back to monto
    const montoTotal = Number(prestamo.monto_total || prestamo.monto);
    const saldo = montoTotal - Number(prestamo.total_pagado || 0);
    const porcentaje = montoTotal > 0 ? ((Number(prestamo.total_pagado || 0) / montoTotal) * 100).toFixed(1) : 0;

    // Sort payments by date (newest first)
    const sortedPagos = [...pagos].sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago));

    // Calculate running balance for each payment
    let runningBalance = montoTotal;
    const pagosWithBalance = sortedPagos.reverse().map(pago => {
      const pagoAmount = Number(pago.monto_pago);
      const balanceAfter = runningBalance - pagoAmount;
      const result = { ...pago, balanceBefore: runningBalance, balanceAfter };
      runningBalance = balanceAfter;
      return result;
    }).reverse();

    content.innerHTML = `
      <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--neutral-50); border-radius: var(--radius-lg);">
        <div style="display: grid; grid-template-columns: repeat(${prestamo.monto_total ? '4' : '3'}, 1fr); gap: 1rem; text-align: center;">
          ${prestamo.monto_total ? `
          <div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Monto Préstamo</div>
            <div style="font-weight: 600; font-size: 1rem;">${formatCurrency(prestamo.monto)}</div>
          </div>
          ` : ''}
          <div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">${prestamo.monto_total ? 'Total con Interés' : 'Monto Total'}</div>
            <div style="font-weight: 700; font-size: 1.25rem;">${formatCurrency(montoTotal)}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Total Pagado</div>
            <div style="font-weight: 700; font-size: 1.25rem; color: var(--success-600);">${formatCurrency(prestamo.total_pagado)}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Saldo Pendiente</div>
            <div style="font-weight: 700; font-size: 1.25rem; color: var(--warning-600);">${formatCurrency(saldo)}</div>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <div style="height: 8px; background: var(--neutral-200); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; background: linear-gradient(90deg, var(--success-500), var(--success-600)); width: ${porcentaje}%; transition: width 0.3s ease;"></div>
          </div>
          <div style="text-align: center; margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
            ${porcentaje}% completado
          </div>
        </div>
      </div>

      <!-- Payment Registration Form -->
      <div id="abono-form-container" style="margin-bottom: 1.5rem; padding: 1rem; background: var(--primary-50); border-radius: var(--radius-lg); border: 2px dashed var(--primary-300);">
        <h3 style="margin-bottom: 1rem; color: var(--primary-700);"><i class="fas fa-plus-circle"></i> Registrar Abono</h3>
        <form id="form-abono" style="display: grid; gap: 1rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Monto del Abono *</label>
              <input type="number" id="abono-monto" class="form-input" min="1" step="0.01" required placeholder="Ej: 50000">
            </div>
            <div class="form-group">
              <label class="form-label">Fecha de Pago</label>
              <input type="date" id="abono-fecha" class="form-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Forma de Pago</label>
            <select id="abono-forma" class="form-select">
              <option value="">-- Seleccione --</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Bancolombia</option>
              <option value="CHEQUE">Nequi</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Observaciones</label>
            <textarea id="abono-observaciones" class="form-textarea" rows="2" placeholder="Notas adicionales..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">
            <i class="fas fa-save"></i> Guardar Abono
          </button>
        </form>
      </div>
      
      <h3 style="margin-bottom: 1rem;">Historial de Pagos</h3>
      <div id="pagos-list" style="max-height: 300px; overflow-y: auto;">
        ${pagosWithBalance.length > 0 ? pagosWithBalance.map(pago => `
          <div style="padding: 1rem; border-bottom: 1px solid var(--border-light);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--success-600); font-size: 1.125rem;">${formatCurrency(pago.monto_pago)}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                  ${formatDateShort(pago.fecha_pago)} ${pago.forma_pago ? `• ${pago.forma_pago}` : ''}
                </div>
                ${pago.observaciones ? `<div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">${pago.observaciones}</div>` : ''}
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.75rem; color: var(--text-tertiary);">Saldo después:</div>
                <div style="font-weight: 600; color: var(--warning-600);">${formatCurrency(pago.balanceAfter)}</div>
              </div>
            </div>
          </div>
        `).join('') : '<div style="text-align: center; padding: 2rem; color: var(--text-tertiary);">No hay pagos registrados</div>'}
      </div>
    `;

    const modal = createModal(
      `Pagos del Préstamo - ${prestamo.nombre1} ${prestamo.apellido1}`,
      content,
      [{ text: 'Cerrar', className: 'btn-secondary' }]
    );

    // Add event listener for abono form
    const abonoForm = content.querySelector('#form-abono');
    if (abonoForm) {
      abonoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAbonoSubmit(prestamo.id, modal);
      });
    }
  } catch (error) {
    showToast('Error al cargar pagos', 'error');
  }
}

async function handleAbonoSubmit(prestamoId, modal) {
  const monto = document.getElementById('abono-monto').value;
  const fecha = document.getElementById('abono-fecha').value;
  const forma = document.getElementById('abono-forma').value;
  const observaciones = document.getElementById('abono-observaciones').value;

  if (!monto || monto <= 0) {
    showToast('Por favor ingrese un monto válido', 'error');
    return;
  }

  try {
    await apiRequest(`/prestamos/${prestamoId}/pagos`, {
      method: 'POST',
      body: JSON.stringify({
        monto_pago: parseFloat(monto),
        fecha_pago: fecha,
        forma_pago: forma || null,
        observaciones: observaciones || null
      })
    });

    showToast('Abono registrado exitosamente', 'success');

    // Close modal and reload prestamos
    if (modal && modal.remove) {
      modal.remove();
    }
    await loadPrestamos();
  } catch (error) {
    showToast(error.message || 'Error al registrar abono', 'error');
  }
}
