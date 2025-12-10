// Utility Functions

const API_BASE = 'http://localhost:4000/api';

// ========== API Utilities ==========
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!data.ok && response.status >= 400) {
            throw new Error(data.error || 'Error en la solicitud');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ========== Toast Notifications ==========
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast';

    if (type === 'success') toast.classList.add('toast-success');
    if (type === 'error') toast.classList.add('toast-error');
    if (type === 'warning') toast.classList.add('toast-warning');

    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// ========== Date Formatting ==========
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateShort(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatDateInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// ========== Currency Formatting ==========
function formatCurrency(value) {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Number(value));
}

// ========== Name Formatting ==========
function formatNombre(socio) {
    const parts = [
        socio.nombre1,
        socio.nombre2,
        socio.apellido1,
        socio.apellido2
    ].filter(Boolean);
    return parts.join(' ');
}

// ========== Debounce ==========
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== Modal Utilities ==========
function createModal(title, content, actions = []) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
    <h2 class="modal-title">${title}</h2>
    <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof content === 'string') {
        body.innerHTML = content;
    } else {
        body.appendChild(content);
    }

    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `btn ${action.className || 'btn-secondary'}`;
        btn.textContent = action.text;
        btn.onclick = () => {
            if (action.onClick) action.onClick();
            if (action.closeOnClick !== false) backdrop.remove();
        };
        footer.appendChild(btn);
    });

    modal.appendChild(header);
    modal.appendChild(body);
    if (actions.length > 0) modal.appendChild(footer);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.remove();
    });

    return { backdrop, modal, body, footer };
}

function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
}

// ========== Form Utilities ==========
function getFormData(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}

function resetForm(formElement) {
    formElement.reset();
    // Clear any validation states
    formElement.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
        input.classList.remove('is-invalid', 'is-valid');
    });
}

// ========== Loading State ==========
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
}

// ========== Confirmation Dialog ==========
function confirm(message, onConfirm, onCancel) {
    createModal(
        'Confirmación',
        `<p>${message}</p>`,
        [
            {
                text: 'Cancelar',
                className: 'btn-secondary',
                onClick: onCancel
            },
            {
                text: 'Confirmar',
                className: 'btn-danger',
                onClick: onConfirm
            }
        ]
    );
}

// ========== Empty State ==========
function createEmptyState(icon, title, description, action = null) {
    const container = document.createElement('div');
    container.className = 'empty-state';

    let html = `
    <div class="empty-state-icon">
      <i class="fas fa-${icon}"></i>
    </div>
    <h3 class="empty-state-title">${title}</h3>
    <p class="empty-state-description">${description}</p>
  `;

    container.innerHTML = html;

    if (action) {
        const btn = document.createElement('button');
        btn.className = `btn ${action.className || 'btn-primary'}`;
        btn.textContent = action.text;
        btn.onclick = action.onClick;
        container.appendChild(btn);
    }

    return container;
}

// ========== Table Utilities ==========
function createTable(columns, data, actions = []) {
    // Responsive wrapper
    const responsiveWrapper = document.createElement('div');
    responsiveWrapper.className = 'table-responsive';

    const container = document.createElement('div');
    container.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        headerRow.appendChild(th);
    });
    if (actions.length > 0) {
        const th = document.createElement('th');
        th.textContent = 'Acciones';
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            if (col.render) {
                const rendered = col.render(row[col.key], row);
                if (typeof rendered === 'string') {
                    td.innerHTML = rendered;
                } else {
                    td.appendChild(rendered);
                }
            } else {
                td.textContent = row[col.key] || '-';
            }
            tr.appendChild(td);
        });

        if (actions.length > 0) {
            const td = document.createElement('td');
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'table-actions';
            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = `btn btn-sm ${action.className || 'btn-secondary'}`;
                btn.innerHTML = action.icon ? `<i class="${action.icon}"></i> ${action.text}` : action.text;
                btn.onclick = () => action.onClick(row);
                actionsDiv.appendChild(btn);
            });
            td.appendChild(actionsDiv);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);
    responsiveWrapper.appendChild(container);
    return responsiveWrapper;
}
