/**
 * Exchange Requests Management Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth({ requireAuth: true });
  if (!user) return;

  setupTabs();
  loadIncomingRequests();
  loadOutgoingRequests();
});

function setupTabs() {
  const tabIncoming = document.getElementById('tab-btn-incoming');
  const tabOutgoing = document.getElementById('tab-btn-outgoing');
  const paneIncoming = document.getElementById('pane-incoming');
  const paneOutgoing = document.getElementById('pane-outgoing');

  if (tabIncoming && tabOutgoing) {
    tabIncoming.addEventListener('click', () => {
      tabIncoming.classList.add('active');
      tabOutgoing.classList.remove('active');
      paneIncoming.classList.add('active');
      paneOutgoing.classList.remove('active');
      loadIncomingRequests();
    });

    tabOutgoing.addEventListener('click', () => {
      tabOutgoing.classList.add('active');
      tabIncoming.classList.remove('active');
      paneOutgoing.classList.add('active');
      paneIncoming.classList.remove('active');
      loadOutgoingRequests();
    });
  }
}

/**
 * Load Incoming Requests
 */
async function loadIncomingRequests() {
  const container = document.getElementById('incoming-tbody');
  const emptyState = document.getElementById('incoming-empty');
  if (!container) return;

  const res = await apiGet('/api/requests/incoming');
  if (!res.ok || !res.data.success) {
    showToast('Failed to load incoming requests.', 'error');
    return;
  }

  const requests = res.data.requests || [];

  if (requests.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = requests.map(req => {
    let statusBadge = getStatusBadge(req.status);
    let actionsHtml = '';

    if (req.status === 'Pending') {
      actionsHtml = `
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-success btn-sm action-btn" data-id="${req.request_id}" data-action="Accepted">Accept</button>
          <button class="btn btn-danger btn-sm action-btn" data-id="${req.request_id}" data-action="Rejected">Reject</button>
        </div>
      `;
    } else if (req.status === 'Accepted') {
      actionsHtml = `<a href="/sessions.html" class="btn btn-outline btn-sm">Schedule Session</a>`;
    } else {
      actionsHtml = `<span class="text-muted" style="font-size: 0.85rem;">No actions</span>`;
    }

    return `
      <tr>
        <td>
          <strong>${req.requester_name}</strong><br>
          <small class="text-muted">${req.requester_department} (${req.requester_year})</small>
        </td>
        <td><span class="badge badge-learn">Wants</span> ${req.requested_skill_name}</td>
        <td><span class="badge badge-offer">Offers</span> ${req.offered_skill_name} (${req.peer_offered_proficiency})</td>
        <td><small>${req.message ? `"${req.message}"` : '<em>No message</em>'}</small></td>
        <td>${statusBadge}</td>
        <td>${formatDate(req.created_at)}</td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  }).join('');

  // Attach status change events
  container.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const requestId = btn.getAttribute('data-id');
      const targetStatus = btn.getAttribute('data-action');

      btn.disabled = true;

      const res = await apiPut(`/api/requests/${requestId}/status`, { status: targetStatus });

      if (res.ok && res.data.success) {
        showToast(res.data.message, 'success');
        loadIncomingRequests();
      } else {
        showToast(res.data.message || 'Action failed.', 'error');
        btn.disabled = false;
      }
    });
  });
}

/**
 * Load Outgoing Requests
 */
async function loadOutgoingRequests() {
  const container = document.getElementById('outgoing-tbody');
  const emptyState = document.getElementById('outgoing-empty');
  if (!container) return;

  const res = await apiGet('/api/requests/outgoing');
  if (!res.ok || !res.data.success) {
    showToast('Failed to load outgoing requests.', 'error');
    return;
  }

  const requests = res.data.requests || [];

  if (requests.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = requests.map(req => {
    let statusBadge = getStatusBadge(req.status);
    let actionsHtml = '';

    if (req.status === 'Pending') {
      actionsHtml = `
        <button class="btn btn-outline btn-sm cancel-req-btn" 
          data-id="${req.request_id}" 
          style="color: var(--danger); border-color: #fecaca;">
          Cancel
        </button>
      `;
    } else if (req.status === 'Accepted') {
      actionsHtml = `<a href="/sessions.html" class="btn btn-outline btn-sm">Schedule Session</a>`;
    } else {
      actionsHtml = `<span class="text-muted" style="font-size: 0.85rem;">None</span>`;
    }

    return `
      <tr>
        <td>
          <strong>${req.recipient_name}</strong><br>
          <small class="text-muted">${req.recipient_department} (${req.recipient_year})</small>
        </td>
        <td><span class="badge badge-learn">You Want</span> ${req.requested_skill_name}</td>
        <td><span class="badge badge-offer">You Offer</span> ${req.offered_skill_name}</td>
        <td><small>${req.message ? `"${req.message}"` : '<em>No message</em>'}</small></td>
        <td>${statusBadge}</td>
        <td>${formatDate(req.created_at)}</td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  }).join('');

  // Attach cancel events
  container.querySelectorAll('.cancel-req-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const requestId = btn.getAttribute('data-id');
      if (!confirm('Are you sure you want to cancel this pending request?')) return;

      btn.disabled = true;

      const res = await apiPut(`/api/requests/${requestId}/status`, { status: 'Cancelled' });

      if (res.ok && res.data.success) {
        showToast('Request cancelled.', 'info');
        loadOutgoingRequests();
      } else {
        showToast(res.data.message || 'Could not cancel request.', 'error');
        btn.disabled = false;
      }
    });
  });
}

function getStatusBadge(status) {
  let badgeClass = 'badge-pending';
  if (status === 'Accepted') badgeClass = 'badge-accepted';
  if (status === 'Rejected') badgeClass = 'badge-rejected';
  if (status === 'Cancelled') badgeClass = 'badge-cancelled';
  return `<span class="badge ${badgeClass}">${status}</span>`;
}
