/**
 * API Client Utility for SkillSwap
 * Provides simplified fetch() wrappers, CSRF token handling, and UI toasts
 */

let cachedCsrfToken = null;

/**
 * Fetch or retrieve CSRF token from backend
 */
async function getCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const res = await fetch('/api/auth/csrf-token');
    const data = await res.json();
    if (data && data.csrfToken) {
      cachedCsrfToken = data.csrfToken;
    }
  } catch (err) {
    console.error('Failed to obtain CSRF token:', err);
  }
  return cachedCsrfToken;
}

/**
 * Perform a GET request
 */
async function apiGet(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok && response.status === 401) {
      // If unauthorized, redirect to login unless on public landing/login/register
      const path = window.location.pathname;
      if (!path.includes('login.html') && !path.includes('register.html') && !path.endsWith('/') && !path.endsWith('index.html')) {
        window.location.href = '/login.html';
      }
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`GET request failed for ${url}:`, error);
    return { ok: false, status: 500, data: { success: false, message: 'Network or server error.' } };
  }
}

/**
 * Perform a POST request with CSRF verification
 */
async function apiPost(url, bodyData = {}) {
  try {
    const csrfToken = await getCsrfToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyData)
    });

    const data = await response.json();
    // Update token if returned
    if (data.csrfToken) cachedCsrfToken = data.csrfToken;

    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`POST request failed for ${url}:`, error);
    return { ok: false, status: 500, data: { success: false, message: 'Network or server error.' } };
  }
}

/**
 * Perform a PUT request with CSRF verification
 */
async function apiPut(url, bodyData = {}) {
  try {
    const csrfToken = await getCsrfToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(bodyData)
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`PUT request failed for ${url}:`, error);
    return { ok: false, status: 500, data: { success: false, message: 'Network or server error.' } };
  }
}

/**
 * Perform a DELETE request with CSRF verification
 */
async function apiDelete(url) {
  try {
    const csrfToken = await getCsrfToken();
    const headers = {
      'Accept': 'application/json'
    };
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`DELETE request failed for ${url}:`, error);
    return { ok: false, status: 500, data: { success: false, message: 'Network or server error.' } };
  }
}

/**
 * Display a user-friendly Toast Notification
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

/**
 * Format timestamp into readable string
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Prefetch CSRF token on page load
document.addEventListener('DOMContentLoaded', () => {
  getCsrfToken();
});
