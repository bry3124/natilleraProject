// Simple Hash-based Router

const Router = {
    currentView: 'dashboard',

    init() {
        // Handle hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        // Handle navigation clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.dataset.view;
                this.navigate(view);
            });
        });

        // Load initial route
        this.handleRoute();
    },

    navigate(view) {
        window.location.hash = view;
    },

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.loadView(hash);
    },

    loadView(view) {
        this.currentView = view;

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === view) {
                link.classList.add('active');
            }
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            socios: 'Socios',
            eventos: 'Eventos',
            prestamos: 'Préstamos'
        };
        document.getElementById('page-title').textContent = titles[view] || 'Dashboard';

        // Load view content
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '';

        switch (view) {
            case 'dashboard':
                if (typeof renderDashboard === 'function') renderDashboard();
                break;
            case 'socios':
                if (typeof renderSocios === 'function') renderSocios();
                break;
            case 'eventos':
                if (typeof renderEventos === 'function') renderEventos();
                break;
            case 'prestamos':
                if (typeof renderPrestamos === 'function') renderPrestamos();
                break;
            case 'rifas':
                if (typeof renderRifas === 'function') renderRifas();
                break;
            default:
                contentArea.innerHTML = '<div class="empty-state"><h2>Vista no encontrada</h2></div>';
        }
    }
};
