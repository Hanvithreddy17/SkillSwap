/**
 * Study Sessions & Peer Review Page Logic
 */

let acceptedExchanges = [];
let activeReviewSessionId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth({ requireAuth: true });
  if (!user) return;

  loadAcceptedExchanges();
  loadSessions();
  setupScheduleForm();
  setupReviewModal();
});

async function loadAcceptedExchanges() {
  const res = await apiGet('/api/requests/accepted');
  const select = document.getElementById('session-exchange-select');
  const warning = document.getElementById('no-accepted-warning');
  const form = document.getElementById('schedule-form');

  if (!select) return;

  if (res.ok && res.data.success) {
    acceptedExchanges = res.data.exchanges || [];

    if (acceptedExchanges.length === 0) {
      if (warning) warning.style.display = 'block';
      if (select) select.innerHTML = '<option value="">No accepted exchanges available</option>';
      return;
    }

    if (warning) warning.style.display = 'none';

    select.innerHTML = '<option value="">-- Choose an accepted exchange --</option>' +
      acceptedExchanges.map(ex => `
        <option value="${ex.request_id}">
          With ${ex.partner_name} (${ex.offered_skill_name} ⇄ ${ex.requested_skill_name})
        </option>
      `).join('');
  }
}

function setupScheduleForm() {
  const form = document.getElementById('schedule-form');
  if (!form) return;

  // Set default min datetime to right now
  const dtInput = document.getElementById('session-datetime');
  if (dtInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dtInput.min = now.toISOString().slice(0, 16);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const requestId = document.getElementById('session-exchange-select').value;
    const scheduledAt = document.getElementById('session-datetime').value;
    const duration = document.getElementById('session-duration').value;
    const mode = document.getElementById('session-mode').value;
    const details = document.getElementById('session-details').value;

    if (!requestId) {
      showToast('Please select an accepted exchange.', 'error');
      return;
    }
    if (!scheduledAt) {
      showToast('Please pick a date and time.', 'error');
      return;
    }

    const submitBtn = document.getElementById('schedule-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Scheduling...';

    const res = await apiPost('/api/sessions', {
      request_id: requestId,
      scheduled_at: scheduledAt,
      duration_minutes: duration,
      meeting_mode: mode,
      meeting_details: details
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Schedule Session';

    if (res.ok && res.data.success) {
      showToast('Session scheduled successfully!', 'success');
      form.reset();
      loadSessions();
    } else {
      showToast(res.data.message || 'Failed to schedule session.', 'error');
    }
  });
}

async function loadSessions() {
  const container = document.getElementById('sessions-grid');
  const emptyState = document.getElementById('sessions-empty');
  if (!container) return;

  container.innerHTML = '<p class="text-muted">Loading study sessions...</p>';

  const res = await apiGet('/api/sessions/my');
  if (!res.ok || !res.data.success) {
    container.innerHTML = '<p class="text-muted">Failed to load sessions.</p>';
    return;
  }

  const sessions = res.data.sessions || [];

  if (sessions.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = sessions.map(sess => {
    let statusBadge = 'badge-pending';
    if (sess.status === 'Completed') statusBadge = 'badge-accepted';
    if (sess.status === 'Cancelled') statusBadge = 'badge-cancelled';

    let actionsHtml = '';

    if (sess.status === 'Scheduled') {
      actionsHtml = `
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-success btn-sm session-status-btn" data-id="${sess.session_id}" data-status="Completed">
            Mark Completed
          </button>
          <button class="btn btn-outline btn-sm session-status-btn" data-id="${sess.session_id}" data-status="Cancelled" style="color: var(--danger);">
            Cancel
          </button>
        </div>
      `;
    } else if (sess.status === 'Completed') {
      if (sess.has_reviewed > 0) {
        actionsHtml = `<span class="badge badge-accepted">Review Submitted ✅</span>`;
      } else {
        actionsHtml = `
          <button class="btn btn-primary btn-sm open-review-btn" 
            data-id="${sess.session_id}" 
            data-partner="${sess.partner_name}">
            ⭐ Write Review
          </button>
        `;
      }
    } else {
      actionsHtml = `<span class="badge badge-cancelled">Cancelled</span>`;
    }

    return `
      <div class="card" style="margin-bottom: 16px;">
        <div class="card-header">
          <div>
            <h3>Learning with ${sess.partner_name}</h3>
            <small class="text-muted">${sess.partner_department} • ${sess.partner_email}</small>
          </div>
          <span class="badge ${statusBadge}">${sess.status}</span>
        </div>

        <div style="margin-bottom: 12px; font-size: 0.9rem;">
          <p style="margin-bottom: 4px;">
            <strong>Skills:</strong> ${sess.offered_skill_name} ⇄ ${sess.requested_skill_name}
          </p>
          <p style="margin-bottom: 4px;">
            <strong>When:</strong> 📅 ${formatDate(sess.scheduled_at)} (${sess.duration_minutes} mins)
          </p>
          <p style="margin-bottom: 4px;">
            <strong>Mode:</strong> ${sess.meeting_mode === 'Online' ? '🌐 Online' : '📍 In Person'}
          </p>
          ${sess.meeting_details ? `<p style="margin: 0; background: var(--bg-subtle); padding: 8px; border-radius: var(--border-radius); font-size: 0.85rem;"><strong>Details:</strong> ${sess.meeting_details}</p>` : ''}
        </div>

        <div class="card-footer">
          ${actionsHtml}
        </div>
      </div>
    `;
  }).join('');

  // Attach session status events
  container.querySelectorAll('.session-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sessionId = btn.getAttribute('data-id');
      const targetStatus = btn.getAttribute('data-status');

      btn.disabled = true;

      const res = await apiPut(`/api/sessions/${sessionId}/status`, { status: targetStatus });

      if (res.ok && res.data.success) {
        showToast(res.data.message, 'success');
        loadSessions();
      } else {
        showToast(res.data.message || 'Status update failed.', 'error');
        btn.disabled = false;
      }
    });
  });

  // Attach open review modal events
  container.querySelectorAll('.open-review-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sessionId = btn.getAttribute('data-id');
      const partnerName = btn.getAttribute('data-partner');
      openReviewModal(sessionId, partnerName);
    });
  });
}

function setupReviewModal() {
  const modal = document.getElementById('review-modal');
  const closeBtn = document.getElementById('review-close-btn');
  const cancelBtn = document.getElementById('review-cancel-btn');
  const form = document.getElementById('review-form');

  if (closeBtn) closeBtn.addEventListener('click', closeReviewModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeReviewModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeReviewSessionId) return;

      const rating = document.getElementById('review-rating').value;
      const comment = document.getElementById('review-comment').value;

      const submitBtn = document.getElementById('review-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      const res = await apiPost('/api/reviews', {
        session_id: activeReviewSessionId,
        rating,
        comment
      });

      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';

      if (res.ok && res.data.success) {
        showToast(res.data.message, 'success');
        closeReviewModal();
        loadSessions();
      } else {
        showToast(res.data.message || 'Failed to submit review.', 'error');
      }
    });
  }
}

function openReviewModal(sessionId, partnerName) {
  activeReviewSessionId = sessionId;
  const modal = document.getElementById('review-modal');
  const partnerSpan = document.getElementById('review-partner-name');
  if (partnerSpan) partnerSpan.textContent = partnerName;
  if (modal) modal.classList.add('active');
}

function closeReviewModal() {
  const modal = document.getElementById('review-modal');
  if (modal) modal.classList.remove('active');
  activeReviewSessionId = null;
}
