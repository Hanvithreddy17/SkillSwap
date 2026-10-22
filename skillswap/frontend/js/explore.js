/**
 * Explore Skills & Reciprocal Matching Page Logic
 */

let myOfferedSkills = [];
let activeTargetListing = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth({ requireAuth: true });
  if (!user) return;

  // Pre-load user's own offered skills for the exchange request modal
  loadMyOfferedSkills();

  // Setup tabs
  setupTabs();

  // Setup filter listeners
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const levelFilter = document.getElementById('level-filter');

  if (searchInput) searchInput.addEventListener('input', debounce(loadExploreListings, 300));
  if (categoryFilter) categoryFilter.addEventListener('change', loadExploreListings);
  if (levelFilter) levelFilter.addEventListener('change', loadExploreListings);

  // Setup exchange modal
  setupExchangeModal();

  // Check URL params for active tab (e.g. ?tab=matches)
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam === 'matches') {
    switchTab('matches');
  } else {
    loadExploreListings();
  }
});

function setupTabs() {
  const tabExplore = document.getElementById('tab-btn-explore');
  const tabMatches = document.getElementById('tab-btn-matches');

  if (tabExplore) {
    tabExplore.addEventListener('click', () => switchTab('explore'));
  }
  if (tabMatches) {
    tabMatches.addEventListener('click', () => switchTab('matches'));
  }
}

function switchTab(tabName) {
  const tabExploreBtn = document.getElementById('tab-btn-explore');
  const tabMatchesBtn = document.getElementById('tab-btn-matches');
  const paneExplore = document.getElementById('pane-explore');
  const paneMatches = document.getElementById('pane-matches');
  const filterBar = document.getElementById('filter-bar');

  if (tabName === 'matches') {
    tabMatchesBtn.classList.add('active');
    tabExploreBtn.classList.remove('active');
    paneMatches.classList.add('active');
    paneExplore.classList.remove('active');
    if (filterBar) filterBar.style.display = 'none';
    loadReciprocalMatches();
  } else {
    tabExploreBtn.classList.add('active');
    tabMatchesBtn.classList.remove('active');
    paneExplore.classList.add('active');
    paneMatches.classList.remove('active');
    if (filterBar) filterBar.style.display = 'flex';
    loadExploreListings();
  }
}

async function loadMyOfferedSkills() {
  const res = await apiGet('/api/skills/my');
  if (res.ok && res.data.success) {
    myOfferedSkills = res.data.offered || [];
  }
}

/**
 * Load general explore listings
 */
async function loadExploreListings() {
  const search = document.getElementById('search-input')?.value || '';
  const category = document.getElementById('category-filter')?.value || 'All';
  const proficiency = document.getElementById('level-filter')?.value || 'All';

  const container = document.getElementById('explore-grid');
  const emptyState = document.getElementById('explore-empty');
  if (!container) return;

  container.innerHTML = '<p class="text-muted">Loading explore listings...</p>';

  const params = new URLSearchParams({ search, category, proficiency });
  const res = await apiGet(`/api/skills/explore?${params.toString()}`);

  if (!res.ok || !res.data.success) {
    container.innerHTML = '<p class="text-muted">Error loading skills. Please try again.</p>';
    return;
  }

  const listings = res.data.listings || [];

  if (listings.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = listings.map(item => {
    // Format wanted skills tags
    const wantedTags = item.wantedSkills && item.wantedSkills.length > 0
      ? item.wantedSkills.map(w => `<span class="badge badge-learn">${w.skill_name}</span>`).join(' ')
      : '<span class="text-muted" style="font-size:0.8rem">Open to suggestions</span>';

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3>${item.skill_name}</h3>
            <span class="badge badge-offer">${item.category}</span>
            <span class="badge badge-level">${item.proficiency_level}</span>
          </div>
        </div>

        <p style="font-size: 0.9rem; margin-bottom: 12px;">
          ${item.description || 'No description provided.'}
        </p>

        <div style="background-color: var(--bg-subtle); padding: 10px; border-radius: var(--border-radius); margin-bottom: 12px;">
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">
            LOOKING TO LEARN:
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${wantedTags}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 0.85rem; color: var(--text-muted);">
          <div>
            <strong>${item.student_name}</strong><br>
            <span>${item.department} (${item.year_of_study})</span>
          </div>
          <button class="btn btn-primary btn-sm request-btn" 
            data-userskillid="${item.user_skill_id}"
            data-userid="${item.user_id}"
            data-studentname="${item.student_name}"
            data-skillname="${item.skill_name}">
            Request Swap
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach button events
  document.querySelectorAll('.request-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openExchangeModal({
        userSkillId: btn.getAttribute('data-userskillid'),
        userId: btn.getAttribute('data-userid'),
        studentName: btn.getAttribute('data-studentname'),
        skillName: btn.getAttribute('data-skillname')
      });
    });
  });
}

