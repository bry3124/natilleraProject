// Main Application Entry Point

document.addEventListener('DOMContentLoaded', () => {
  console.log('Natillera App Initialized');

  // Initialize Router
  Router.init();

  // Check Auth
  if (typeof Auth !== 'undefined') {
    Auth.checkAuth();
  }

  // Mobile menu toggle
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function toggleMobileMenu() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
  }

  function closeMobileMenu() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  }

  // Event listeners for mobile menu
  hamburgerBtn?.addEventListener('click', toggleMobileMenu);
  sidebarOverlay?.addEventListener('click', closeMobileMenu);

  // Close menu when clicking nav link on mobile
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    });
  });

  // Global search functionality
  const globalSearch = document.getElementById('global-search');
  if (globalSearch) {
    globalSearch.addEventListener('input', debounce((e) => {
      const query = e.target.value.trim();
      if (query >= 2) {
        performGlobalSearch(query);
      }
    }, 400));
  }
});

async function performGlobalSearch(query) {
  // This could search across all entities
  console.log('Global search:', query);
  // For now, just show a toast
  // In a full implementation, this would search socios, eventos, and prestamos
}

// Handle errors globally
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
