/**
 * Auth State & Navigation Management
 * Validates session, protects private pages, and handles logout
 */

let currentUser = null;

/**
 * Check authentication status and update navbar
 */
async function checkAuth(options = { requireAuth: false, redirectIfAuth: false }) {
  const res = await apiGet('/api/auth/me');

  if (res.ok && res.data && res.data.authenticated) {
    currentUser = res.data.user;

    // If on login or register page, redirect to dashboard
    if (options.redirectIfAuth) {
      window.location.href = '/dashboard.html';
      return currentUser;
    }

    updateNavbarUser(currentUser);
    return currentUser;
  } else {
    currentUser = null;
    // If page requires authentication, redirect to login
    if (options.requireAuth) {
      window.location.href = '/login.html';
      return null;
    }

    updateNavbarGuest();
    return null;
  }
}

/**
 * Render user info and logout button in navigation bar
 */
function updateNavbarUser(user) {
  const userPanel = document.getElementById('nav-user-panel');
  if (!userPanel) return;

  userPanel.innerHTML = `
    <span class="nav-user-name">👤 ${user.name}</span>
    <span class="badge badge-level">${user.department}</span>
    <button id="logout-btn" class="btn btn-outline btn-sm">Logout</button>
  `;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

/**
 * Render Login/Register buttons in navbar for guests
 */
function updateNavbarGuest() {
  const userPanel = document.getElementById('nav-user-panel');
  if (!userPanel) return;

  userPanel.innerHTML = `
    <a href="/login.html" class="btn btn-outline btn-sm">Login</a>
    <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
  `;
}

/**
 * Perform logout
 */
async function handleLogout() {
  try {
    const res = await apiPost('/api/auth/logout', {});
    if (res.ok) {
      showToast('Logged out successfully.', 'info');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 500);
    }
  } catch (err) {
    console.error('Logout error:', err);
    window.location.href = '/login.html';
  }
}
