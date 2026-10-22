/**
 * Student Profile Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth({ requireAuth: true });
  if (!user) return;

  loadProfile();
  setupEditProfileForm();
});

async function loadProfile() {
  const res = await apiGet('/api/users/profile');
  if (!res.ok || !res.data.success) {
    showToast('Failed to load profile.', 'error');
    return;
  }

  const { profile } = res.data;

  // Fill in display values
  setText('profile-name', profile.name);
  setText('profile-email', profile.email);
  setText('profile-dept-year', `${profile.department} • ${profile.year_of_study}`);
  setText('profile-bio', profile.bio || 'No bio written yet. Click "Edit Profile" below to introduce yourself!');
  setText('profile-joined', formatDate(profile.created_at));

  // Rating and reviews summary
  const ratingBox = document.getElementById('profile-rating-summary');
  if (ratingBox) {
    if (profile.totalReviews > 0) {
      ratingBox.innerHTML = `
        <span style="font-size: 1.4rem; font-weight: bold; color: #d97706;">⭐ ${profile.avgRating} / 5</span>
        <span class="text-muted" style="font-size: 0.9rem;">(${profile.totalReviews} peer review${profile.totalReviews > 1 ? 's' : ''})</span>
      `;
    } else {
      ratingBox.innerHTML = `<span class="text-muted" style="font-size: 0.9rem;">No reviews yet. Complete a study session to earn reviews!</span>`;
    }
  }

  // Pre-fill edit form
  setValue('edit-name', profile.name);
  setValue('edit-department', profile.department);
  setValue('edit-year', profile.year_of_study);
  setValue('edit-bio', profile.bio || '');

  // Render offered skills
  renderBadgeList('profile-offered-skills', profile.offeredSkills, 'badge-offer');
  renderBadgeList('profile-wanted-skills', profile.wantedSkills, 'badge-learn');

  // Render reviews
  renderReviews(profile.reviews);
}

function renderBadgeList(containerId, skills, badgeClass) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!skills || skills.length === 0) {
    container.innerHTML = '<span class="text-muted" style="font-size: 0.85rem;">None listed yet.</span>';
    return;
  }

  container.innerHTML = skills.map(s => `
    <span class="badge ${badgeClass}" style="margin: 3px 2px; font-size: 0.85rem; padding: 4px 10px;">
      ${s.skill_name} (${s.proficiency_level})
    </span>
  `).join('');
}

function renderReviews(reviews) {
  const container = document.getElementById('profile-reviews-list');
  const emptyState = document.getElementById('profile-reviews-empty');
  if (!container) return;

  if (!reviews || reviews.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = reviews.map(r => {
    const stars = '⭐'.repeat(r.rating);
    return `
      <div class="card" style="margin-bottom: 12px; padding: 14px; background: #fafafa;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div>
            <strong>${r.reviewer_name}</strong>
            <small class="text-muted">(${r.reviewer_department})</small>
          </div>
          <span style="font-size: 0.9rem;">${stars} <strong>${r.rating}/5</strong></span>
        </div>
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-main);">
          ${r.comment ? `"${r.comment}"` : '<em>No written comment</em>'}
        </p>
        <div style="text-align: right; margin-top: 4px;">
          <small class="text-muted" style="font-size: 0.75rem;">${formatDate(r.created_at)}</small>
        </div>
      </div>
    `;
  }).join('');
}

function setupEditProfileForm() {
  const form = document.getElementById('edit-profile-form');
  const toggleBtn = document.getElementById('toggle-edit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const editContainer = document.getElementById('edit-profile-container');

  if (toggleBtn && editContainer) {
    toggleBtn.addEventListener('click', () => {
      editContainer.style.display = editContainer.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (cancelBtn && editContainer) {
    cancelBtn.addEventListener('click', () => {
      editContainer.style.display = 'none';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('edit-name').value;
      const department = document.getElementById('edit-department').value;
      const year_of_study = document.getElementById('edit-year').value;
      const bio = document.getElementById('edit-bio').value;

      const submitBtn = document.getElementById('save-profile-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      const res = await apiPut('/api/users/profile', {
        name,
        department,
        year_of_study,
        bio
      });

      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';

      if (res.ok && res.data.success) {
        showToast('Profile updated successfully!', 'success');
        if (editContainer) editContainer.style.display = 'none';
        loadProfile();
        // Update nav
        checkAuth();
      } else {
        showToast(res.data.message || 'Failed to update profile.', 'error');
      }
    });
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