/**
 * Load Reciprocal Matches
 */
async function loadReciprocalMatches() {
  const container = document.getElementById('matches-container');
  const emptyState = document.getElementById('matches-empty');
  if (!container) return;

  container.innerHTML = '<p class="text-muted">Analyzing mutual skills...</p>';

  const res = await apiGet('/api/matches/reciprocal');

  if (!res.ok || !res.data.success) {
    container.innerHTML = '<p class="text-muted">Error calculating reciprocal matches.</p>';
    return;
  }

  const { matches, hasRequirements, message } = res.data;

  if (!hasRequirements) {
    container.innerHTML = `
      <div class="alert alert-info">
        ${message}
        <br><br>
        <a href="/my-skills.html" class="btn btn-primary btn-sm">Manage My Skills</a>
      </div>
    `;
    return;
  }

  if (matches.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = matches.map(match => {
    let actionHtml = '';

    if (match.requestStatus === 'Pending') {
      actionHtml = `<span class="badge badge-pending">Exchange Request Sent (${match.requestStatus})</span>`;
    } else if (match.requestStatus === 'Accepted') {
      actionHtml = `<span class="badge badge-accepted">Exchange Accepted!</span> <a href="/sessions.html" class="btn btn-outline btn-sm">Schedule Session</a>`;
    } else {
      actionHtml = `
        <button class="btn btn-primary btn-sm mutual-swap-btn"
          data-peerid="${match.peer_id}"
          data-peername="${match.peer_name}"
          data-reqskillid="${match.peer_offered_user_skill_id}"
          data-offskillid="${match.my_offered_user_skill_id}"
          data-reqname="${match.teach_you_skill_name}"
          data-offname="${match.you_teach_skill_name}">
          Connect & Swap
        </button>
      `;
    }

    return `
      <div class="match-card">
        <div class="match-header">
          <div>
            <h3>${match.peer_name}</h3>
            <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">
              ${match.peer_department} • ${match.peer_year}
            </p>
          </div>
          <span class="badge badge-accepted">Mutual Reciprocal Match</span>
        </div>

        <div class="match-body">
          <div class="match-exchange-box">
            <span class="badge badge-offer" style="margin-bottom: 6px;">You will learn</span>
            <h4 style="font-size: 1.05rem; margin-bottom: 4px;">${match.teach_you_skill_name}</h4>
            <p style="font-size: 0.8rem; margin: 0; color: var(--text-muted);">
              Taught by ${match.peer_name} (${match.peer_proficiency})
            </p>
          </div>

          <div class="match-exchange-box">
            <span class="badge badge-learn" style="margin-bottom: 6px;">You will teach</span>
            <h4 style="font-size: 1.05rem; margin-bottom: 4px;">${match.you_teach_skill_name}</h4>
            <p style="font-size: 0.8rem; margin: 0; color: var(--text-muted);">
              Your skill level: ${match.my_proficiency}
            </p>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <p style="font-size: 0.85rem; margin: 0; color: var(--text-muted);">
            ${match.peer_bio ? `"${match.peer_bio}"` : ''}
          </p>
          <div>${actionHtml}</div>
        </div>
      </div>
    `;
  }).join('');

  // Attach mutual swap buttons
  document.querySelectorAll('.mutual-swap-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const peerId = btn.getAttribute('data-peerid');
      const reqSkillId = btn.getAttribute('data-reqskillid');
      const offSkillId = btn.getAttribute('data-offskillid');
      const reqName = btn.getAttribute('data-reqname');
      const offName = btn.getAttribute('data-offname');

      btn.disabled = true;
      btn.textContent = 'Sending...';

      const res = await apiPost('/api/requests', {
        recipient_id: peerId,
        requested_skill_id: reqSkillId,
        offered_skill_id: offSkillId,
        message: `Hi! We have a reciprocal match: I can teach you ${offName} in exchange for learning ${reqName}. Let's connect!`
      });

      if (res.ok && res.data.success) {
        showToast('Reciprocal exchange request sent successfully!', 'success');
        loadReciprocalMatches();
      } else {
        showToast(res.data.message || 'Failed to send request.', 'error');
        btn.disabled = false;
        btn.textContent = 'Connect & Swap';
      }
    });
  });
}

