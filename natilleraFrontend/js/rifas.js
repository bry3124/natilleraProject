
// Rifas View

let rifasData = [];
let currentRifaId = null;

async function renderRifas() {
    const contentArea = document.getElementById('content-area');

    contentArea.innerHTML = `
    <div class="grid grid-cols-1 gap-6">
      <!-- List Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <i class="fas fa-ticket-alt"></i> Gestión de Rifas
          </h2>
          <button class="btn btn-primary" id="btn-create-rifa">
            <i class="fas fa-plus"></i> Nueva Rifa
          </button>
          <button class="btn btn-secondary ml-2" id="btn-search-tickets">
            <i class="fas fa-search"></i> Consultar
          </button>
        </div>
        
        <div id="rifas-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Rifas will be loaded here -->
        </div>
      </div>
      
      <!-- Selected Rifa Detail (Hidden by default) -->
      <div id="rifa-detail-container" class="card hidden">
         <div class="card-header">
            <div class="flex items-center gap-3">
                <button class="btn btn-sm btn-secondary" id="btn-back-rifas">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2 class="card-title" id="rifa-detail-title">Detalle de Rifa</h2>
            </div>
            <div class="card-subtitle" id="rifa-detail-info"></div>
         </div>
         
         <div class="rifa-grid-container mt-4">
             <div class="flex justify-end mb-2 gap-2">
                <button class="btn btn-sm btn-accent" id="btn-distribute-tickets">
                    <i class="fas fa-random"></i> Asignar Números
                </button>
                 <button class="btn btn-sm btn-warning" id="btn-mark-winner">
                    <i class="fas fa-trophy"></i> Registrar Ganador
                </button>
             </div>
            <div class="rifa-tickets-grid" id="rifa-tickets-grid"></div>
         </div>
         
         <div class="mt-4 flex gap-4 text-sm">
            <div class="flex items-center gap-2">
                <span class="w-4 h-4 bg-white border border-gray-300 rounded block"></span> Disponible
            </div>
             <div class="flex items-center gap-2">
                <span class="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded block"></span> Reservado
            </div>
             <div class="flex items-center gap-2">
                <span class="w-4 h-4 bg-green-100 border border-green-300 rounded block"></span> Pagado
            </div>
         </div>
      </div>
    </div>
  `;

    document.getElementById('btn-create-rifa').addEventListener('click', openCreateRifaModal);
    document.getElementById('btn-back-rifas').addEventListener('click', showRifasList);

    await loadRifas();
}

async function loadRifas() {
    try {
        const data = await apiRequest('/rifas');
        rifasData = data.rifas || [];
        renderRifasList();
    } catch (error) {
        showToast('Error al cargar rifas', 'error');
    }
}

function renderRifasList() {
    const container = document.getElementById('rifas-list-container');
    if (!container) return;

    container.innerHTML = '';

    if (rifasData.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fas fa-ticket-alt text-4xl mb-3 opacity-30"></i>
                <p>No hay rifas creadas aún.</p>
            </div>
        `;
        return;
    }

    rifasData.forEach(rifa => {
        const card = document.createElement('div');
        card.className = 'card border border-gray-100 hover:shadow-lg transition-all cursor-pointer';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-lg text-primary-700">${rifa.nombre}</h3>
                <span class="badge badge-primary">${formatDate(rifa.fecha_evento)}</span>
            </div>
            <p class="text-sm text-gray-600 mb-4 line-clamp-2">${rifa.descripcion || 'Sin descripción'}</p>
            <div class="flex justify-between items-center mt-auto">
                <span class="text-xs font-semibold text-gray-500">Tickets: 100</span>
                <button class="btn btn-sm btn-accent">Ver Tickets</button>
            </div>
        `;
        card.addEventListener('click', () => openRifaDetail(rifa));
        container.appendChild(card);
    });
}

function showRifasList() {
    document.getElementById('rifas-list-container').classList.remove('hidden');
    document.getElementById('rifas-list-container').parentElement.querySelector('.card-header').classList.remove('hidden');
    document.getElementById('rifa-detail-container').classList.add('hidden');
    currentRifaId = null;
}

