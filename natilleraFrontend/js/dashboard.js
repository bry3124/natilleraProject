// Dashboard View

async function renderDashboard() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div></div>';

    try {
        const data = await apiRequest('/dashboard/summary');

        contentArea.innerHTML = '';

        // Stats Grid
        const statsGrid = document.createElement('div');
        statsGrid.className = 'grid grid-cols-4 mb-8';

        const stats = [
            { label: 'Socios Activos', value: data.stats.total_socios, icon: 'users', gradient: 'linear-gradient(135deg, #2E5C8A, #4A7BA7)' },
            { label: 'Eventos Próximos', value: data.stats.eventos_proximos, icon: 'calendar-alt', gradient: 'linear-gradient(135deg, #0FB0CC, #11CBEB)' },
            { label: 'Préstamos Pendientes', value: data.stats.prestamos_pendientes, icon: 'hand-holding-usd', gradient: 'linear-gradient(135deg, #FB8C00, #FFA726)' },
            { label: 'Total Ahorrado', value: formatCurrency(data.stats.total_ahorrado), icon: 'piggy-bank', gradient: 'linear-gradient(135deg, #43A047, #66BB6A)' }
        ];

        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.background = stat.gradient;
            card.style.color = 'white';
            card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <i class="fas fa-${stat.icon}" style="font-size: 2rem; opacity: 0.8;"></i>
        </div>
        <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem;">${stat.value}</div>
        <div style="font-size: 0.875rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">${stat.label}</div>
      `;
            statsGrid.appendChild(card);
        });

        contentArea.appendChild(statsGrid);

        // Main Content Grid
        const mainGrid = document.createElement('div');
        mainGrid.className = 'grid grid-cols-2 gap-6';

        // Socios Section
        const sociosCard = document.createElement('div');
        sociosCard.className = 'card';
        sociosCard.innerHTML = `
      <div class="card-header">
        <h2 class="card-title">
          <i class="fas fa-users"></i> Socios Destacados
        </h2>
        <a href="#socios" class="btn btn-sm btn-secondary">Ver todos</a>
      </div>
      <div id="socios-list"></div>
    `;

        const sociosList = sociosCard.querySelector('#socios-list');
        if (data.socios && data.socios.length > 0) {
            data.socios.forEach(socio => {
                const socioItem = document.createElement('div');
                socioItem.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border-light); transition: background 0.2s;';
                socioItem.onmouseenter = () => socioItem.style.background = 'var(--neutral-50)';
                socioItem.onmouseleave = () => socioItem.style.background = 'transparent';

                socioItem.innerHTML = `
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-500), var(--accent-500)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.25rem;">
              ${socio.nombre1.charAt(0)}${socio.apellido1.charAt(0)}
            </div>
            <div>
              <div style="font-weight: 600; color: var(--text-primary);">${formatNombre(socio)}</div>
              <div style="font-size: 0.875rem; color: var(--text-secondary);">${socio.documento}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: var(--success-600);">${formatCurrency(socio.total_ahorrado)}</div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">Ahorrado</div>
          </div>
        `;
                sociosList.appendChild(socioItem);
            });
        } else {
            sociosList.appendChild(createEmptyState('users', 'No hay socios', 'Aún no se han registrado socios'));
        }

        mainGrid.appendChild(sociosCard);

        // Eventos Section
        const eventosCard = document.createElement('div');
        eventosCard.className = 'card';
        eventosCard.innerHTML = `
      <div class="card-header">
        <h2 class="card-title">
          <i class="fas fa-calendar-alt"></i> Últimos Eventos
        </h2>
        <a href="#eventos" class="btn btn-sm btn-secondary">Ver todos</a>
      </div>
      <div id="eventos-list"></div>
    `;

        const eventosList = eventosCard.querySelector('#eventos-list');
        if (data.eventos && data.eventos.length > 0) {
            data.eventos.forEach(evento => {
                const eventoItem = document.createElement('div');
                eventoItem.style.cssText = 'padding: 1rem; border-bottom: 1px solid var(--border-light); transition: background 0.2s;';
                eventoItem.onmouseenter = () => eventoItem.style.background = 'var(--neutral-50)';
                eventoItem.onmouseleave = () => eventoItem.style.background = 'transparent';

                const badgeClass = evento.estado === 'UPCOMING' ? 'badge-accent' : evento.estado === 'COMPLETED' ? 'badge-success' : 'badge-primary';

                eventoItem.innerHTML = `
          <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 0.5rem;">
            <div style="font-weight: 600; color: var(--text-primary);">${evento.nombre}</div>
            <span class="badge ${badgeClass}">${evento.estado}</span>
          </div>
          <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
            <i class="fas fa-calendar"></i> ${formatDateShort(evento.fecha)}
          </div>
          ${evento.descripcion ? `<div style="font-size: 0.875rem; color: var(--text-tertiary);">${evento.descripcion}</div>` : ''}
        `;
                eventosList.appendChild(eventoItem);
            });
        } else {
            eventosList.appendChild(createEmptyState('calendar-alt', 'No hay eventos', 'Aún no se han creado eventos'));
        }

        mainGrid.appendChild(eventosCard);

        contentArea.appendChild(mainGrid);

        // Prestamos Section (Full Width)
        if (data.prestamos && data.prestamos.length > 0) {
            const prestamosCard = document.createElement('div');
            prestamosCard.className = 'card mt-6';
            prestamosCard.innerHTML = `
        <div class="card-header">
          <h2 class="card-title">
            <i class="fas fa-hand-holding-usd"></i> Préstamos Pendientes
          </h2>
          <a href="#prestamos" class="btn btn-sm btn-secondary">Ver todos</a>
        </div>
        <div id="prestamos-grid" class="grid grid-cols-3 gap-4"></div>
      `;

            const prestamosGrid = prestamosCard.querySelector('#prestamos-grid');
            data.prestamos.forEach(prestamo => {
                const prestamoCard = document.createElement('div');
                prestamoCard.style.cssText = 'padding: 1.25rem; background: var(--neutral-50); border-radius: var(--radius-lg); border-left: 4px solid var(--warning-500);';

                const saldoPendiente = Number(prestamo.monto) - Number(prestamo.total_pagado || 0);

                prestamoCard.innerHTML = `
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
            ${prestamo.nombre1} ${prestamo.apellido1}
          </div>
          <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            Doc: ${prestamo.documento}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">Monto</div>
              <div style="font-weight: 700; color: var(--text-primary);">${formatCurrency(prestamo.monto)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">Pendiente</div>
              <div style="font-weight: 700; color: var(--warning-600);">${formatCurrency(saldoPendiente)}</div>
            </div>
          </div>
        `;
                prestamosGrid.appendChild(prestamoCard);
            });

            contentArea.appendChild(prestamosCard);
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
        contentArea.innerHTML = '';
        contentArea.appendChild(
            createEmptyState(
                'exclamation-triangle',
                'Error al cargar el dashboard',
                'No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose.',
                {
                    text: 'Reintentar',
                    className: 'btn-primary',
                    onClick: renderDashboard
                }
            )
        );
    }
}
