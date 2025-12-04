// Eventos View - Complete CRUD

let eventosData = [];
let editingEventoId = null;

async function renderEventos() {
  const contentArea = document.getElementById('content-area');

  contentArea.innerHTML = `
    <div class="grid grid-cols-1 gap-6">
      <!-- Form Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title" id="evento-form-title">
            <i class="fas fa-calendar-plus"></i> Crear Evento
          </h2>
          <button class="btn btn-secondary btn-sm hidden" id="btn-cancel-evento-edit">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
        <form id="form-evento">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nombre del Evento *</label>
              <input type="text" name="nombre" id="evento-nombre" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha *</label>
              <input type="date" name="fecha" id="evento-fecha" class="form-input" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select name="tipo" id="evento-tipo" class="form-select">
                <option value="GENERAL">General</option>
                <option value="REUNION">Reunión</option>
                <option value="RIFA">Rifa</option>
                <option value="PAGO">Pago</option>
                <option value="ASAMBLEA">Asamblea</option>
                <option value="SOCIAL">Social</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Estado</label>
              <select name="estado" id="evento-estado" class="form-select">
                <option value="UPCOMING">Próximo</option>
                <option value="ONGOING">En Curso</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea name="descripcion" id="evento-descripcion" class="form-textarea"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Guardar Evento
            </button>
          </div>
        </form>
      </div>

      <!-- List Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <i class="fas fa-calendar-alt"></i> Lista de Eventos
          </h2>
          <div class="header-actions-container">
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
  document.getElementById('form-evento').addEventListener('submit', handleEventoSubmit);
  document.getElementById('btn-cancel-evento-edit').addEventListener('click', resetEventoForm);
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
    container.appendChild(createEmptyState('calendar-alt', 'No hay eventos', 'No se encontraron eventos con los filtros aplicados'));
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
        onClick: (evento) => startEditEvento(evento)
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

function startEditEvento(evento) {
  editingEventoId = evento.id;

  document.getElementById('evento-form-title').innerHTML = '<i class="fas fa-calendar-edit"></i> Editar Evento';
  document.getElementById('evento-nombre').value = evento.nombre || '';
  document.getElementById('evento-fecha').value = formatDateInput(evento.fecha) || '';
  document.getElementById('evento-tipo').value = evento.tipo || 'GENERAL';
  document.getElementById('evento-estado').value = evento.estado || 'UPCOMING';
  document.getElementById('evento-descripcion').value = evento.descripcion || '';

  document.getElementById('btn-cancel-evento-edit').classList.remove('hidden');

  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetEventoForm() {
  editingEventoId = null;
  document.getElementById('form-evento').reset();
  document.getElementById('evento-form-title').innerHTML = '<i class="fas fa-calendar-plus"></i> Crear Evento';
  document.getElementById('btn-cancel-evento-edit').classList.add('hidden');
}

async function handleEventoSubmit(e) {
  e.preventDefault();

  const formData = getFormData(e.target);

  try {
    if (editingEventoId) {
      await apiRequest(`/eventos/${editingEventoId}`, {
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

    resetEventoForm();
    await loadEventos();
  } catch (error) {
    showToast(error.message || 'Error al guardar evento', 'error');
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
