// Socios View - Enhanced CRUD

let sociosData = [];
let editingSocioId = null;

async function renderSocios() {
  const contentArea = document.getElementById('content-area');

  contentArea.innerHTML = `
    <div class="grid grid-cols-1 gap-6">
      <!-- Form Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title" id="socio-form-title">
            <i class="fas fa-user-plus"></i> Crear Socio
          </h2>
          <button class="btn btn-secondary btn-sm hidden" id="btn-cancel-socio-edit">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
        <form id="form-socio">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Documento *</label>
              <input type="text" name="documento" id="socio-documento" class="form-input" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Primer Nombre *</label>
              <input type="text" name="nombre1" id="socio-nombre1" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Segundo Nombre</label>
              <input type="text" name="nombre2" id="socio-nombre2" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Primer Apellido *</label>
              <input type="text" name="apellido1" id="socio-apellido1" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Segundo Apellido</label>
              <input type="text" name="apellido2" id="socio-apellido2" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Correo</label>
              <input type="email" name="correo" id="socio-correo" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input type="tel" name="telefono" id="socio-telefono" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Foto URL</label>
              <input type="text" name="foto_url" id="socio-foto-url" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Firma URL</label>
              <input type="text" name="firma_url" id="socio-firma-url" class="form-input">
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-danger hidden" id="btn-toggle-estado-socio">
              <i class="fas fa-ban"></i> Inhabilitar
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Guardar Socio
            </button>
          </div>
        </form>
      </div>

      <!-- List Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <i class="fas fa-users"></i> Lista de Socios
          </h2>
          <div class="header-actions-container">
            <select id="filter-status-socios" class="form-select" style="min-width: 150px;">
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INHABILITADO">Inhabilitados</option>
            </select>
            <div class="search-input" style="min-width: 250px;">
              <i class="fas fa-search"></i>
              <input type="text" id="search-socios" class="form-input" placeholder="Buscar socios...">
            </div>
          </div>
        </div>
        <div class="table-responsive">
          <div id="socios-table-container"></div>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('form-socio').addEventListener('submit', handleSocioSubmit);
  document.getElementById('btn-cancel-socio-edit').addEventListener('click', resetSocioForm);
  document.getElementById('btn-toggle-estado-socio').addEventListener('click', handleToggleEstadoSocio);
  document.getElementById('search-socios').addEventListener('input', debounce(loadSocios, 350));
  document.getElementById('filter-status-socios').addEventListener('change', loadSocios);

  // Load data
  await loadSocios();
}

async function loadSocios() {
  const search = document.getElementById('search-socios')?.value || '';
  const status = document.getElementById('filter-status-socios')?.value || '';

  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    const data = await apiRequest(`/socios?${params.toString()}`);
    sociosData = data.socios || [];
    renderSociosTable();
  } catch (error) {
    showToast('Error al cargar socios', 'error');
  }
}

function renderSociosTable() {
  const container = document.getElementById('socios-table-container');
  if (!container) return;

  if (sociosData.length === 0) {
    container.innerHTML = '';
    container.appendChild(createEmptyState('users', 'No hay socios', 'No se encontraron socios con los filtros aplicados'));
    return;
  }

  const table = createTable(
    [
      { key: 'documento', label: 'Documento' },
      {
        key: 'nombre',
        label: 'Nombre Completo',
        render: (_, socio) => formatNombre(socio)
      },
      {
        key: 'contacto',
        label: 'Contacto',
        render: (_, socio) => `
          ${socio.correo || '-'}<br>
          <small style="color: var(--text-tertiary);">${socio.telefono || '-'}</small>
        `
      },
      {
        key: 'total_ahorrado',
        label: 'Total Ahorrado',
        render: (value) => `<strong style="color: var(--success-600);">${formatCurrency(value)}</strong>`
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (value) => {
          const badgeClass = value === 'ACTIVO' ? 'badge-success' : 'badge-danger';
          return `<span class="badge ${badgeClass}">${value}</span>`;
        }
      }
    ],
    sociosData,
    [
      {
        text: 'Editar',
        icon: 'fas fa-edit',
        className: 'btn-secondary',
        onClick: (socio) => startEditSocio(socio)
      },
      {
        text: 'Pagos',
        icon: 'fas fa-money-bill-wave',
        className: 'btn-accent',
        onClick: (socio) => showPagosModal(socio)
      }
    ]
  );

  container.innerHTML = '';
  container.appendChild(table);
}

function startEditSocio(socio) {
  editingSocioId = socio.id;

  document.getElementById('socio-form-title').innerHTML = '<i class="fas fa-user-edit"></i> Editar Socio';
  document.getElementById('socio-documento').value = socio.documento || '';
  document.getElementById('socio-nombre1').value = socio.nombre1 || '';
  document.getElementById('socio-nombre2').value = socio.nombre2 || '';
  document.getElementById('socio-apellido1').value = socio.apellido1 || '';
  document.getElementById('socio-apellido2').value = socio.apellido2 || '';
  document.getElementById('socio-correo').value = socio.correo || '';
  document.getElementById('socio-telefono').value = socio.telefono || '';
  document.getElementById('socio-foto-url').value = socio.foto_url || '';
  document.getElementById('socio-firma-url').value = socio.firma_url || '';

  document.getElementById('btn-cancel-socio-edit').classList.remove('hidden');
  const btnToggle = document.getElementById('btn-toggle-estado-socio');
  btnToggle.classList.remove('hidden');
  btnToggle.textContent = socio.estado === 'ACTIVO' ? 'Inhabilitar' : 'Habilitar';
  btnToggle.className = socio.estado === 'ACTIVO' ? 'btn btn-danger' : 'btn btn-success';

  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetSocioForm() {
  editingSocioId = null;
  document.getElementById('form-socio').reset();
  document.getElementById('socio-form-title').innerHTML = '<i class="fas fa-user-plus"></i> Crear Socio';
  document.getElementById('btn-cancel-socio-edit').classList.add('hidden');
  document.getElementById('btn-toggle-estado-socio').classList.add('hidden');
}

async function handleSocioSubmit(e) {
  e.preventDefault();

  const formData = getFormData(e.target);

  try {
    if (editingSocioId) {
      await apiRequest(`/socios/${editingSocioId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      showToast('Socio actualizado exitosamente', 'success');
    } else {
      await apiRequest('/socios', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast('Socio creado exitosamente', 'success');
    }

    resetSocioForm();
    await loadSocios();
  } catch (error) {
    showToast(error.message || 'Error al guardar socio', 'error');
  }
}