async function openRifaDetail(rifa) {
    currentRifaId = rifa.id;
    document.getElementById('rifas-list-container').classList.add('hidden');
    document.getElementById('rifas-list-container').parentElement.querySelector('.card-header').classList.add('hidden');

    const detailContainer = document.getElementById('rifa-detail-container');
    detailContainer.classList.remove('hidden');

    document.getElementById('rifa-detail-title').textContent = rifa.nombre;
    document.getElementById('rifa-detail-info').textContent = `Sorteo: ${formatDate(rifa.fecha_evento)}`;

    document.getElementById('btn-distribute-tickets').addEventListener('click', handleDistributeTickets);
    document.getElementById('btn-mark-winner').addEventListener('click', () => openWinnerModal(rifa));

    await loadRifaTickets(rifa.id);
}

async function loadRifaTickets(rifaId) {
    const grid = document.getElementById('rifa-tickets-grid');
    grid.innerHTML = '<div class="col-span-full text-center py-4"><div class="loading-spinner mx-auto"></div></div>';

    try {
        const data = await apiRequest(`/rifas/${rifaId}/tickets`);
        const tickets = data.tickets || [];
        // Find current rifa to get winner
        const currentRifa = rifasData.find(r => r.id == rifaId);
        renderTicketsGrid(tickets, currentRifa ? currentRifa.numero_ganador : null);
    } catch (error) {
        grid.innerHTML = '<p class="text-red-500 text-center">Error cargando tickets</p>';
        showToast('Error cargando tickets', 'error');
    }
}

function renderTicketsGrid(tickets, winningNumber = null) {
    const grid = document.getElementById('rifa-tickets-grid');
    grid.innerHTML = '';

    // Grid CSS is expected to be defined in CSS or inline style
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(60px, 1fr))';
    grid.style.gap = '0.5rem';

    // Sort tickets 00-99 just in case
    tickets.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));

    tickets.forEach(ticket => {
        const el = document.createElement('div');
        // Colors based on status
        let bgClass = 'bg-white hover:bg-gray-50 border-gray-200';
        if (ticket.estado === 'RESERVADO') bgClass = 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700';
        if (ticket.estado === 'PAGADO') bgClass = 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700';

        let winnerStyle = '';
        let winnerIcon = '';

        if (winningNumber && ticket.numero === winningNumber) {
            bgClass = 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-md transform scale-105';
            winnerStyle = 'box-shadow: 0 0 15px rgba(251, 191, 36, 0.5); z-index: 10;';
            winnerIcon = '<div class="absolute -top-3 -right-2 text-2xl text-yellow-600 drop-shadow-sm">👑</div>';
        }

        el.className = `
            border rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all relative
            ${bgClass}
        `;
        el.style.cssText = winnerStyle;

        el.innerHTML = `
            ${winnerIcon}
            <span class="font-bold text-lg">${ticket.numero}</span>
            <span class="text-[10px] truncate max-w-full">${ticket.nombre_cliente || 'Libre'}</span>
        `;
        el.onclick = () => openTicketModal(ticket);
        grid.appendChild(el);
    });
}

