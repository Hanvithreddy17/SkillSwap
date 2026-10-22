/**
 * Dashboard Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth({ requireAuth: true });
  if (!user) return;

  // Set welcome message
  const welcomeName = document.getElementById('welcome-name');
  const studentMeta = document.getElementById('student-meta');
  if (welcomeName) welcomeName.textContent = user.name;
  if (studentMeta) studentMeta.textContent = `${user.department} • ${user.year_of_study}`;

  loadDashboardSummary();
  loadReciprocalMatchBanner();
});

async function loadDashboardSummary() {
  const res = await apiGet('/api/requests/dashboard-summary');
  if (!res.ok || !res.data.success) {
    showToast('Failed to load dashboard metrics.', 'error');
    return;
  }

  const { offeredCount, wantedCount, pendingCount, acceptedCount, recentIncoming } = res.data.summary;

  // Populate stat counters
  const countOffered = document.getElementById('count-offered');
  const countWanted = document.getElementById('count-wanted');
  const countPending = document.getElementById('count-pending');
  const countAccepted = document.getElementById('count-accepted');

  if (countOffered) countOffered.textContent = offeredCount;
  if (countWanted) countWanted.textContent = wantedCount;
  if (countPending) countPending.textContent = pendingCount;
  if (countAccepted) countAccepted.textContent = acceptedCount;

  // Render recent requests table
  const tbody = document.getElementById('recent-requests-tbody');
  const emptyState = document.getElementById('recent-empty-state');

  if (!tbody) return;

  if (recentIncoming.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = recentIncoming.map(req => {
    let statusBadgeClass = 'badge-pending';
    if (req.status === 'Accepted') statusBadgeClass = 'badge-accepted';
    if (req.status === 'Rejected') statusBadgeClass = 'badge-rejected';
    if (req.status === 'Cancelled') statusBadgeClass = 'badge-cancelled';

    return `
      <tr>
        <td><strong>${req.requester_name}</strong><br><small class="text-muted">${req.requester_department}</small></td>
        <td><span class="badge badge-offer">Offered</span> ${req.offered_skill_name}</td>
        <td><span class="badge badge-learn">Wants</span> ${req.requested_skill_name}</td>
        <td><span class="badge ${statusBadgeClass}">${req.status}</span></td>
        <td>${formatDate(req.created_at)}</td>
        <td>
          <a href="/exchanges.html" class="btn btn-outline btn-sm">Manage</a>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadReciprocalMatchBanner() {
  const res = await apiGet('/api/matches/reciprocal');
  const banner = document.getElementById('match-alert-banner');
  if (!banner) return;

  if (res.ok && res.data.success && res.data.matches && res.data.matches.length > 0) {
    const count = res.data.matches.length;
    banner.style.display = 'block';
    banner.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <strong>🎯 Great News! You have ${count} instant reciprocal match${count > 1 ? 'es' : ''}!</strong>
          <p style="margin: 4px 0 0; font-size: 0.85rem; color: #1e3a8a;">
            Peers want skills you can teach and offer skills you want to learn.
          </p>
        </div>
        <a href="/explore.html?tab=matches" class="btn btn-primary btn-sm">View Mutual Matches</a>
      </div>
    `;
  } else {
    banner.style.display = 'none';
  }
}