async function handleToggleEstadoSocio() {
  if (!editingSocioId) return;

  const socio = sociosData.find(s => s.id == editingSocioId);
  const nuevoEstado = socio.estado === 'ACTIVO' ? 'INHABILITADO' : 'ACTIVO';
  const mensaje = nuevoEstado === 'INHABILITADO' ? '¿Inhabilitar este socio?' : '¿Reactivar este socio?';

  if (!window.confirm(mensaje)) return;

  try {
    await apiRequest(`/socios/${editingSocioId}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado: nuevoEstado })
    });

    showToast('Estado actualizado exitosamente', 'success');
    resetSocioForm();
    await loadSocios();
  } catch (error) {
    showToast('Error al cambiar estado', 'error');
  }
}

async function showPagosModal(socio) {
  try {
    const data = await apiRequest(`/socios/${socio.id}/pagos`);
    const pagos = data.pagos || [];

    const content = document.createElement('div');
    content.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <strong>${formatNombre(socio)}</strong><br>
        <small style="color: var(--text-secondary);">Documento: ${socio.documento}</small>
      </div>
      <div style="max-height: 400px; overflow-y: auto;">
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem;" id="pagos-grid">
          ${pagos.map(p => {
      const badgeClass = p.estado === 'PAGADO' ? 'badge-success' : p.estado === 'PENDIENTE' ? 'badge-warning' : 'badge-danger';
      return `
              <div class="pago-week-card" data-pago-id="${p.id}" data-semana="${p.semana}" style="padding: 0.75rem; background: var(--neutral-50); border-radius: var(--radius-md); text-align: center; cursor: pointer; transition: all 0.2s;">
                <div style="font-weight: 600; margin-bottom: 0.25rem;">Semana ${p.semana}</div>
                <span class="badge ${badgeClass}">${p.estado}</span>
                ${p.valor ? `<div style="font-size: 0.875rem; margin-top: 0.25rem;">${formatCurrency(p.valor)}</div>` : ''}
                ${p.nombre_pagador ? `<div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">${p.nombre_pagador}</div>` : ''}
              </div>
            `;
    }).join('')}
        </div>
      </div>
    `;

    createModal(
      `Pagos - ${formatNombre(socio)}`,
      content,
      [{ text: 'Cerrar', className: 'btn-secondary' }]
    );

    // Add click handlers to each week card
    document.querySelectorAll('.pago-week-card').forEach(card => {
      card.addEventListener('mouseenter', (e) => {
        e.currentTarget.style.background = 'var(--neutral-100)';
        e.currentTarget.style.transform = 'scale(1.05)';
      });
      card.addEventListener('mouseleave', (e) => {
        e.currentTarget.style.background = 'var(--neutral-50)';
        e.currentTarget.style.transform = 'scale(1)';
      });
      card.addEventListener('click', (e) => {
        const pagoId = e.currentTarget.dataset.pagoId;
        const semana = e.currentTarget.dataset.semana;
        const pago = pagos.find(p => p.id == pagoId);
        openPagoRegistrationModal(socio, pago, semana);
      });
    });
  } catch (error) {
    showToast('Error al cargar pagos', 'error');
  }
}

async function openPagoRegistrationModal(socio, pago, semana) {
  const isPaid = pago.estado === 'PAGADO' && pago.valor && pago.valor > 0;
  const formContent = document.createElement('div');

  formContent.innerHTML = `
    <form id="form-registro-pago">
      <div style="margin-bottom: 1rem; padding: 1rem; background: var(--neutral-50); border-radius: var(--radius-lg);">
        <strong>${formatNombre(socio)}</strong> - Semana ${semana}
      </div>
      
      ${isPaid ? `
      <div style="margin-bottom: 1rem; padding: 1rem; background: var(--success-50); border: 1px solid var(--success-300); border-radius: var(--radius-md);">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--success-700); font-weight: 600;">
          <i class="fas fa-check-circle"></i>
          <span>Pago Registrado</span>
        </div>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: var(--success-600);">
          Este pago ya ha sido registrado. El valor no puede ser modificado.
        </p>
      </div>
      ` : ''}
      
      <div class="form-group">
        <label class="form-label">Fecha de Pago *</label>
        <input type="date" id="pago-fecha" class="form-input" value="${pago.fecha_pago ? formatDateInput(pago.fecha_pago) : formatDateInput(new Date())}" ${isPaid ? 'readonly' : ''} required>
      </div>
      
      <div class="form-group">
        <label class="form-label">Forma de Pago</label>
        <select id="pago-forma" class="form-select" ${isPaid ? 'disabled' : ''}>
          <option value="">-- Seleccione --</option>
          <option value="EFECTIVO" ${pago.forma_pago === 'EFECTIVO' ? 'selected' : ''}>Efectivo</option>
          <option value="NEQUI" ${pago.forma_pago === 'NEQUI' ? 'selected' : ''}>Nequi</option>
          <option value="BANCOLOMBIA" ${pago.forma_pago === 'BANCOLOMBIA' ? 'selected' : ''}>Bancolombia</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Valor Aportado *</label>
        <input type="number" id="pago-valor" class="form-input" min="0" step="1000" value="${pago.valor || ''}" ${isPaid ? 'readonly' : ''} required>
        ${isPaid ? '<small style="color: var(--text-tertiary); font-size: 0.75rem;"><i class="fas fa-lock"></i> El valor no puede modificarse una vez registrado</small>' : ''}
      </div>
      
      <div class="form-group">
        <label class="form-label">Nombre Persona que Paga *</label>
        <input type="text" id="pago-nombre-pagador" class="form-input" value="${pago.nombre_pagador || formatNombre(socio)}" ${isPaid ? 'readonly' : ''} required>
      </div>
      
      <div class="form-group">
        <label class="form-label">Nombre Persona que Recibe *</label>
        <input type="text" id="pago-firma-recibe" class="form-input" value="${pago.firma_recibe || ''}" ${isPaid ? 'readonly' : ''} required>
      </div>
      
      <div class="form-group">
        <label class="form-label">Estado</label>
        <select id="pago-estado" class="form-select" ${isPaid ? 'disabled' : ''}>
          <option value="PENDIENTE" ${pago.estado === 'PENDIENTE' ? 'selected' : ''}>Pendiente</option>
          <option value="PAGADO" ${pago.estado === 'PAGADO' ? 'selected' : ''}>Pagado</option>
          <option value="ANULADO" ${pago.estado === 'ANULADO' ? 'selected' : ''}>Anulado</option>
        </select>
      </div>
    </form>
  `;

  const buttons = isPaid ? [
    { text: 'Cerrar', className: 'btn-secondary' }
  ] : [
    { text: 'Cancelar', className: 'btn-secondary' },
    {
      text: 'Guardar Pago',
      className: 'btn-primary',
      closeOnClick: false,
      onClick: async () => {
        const fecha = document.getElementById('pago-fecha').value;
        const forma = document.getElementById('pago-forma').value;
        const valor = document.getElementById('pago-valor').value;
        const nombrePagador = document.getElementById('pago-nombre-pagador').value;
        const firmaRecibe = document.getElementById('pago-firma-recibe').value;
        const estado = document.getElementById('pago-estado').value;

        if (!fecha || !valor || !nombrePagador || !firmaRecibe) {
          showToast('Por favor complete todos los campos requeridos', 'warning');
          return;
        }

        // Confirmation message
        const confirmContent = document.createElement('div');
        confirmContent.innerHTML = `
          <p style="font-size: 1rem; margin-bottom: 1rem;">
            ¿Está seguro de registrar este pago?
          </p>
          <div style="background: var(--neutral-50); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
            <div style="display: grid; gap: 0.5rem;">
              <div><strong>Socio:</strong> ${formatNombre(socio)}</div>
              <div><strong>Semana:</strong> ${semana}</div>
              <div><strong>Valor:</strong> ${formatCurrency(parseFloat(valor))}</div>
              <div><strong>Estado:</strong> ${estado}</div>
            </div>
          </div>
          ${estado === 'PAGADO' ? `
          <div style="background: var(--warning-50); border: 1px solid var(--warning-300); padding: 0.75rem; border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--warning-700);">
              <i class="fas fa-exclamation-triangle"></i>
              <span style="font-size: 0.875rem; font-weight: 600;">Una vez marcado como PAGADO, el valor no podrá ser modificado.</span>
            </div>
          </div>
          ` : ''}
        `;

        createModal(
          'Confirmar Registro de Pago',
          confirmContent,
          [
            { text: 'Cancelar', className: 'btn-secondary' },
            {
              text: 'Confirmar',
              className: 'btn-primary',
              onClick: async () => {
                try {
                  await apiRequest(`/pagos/${pago.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                      fecha_pago: fecha,
                      forma_pago: forma,
                      valor: parseFloat(valor),
                      nombre_pagador: nombrePagador,
                      firma_recibe: firmaRecibe,
                      estado: estado,
                      usuario: 'Admin'
                    })
                  });

                  showToast('Pago registrado exitosamente', 'success');
                  closeAllModals();
                  // Reopen the payments modal to show updated data
                  setTimeout(() => showPagosModal(socio), 300);
                } catch (error) {
                  showToast(error.message || 'Error al guardar pago', 'error');
                }
              }
            }
          ]
        );
      }
    }
  ];

  const modal = createModal(
    isPaid ? `Ver Pago - Semana ${semana}` : `Registrar Pago - Semana ${semana}`,
    formContent,
    buttons
  );
}