function openCreateRifaModal() {
    const content = `
        <form id="form-create-rifa">
            <div class="form-group">
                <label class="form-label">Nombre de la Rifa *</label>
                <input type="text" name="nombre" class="form-input" required placeholder="Ej: Rifa Navideña">
            </div>
            <div class="form-group">
                <label class="form-label">Fecha del Sorteo *</label>
                <input type="date" name="fecha_evento" class="form-input" required>
            </div>
             <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea name="descripcion" class="form-textarea" rows="3"></textarea>
            </div>
        </form>
    `;

    createModal('Nueva Rifa', content, [
        { text: 'Cancelar', className: 'btn-secondary' },
        {
            text: 'Crear',
            className: 'btn-primary',
            onClick: async () => {
                const form = document.getElementById('form-create-rifa');
                if (!form.reportValidity()) return;

                const formData = getFormData(form);
                try {
                    await apiRequest('/rifas', {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                    showToast('Rifa creada exitosamente', 'success');
                    closeAllModals();
                    loadRifas();
                } catch (e) {
                    showToast('Error creando rifa', 'error');
                }
            }
        }
    ]);
}

async function openTicketModal(ticket) {
    const isFree = ticket.estado === 'DISPONIBLE';
    let socios = [];

    // Fetch socios if we're going to edit
    try {
        const data = await apiRequest('/socios?status=ACTIVO');
        socios = data.socios || [];
    } catch (e) {
        console.error('Error fetching socios', e);
    }

    // Helper to find socio by name if already assigned manually or from previous save
    // Currently we only saved name, so matching might be tricky if names are not unique or typed manually.
    // Ideally we should store socio_id in rifa_numeros, but for now we work with strings as per schema.

    const content = `
        <form id="form-ticket">
            <div class="mb-4 text-center">
                <span class="text-4xl font-bold text-primary-600 block mb-1">#${ticket.numero}</span>
                <span class="badge ${ticket.estado === 'PAGADO' ? 'badge-success' : ticket.estado === 'RESERVADO' ? 'badge-warning' : 'badge-secondary'}">
                    ${ticket.estado}
                </span>
            </div>
            
            <div class="form-group">
                <label class="form-label">Socio</label>
                <select id="ticket-cliente-select" class="form-select mb-2">
                    <option value="">-- Seleccionar Socio --</option>
                    ${socios.map(s => `
                        <option value="${formatNombre(s)}" 
                                data-telefono="${s.telefono || ''}" 
                                data-correo="${s.correo || ''}"
                                ${ticket.nombre_cliente === formatNombre(s) ? 'selected' : ''}>
                            ${formatNombre(s)}
                        </option>
                    `).join('')}
                    <option value="MANUAL" ${!socios.find(s => formatNombre(s) === ticket.nombre_cliente) && ticket.nombre_cliente ? 'selected' : ''}>Otro / Manual</option>
                </select>
                
                <input type="text" id="ticket-cliente-manual" class="form-input ${!socios.find(s => formatNombre(s) === ticket.nombre_cliente) && ticket.nombre_cliente ? '' : 'hidden'}" 
                       value="${ticket.nombre_cliente || ''}" placeholder="Nombre del cliente externo">
            </div>
            
             <div class="form-group">
                <label class="form-label">Estado</label>
                <select id="ticket-estado" class="form-select">
                    <option value="DISPONIBLE" ${ticket.estado === 'DISPONIBLE' ? 'selected' : ''}>Disponible</option>
                    <option value="RESERVADO" ${ticket.estado === 'RESERVADO' ? 'selected' : ''}>Reservado</option>
                    <option value="PAGADO" ${ticket.estado === 'PAGADO' ? 'selected' : ''}>Pagado</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input type="tel" id="ticket-telefono" class="form-input" value="${ticket.telefono_cliente || ''}">
            </div>
            
             <div class="form-group">
                <label class="form-label">Correo (Informativo)</label>
                <input type="email" id="ticket-correo" class="form-input bg-gray-50" readonly placeholder="Se autocompleta con el socio">
            </div>
        </form>
    `;

    createModal(`Gestionar Ticket ${ticket.numero}`, content, [
        { text: 'Cancelar', className: 'btn-secondary' },
        {
            text: 'Guardar',
            className: 'btn-primary',
            onClick: async () => {
                const select = document.getElementById('ticket-cliente-select');
                const manualInput = document.getElementById('ticket-cliente-manual');
                const cliente = select.value === 'MANUAL' ? manualInput.value : select.value;
                const estado = document.getElementById('ticket-estado').value;
                const telefono = document.getElementById('ticket-telefono').value;

                try {
                    await apiRequest(`/rifas/tickets/${ticket.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            nombre_cliente: cliente,
                            estado: estado,
                            telefono_cliente: telefono
                        })
                    });
                    showToast('Ticket actualizado', 'success');
                    closeAllModals();
                    loadRifaTickets(currentRifaId);
                } catch (e) {
                    showToast('Error al actualizar ticket', 'error');
                }
            }
        }
    ]);

    // Event Listeners for Auto-fill
    setTimeout(() => {
        const select = document.getElementById('ticket-cliente-select');
        const manualInput = document.getElementById('ticket-cliente-manual');
        const telefonoInput = document.getElementById('ticket-telefono');
        const correoInput = document.getElementById('ticket-correo');

        select.addEventListener('change', (e) => {
            if (e.target.value === 'MANUAL') {
                manualInput.classList.remove('hidden');
                manualInput.focus();
                // Clear fields if switching to manual? Maybe keep them.
            } else if (e.target.value) {
                manualInput.classList.add('hidden');
                const option = e.target.selectedOptions[0];
                telefonoInput.value = option.dataset.telefono;
                correoInput.value = option.dataset.correo;
            } else {
                manualInput.classList.add('hidden');
            }
        });

        // Trigger change to set email if already selected
        if (select.value && select.value !== 'MANUAL') {
            const option = select.selectedOptions[0];
            if (option) correoInput.value = option.dataset.correo;
        }
    }, 100);
}

async function handleDistributeTickets() {
    if (!currentRifaId) return;

    // Check if there are already assignments? 
    // The backend overwrites, but we should warn the user.
    const confirmMessage = `
        <div class="text-left">
            <p class="mb-2">¿Estás seguro de asignar los números aleatoriamente?</p>
            <ul class="list-disc pl-5 text-sm text-gray-600 mb-2">
                <li>Se repartirán los 100 números entre los socios activos.</li>
                <li>Los números restantes quedarán para "La Natillera".</li>
                <li><strong>Advertencia:</strong> Esto sobrescribirá las asignaciones actuales de esta rifa.</li>
            </ul>
        </div>
    `;

    createModal('Asignar Números', confirmMessage, [
        { text: 'Cancelar', className: 'btn-secondary' },
        {
            text: 'Asignar',
            className: 'btn-primary',
            onClick: async () => {
                try {
                    const btn = document.querySelector('.modal-footer .btn-primary');
                    if (btn) {
                        btn.disabled = true;
                        btn.textContent = 'Asignando...';
                    }

                    await apiRequest(`/rifas/${currentRifaId}/distribute`, { method: 'POST' });

                    showToast('Números asignados exitosamente', 'success');
                    closeAllModals();
                    await loadRifaTickets(currentRifaId);
                } catch (e) {
                    showToast(e.message || 'Error asignando números', 'error');
                }
            }
        }
    ]);
}

// Bind search button event
document.addEventListener('click', (e) => {
    if (e.target && e.target.closest('#btn-search-tickets')) {
        openSearchTicketsModal();
    }
});

function openSearchTicketsModal() {
    const content = `
        <div class="mb-4">
            <div class="flex gap-2">
                <input type="text" id="search-doc-input" class="form-input" placeholder="Ingrese número de documento">
                <button id="btn-perform-search" class="btn btn-primary">
                    <i class="fas fa-search"></i> Buscar
                </button>
            </div>
        </div>
        <div id="search-results-area" class="mt-4">
            <p class="text-gray-500 text-center text-sm">Ingrese un documento para ver los tickets asignados.</p>
        </div>
    `;

    createModal('Consultar Tickets por Socio', content, [
        { text: 'Cerrar', className: 'btn-secondary' }
    ]);

    // Bind search action inside modal
    setTimeout(() => {
        const btn = document.getElementById('btn-perform-search');
        const input = document.getElementById('search-doc-input');

        const doSearch = async () => {
            const doc = input.value.trim();
            if (!doc) return;

            const resultsArea = document.getElementById('search-results-area');
            resultsArea.innerHTML = '<div class="loading-spinner mx-auto"></div>';

            try {
                const data = await apiRequest(`/rifas/tickets-by-doc/${doc}`);

                if (data.tickets.length === 0) {
                    resultsArea.innerHTML = `
                        <div class="p-4 bg-yellow-50 text-yellow-700 rounded-lg text-center">
                            <i class="fas fa-info-circle mr-2"></i> El socio <strong>${data.socio.nombre}</strong> no tiene tickets asignados.
                        </div>
                     `;
                    return;
                }

                let html = `
                    <div class="mb-3 text-sm font-semibold text-gray-700">
                        Resultados para: <span class="text-primary-600 uppercase">${data.socio.nombre}</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="bg-gray-50 text-gray-700 font-semibold border-b">
                                <tr>
                                    <th class="p-2">Rifa</th>
                                    <th class="p-2">Fecha</th>
                                    <th class="p-2">Número</th>
                                    <th class="p-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                 `;

                data.tickets.forEach(t => {
                    let badgeClass = 'badge-secondary';
                    if (t.estado === 'PAGADO') badgeClass = 'badge-success';
                    if (t.estado === 'RESERVADO') badgeClass = 'badge-warning';

                    html += `
                        <tr class="border-b">
                            <td class="p-2 font-medium">${t.rifa_nombre}</td>
                            <td class="p-2 text-gray-500">${formatDate(t.fecha_evento)}</td>
                            <td class="p-2 font-bold text-lg">#${t.numero}</td>
                            <td class="p-2"><span class="badge ${badgeClass}">${t.estado}</span></td>
                        </tr>
                     `;
                });

                html += '</tbody></table></div>';
                resultsArea.innerHTML = html;

            } catch (e) {
                resultsArea.innerHTML = `
                    <p class="text-red-500 text-center">
                        ${e.message || 'Socio no encontrado o error en la búsqueda'}
                    </p>
                 `;
            }
        };

        btn.onclick = doSearch;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') doSearch();
        };
    }, 100);
}

function openWinnerModal(rifa) {
    const content = `
        <div class="mb-4 text-center">
            <p class="mb-2 text-gray-600">Selecciona el número ganador del sorteo <strong>${rifa.nombre}</strong></p>
            <div class="flex justify-center items-center gap-2">
                <input type="number" id="winner-num-input" class="form-input text-center text-2xl w-24" min="0" max="99" placeholder="00" maxlength="2">
            </div>
            <p class="mt-2 text-xs text-red-500 hidden" id="winner-error-msg"></p>
        </div>
    `;

    createModal('Registrar Ganador', content, [
        { text: 'Cancelar', className: 'btn-secondary' },
        {
            text: 'Guardar',
            className: 'btn-primary',
            onClick: async () => {
                const input = document.getElementById('winner-num-input');
                let val = input.value;
                if (val === '') {
                    document.getElementById('winner-error-msg').textContent = 'Ingrese un número';
                    document.getElementById('winner-error-msg').classList.remove('hidden');
                    return;
                }

                // Pad with 0 if single digit
                val = val.toString().padStart(2, '0');
                if (val.length > 2 || parseInt(val) < 0 || parseInt(val) > 99) {
                    document.getElementById('winner-error-msg').textContent = 'Número inválido (00-99)';
                    document.getElementById('winner-error-msg').classList.remove('hidden');
                    return;
                }

                try {
                    const btn = document.querySelector('.modal-footer .btn-primary');
                    if (btn) {
                        btn.disabled = true;
                        btn.textContent = 'Guardando...';
                    }

                    await apiRequest(`/rifas/${rifa.id}/winner`, {
                        method: 'POST',
                        body: JSON.stringify({ numero: val })
                    });

                    showToast('Ganador registrado exitosamente! 🏆', 'success');
                    closeAllModals();

                    // Refresh data
                    await loadRifas(); // Update local list
                    await loadRifaTickets(rifa.id); // Reload grid

                } catch (e) {
                    showToast(e.message || 'Error registrando ganador', 'error');
                }
            }
        }
    ]);
}
