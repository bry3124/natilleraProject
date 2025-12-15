
// Authentication Module

const Auth = {
    getToken() {
        return localStorage.getItem('auth_token');
    },

    setToken(token, user) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
    },

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.reload();
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    async login(username, password) {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (!data.ok) throw new Error(data.error || 'Error al iniciar sesión');

            this.setToken(data.token, data.user);
            return true;
        } catch (error) {
            throw error;
        }
    },

    checkAuth() {
        if (!this.isAuthenticated()) {
            this.showLoginModal();
        } else {
            // Show logout button if not already present
            this.renderLogoutButton();
        }
    },

    renderLogoutButton() {
        const header = document.querySelector('.main-header');
        if (!header.querySelector('#btn-logout')) {
            const btn = document.createElement('button');
            btn.id = 'btn-logout';
            btn.className = 'btn-icon ml-auto';
            btn.innerHTML = '<i class="fas fa-sign-out-alt text-red-500"></i>';
            btn.title = 'Cerrar Sesión';
            btn.onclick = () => this.logout();
            header.appendChild(btn);
        }
    },

    showLoginModal() {
        // Prevent closing by clicking background or escape
        // Create a specific modal or overlay that covers everything

        // Check if modal already exists
        if (document.getElementById('login-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'var(--primary-900)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '1rem';

        overlay.innerHTML = `
      <div class="card card-glass text-center animate-scale-in" style="max-width: 400px; width: 100%; padding: 2rem;">
        <div class="mb-4">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-primary-600 text-2xl font-bold mb-4 shadow-lg">N</div>
            <h1 class="text-2xl font-bold text-white mb-1">Natillera MiAhorro</h1>
            <p class="text-blue-100 text-sm">Inicia sesión para continuar</p>
        </div>
        
        <form id="form-login" class="text-left">
            <div class="form-group">
                <label class="text-white text-sm font-semibold mb-1 block">Usuario</label>
                <input type="text" id="login-username" class="form-input" placeholder="admin">
            </div>
            <div class="form-group">
                <label class="text-white text-sm font-semibold mb-1 block">Contraseña</label>
                <input type="password" id="login-password" class="form-input" placeholder="••••••••">
            </div>
            <button type="submit" class="btn btn-primary w-full shadow-lg mt-4">Entrar</button>
        </form>
        <div id="login-error" class="mt-4 text-red-300 text-sm hidden font-bold bg-red-900/30 p-2 rounded"></div>
      </div>
    `;

        document.body.appendChild(overlay);

        document.getElementById('form-login').addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('login-username').value;
            const pass = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');

            try {
                errorEl.classList.add('hidden');
                const submitBtn = e.target.querySelector('button');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Verificando...';

                await this.login(user, pass);

                overlay.remove();
                showToast('Bienvenido', 'success');
                this.renderLogoutButton();

                // Reload to ensure all data is fetched fresh if needed, or just continue
                if (typeof renderDashboard === 'function') renderDashboard();

            } catch (err) {
                errorEl.textContent = err.message;
                errorEl.classList.remove('hidden');
            } finally {
                const submitBtn = e.target.querySelector('button');
                if (submitBtn) { // if modal not removed
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Entrar';
                }
            }
        });
    }
};