/**
 * Exchange Modal Handlers
 */
function setupExchangeModal() {
  const modalOverlay = document.getElementById('exchange-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const form = document.getElementById('exchange-form');

  if (closeBtn) closeBtn.addEventListener('click', closeExchangeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeExchangeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeTargetListing) return;

      const myOfferedSkillId = document.getElementById('modal-offer-select')?.value;
      const message = document.getElementById('modal-message')?.value;

      if (!myOfferedSkillId) {
        showToast('Please select a skill you can offer in return.', 'error');
        return;
      }

      const submitBtn = document.getElementById('modal-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending Request...';

      const res = await apiPost('/api/requests', {
        recipient_id: activeTargetListing.userId,
        requested_skill_id: activeTargetListing.userSkillId,
        offered_skill_id: myOfferedSkillId,
        message
      });

      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Request';

      if (res.ok && res.data.success) {
        showToast('Exchange request sent successfully!', 'success');
        closeExchangeModal();
      } else {
        showToast(res.data.message || 'Failed to send exchange request.', 'error');
      }
    });
  }
}

function openExchangeModal(listing) {
  activeTargetListing = listing;
  const modalOverlay = document.getElementById('exchange-modal');
  const targetStudentSpan = document.getElementById('modal-student-name');
  const targetSkillSpan = document.getElementById('modal-skill-name');
  const offerSelect = document.getElementById('modal-offer-select');
  const noOffersWarning = document.getElementById('modal-no-offers-warning');
  const submitBtn = document.getElementById('modal-submit-btn');

  if (targetStudentSpan) targetStudentSpan.textContent = listing.studentName;
  if (targetSkillSpan) targetSkillSpan.textContent = listing.skillName;

  if (myOfferedSkills.length === 0) {
    if (offerSelect) offerSelect.style.display = 'none';
    if (noOffersWarning) noOffersWarning.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;
  } else {
    if (offerSelect) {
      offerSelect.style.display = 'block';
      offerSelect.innerHTML = '<option value="">-- Choose one of your offered skills --</option>' +
        myOfferedSkills.map(s => `
          <option value="${s.user_skill_id}">${s.skill_name} (${s.proficiency_level})</option>
        `).join('');
    }
    if (noOffersWarning) noOffersWarning.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }

  if (modalOverlay) modalOverlay.classList.add('active');
}

function closeExchangeModal() {
  const modalOverlay = document.getElementById('exchange-modal');
  if (modalOverlay) modalOverlay.classList.remove('active');
  activeTargetListing = null;
}

function debounce(func, wait) {
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
