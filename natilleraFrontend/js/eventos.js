// Eventos View - Complete CRUD with Modal
let eventosData = [];

async function renderEventos() {
  const contentArea = document.getElementById('content-area');

  contentArea.innerHTML = `
    <div class="grid grid-cols-1 gap-6">
      <!-- List Card -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between w-full" style="width: 100%;">
            <h2 class="card-title">
              <i class="fas fa-calendar-alt"></i> Lista de Eventos
            </h2>
            <button class="btn btn-primary" id="btn-create-evento">
              <i class="fas fa-calendar-plus"></i> Crear Evento
            </button>
          </div>
          
          <div class="header-actions-container mt-4" style="margin-top: 1rem;">
            <select id="filter-tipo-eventos" class="form-select" style="min-width: 150px;">
              <option value="">Todos los tipos</option>
              <option value="REUNION">Reunión</option>
              <option value="RIFA">Rifa</option>
              <option value="PAGO">Pago</option>
              <option value="ASAMBLEA">Asamblea</option>
              <option value="SOCIAL">Social</option>
            </select>
            <select id="filter-estado-eventos" class="form-select" style="min-width: 150px;">
              <option value="">Todos los estados</option>
              <option value="UPCOMING">Próximos</option>
              <option value="ONGOING">En Curso</option>
              <option value="COMPLETED">Completados</option>
              <option value="CANCELLED">Cancelados</option>
            </select>
          </div>
        </div>
        <div class="table-responsive">
          <div id="eventos-table-container"></div>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('btn-create-evento').addEventListener('click', () => openEventoModal());
  document.getElementById('filter-tipo-eventos').addEventListener('change', loadEventos);
  document.getElementById('filter-estado-eventos').addEventListener('change', loadEventos);

  // Load data
  await loadEventos();
}

async function loadEventos() {
  const tipo = document.getElementById('filter-tipo-eventos')?.value || '';
  const status = document.getElementById('filter-estado-eventos')?.value || '';

  try {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (status) params.set('status', status);

    const data = await apiRequest(`/eventos?${params.toString()}`);
    eventosData = data.eventos || [];
    renderEventosTable();
  } catch (error) {
    showToast('Error al cargar eventos', 'error');
  }
}

function renderEventosTable() {
  const container = document.getElementById('eventos-table-container');
  if (!container) return;

  if (eventosData.length === 0) {
    container.innerHTML = '';
    container.appendChild(createEmptyState('calendar-alt', 'No hay eventos', 'No se encontraron eventos con los filtros aplicados', {
      text: 'Crear Nuevo Evento',
      onClick: () => openEventoModal()
    }));
    return;
  }

  const table = createTable(
    [
      { key: 'nombre', label: 'Nombre' },
      {
        key: 'fecha',
        label: 'Fecha',
        render: (value) => formatDateShort(value)
      },
      {
        key: 'tipo',
        label: 'Tipo',
        render: (value) => `<span class="badge badge-primary">${value}</span>`
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (value) => {
          const badgeMap = {
            'UPCOMING': 'badge-accent',
            'ONGOING': 'badge-warning',
            'COMPLETED': 'badge-success',
            'CANCELLED': 'badge-danger'
          };
          return `<span class="badge ${badgeMap[value] || 'badge-primary'}">${value}</span>`;
        }
      },
      {
        key: 'descripcion',
        label: 'Descripción',
        render: (value) => value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '-'
      }
    ],
    eventosData,
    [
      {
        text: 'Editar',
        icon: 'fas fa-edit',
        className: 'btn-secondary',
        onClick: (evento) => openEventoModal(evento)
      },
      {
        text: 'Eliminar',
        icon: 'fas fa-trash',
        className: 'btn-danger',
        onClick: (evento) => handleDeleteEvento(evento)
      }
    ]
  );

  container.innerHTML = '';
  container.appendChild(table);
}

function openEventoModal(evento = null) {
  const isEdit = !!evento;
  const title = isEdit ? 'Editar Evento' : 'Crear Nuevo Evento';

  const content = document.createElement('div');
  content.innerHTML = `
    <form id="form-evento-modal">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nombre del Evento *</label>
          <input type="text" name="nombre" id="evento-nombre" class="form-input" required value="${evento?.nombre || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha *</label>
          <input type="date" name="fecha" id="evento-fecha" class="form-input" required value="${formatDateInput(evento?.fecha) || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select name="tipo" id="evento-tipo" class="form-select">
            <option value="GENERAL" ${evento?.tipo === 'GENERAL' ? 'selected' : ''}>General</option>
            <option value="REUNION" ${evento?.tipo === 'REUNION' ? 'selected' : ''}>Reunión</option>
            <option value="RIFA" ${evento?.tipo === 'RIFA' ? 'selected' : ''}>Rifa</option>
            <option value="PAGO" ${evento?.tipo === 'PAGO' ? 'selected' : ''}>Pago</option>
            <option value="ASAMBLEA" ${evento?.tipo === 'ASAMBLEA' ? 'selected' : ''}>Asamblea</option>
            <option value="SOCIAL" ${evento?.tipo === 'SOCIAL' ? 'selected' : ''}>Social</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select name="estado" id="evento-estado" class="form-select">
            <option value="UPCOMING" ${evento?.estado === 'UPCOMING' ? 'selected' : ''}>Próximo</option>
            <option value="ONGOING" ${evento?.estado === 'ONGOING' ? 'selected' : ''}>En Curso</option>
            <option value="COMPLETED" ${evento?.estado === 'COMPLETED' ? 'selected' : ''}>Completado</option>
            <option value="CANCELLED" ${evento?.estado === 'CANCELLED' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <textarea name="descripcion" id="evento-descripcion" class="form-textarea" rows="3">${evento?.descripcion || ''}</textarea>
      </div>
      <div class="form-actions" style="margin-top: 1.5rem;">
        <button type="submit" class="btn btn-primary" style="width: 100%;">
          <i class="fas fa-save"></i> ${isEdit ? 'Actualizar' : 'Guardar'} Evento
        </button>
      </div>
    </form>
  `;

  const modal = createModal(title, content);

  const form = content.querySelector('#form-evento-modal');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const success = await handleEventoSubmit(e, evento?.id);
    if (success) {
      modal.close();
    }
  });
}

async function handleEventoSubmit(e, editingId = null) {
  const formData = getFormData(e.target);

  try {
    if (editingId) {
      await apiRequest(`/eventos/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      showToast('Evento actualizado exitosamente', 'success');
    } else {
      await apiRequest('/eventos', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast('Evento creado exitosamente', 'success');
    }

    await loadEventos();
    return true;
  } catch (error) {
    showToast(error.message || 'Error al guardar evento', 'error');
    return false;
  }
}

async function handleDeleteEvento(evento) {
  if (!window.confirm(`¿Está seguro de eliminar el evento "${evento.nombre}"?`)) return;

  try {
    await apiRequest(`/eventos/${evento.id}`, { method: 'DELETE' });
    showToast('Evento eliminado exitosamente', 'success');
    await loadEventos();
  } catch (error) {
    showToast('Error al eliminar evento', 'error');
  }
}
