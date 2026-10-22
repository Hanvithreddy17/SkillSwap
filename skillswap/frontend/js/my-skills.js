/**
 * My Skills Management Page Logic
 */

let catalogSkills = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth({ requireAuth: true });
  if (!user) return;

  loadCatalog();
  loadMySkills();
  setupAddSkillForm();
});

async function loadCatalog() {
  const res = await apiGet('/api/skills/catalog');
  if (res.ok && res.data.success) {
    catalogSkills = res.data.skills || [];
    populateCatalogSelect();
  }
}

function populateCatalogSelect() {
  const select = document.getElementById('skill-select');
  if (!select) return;

  // Group skills by category for neat presentation
  const grouped = {};
  catalogSkills.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  let optionsHtml = '<option value="">-- Select from standard catalog --</option>';
  for (const cat of Object.keys(grouped).sort()) {
    optionsHtml += `<optgroup label="${cat}">`;
    grouped[cat].forEach(s => {
      optionsHtml += `<option value="${s.skill_id}">${s.skill_name}</option>`;
    });
    optionsHtml += '</optgroup>';
  }
  optionsHtml += '<option value="CUSTOM">➕ Add custom skill not listed...</option>';

  select.innerHTML = optionsHtml;
}

function setupAddSkillForm() {
  const select = document.getElementById('skill-select');
  const customSection = document.getElementById('custom-skill-fields');
  const form = document.getElementById('add-skill-form');

  if (select && customSection) {
    select.addEventListener('change', () => {
      if (select.value === 'CUSTOM') {
        customSection.style.display = 'block';
      } else {
        customSection.style.display = 'none';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const skillVal = select.value;
      const skillType = document.getElementById('skill-type').value;
      const proficiency = document.getElementById('proficiency-level').value;
      const customName = document.getElementById('custom-name')?.value;
      const customCategory = document.getElementById('custom-category')?.value;

      if (!skillVal) {
        showToast('Please select a skill from the list.', 'error');
        return;
      }

      if (skillVal === 'CUSTOM' && (!customName || !customName.trim())) {
        showToast('Please enter the custom skill name.', 'error');
        return;
      }

      const payload = {
        skill_type: skillType,
        proficiency_level: proficiency
      };

      if (skillVal === 'CUSTOM') {
        payload.custom_skill_name = customName.trim();
        payload.category = customCategory || 'Other';
      } else {
        payload.skill_id = parseInt(skillVal, 10);
      }

      const submitBtn = document.getElementById('add-skill-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding...';

      const res = await apiPost('/api/skills/my', payload);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Skill';

      if (res.ok && res.data.success) {
        showToast(res.data.message, 'success');
        form.reset();
        if (customSection) customSection.style.display = 'none';
        loadMySkills();
        // Reload catalog in case a custom skill was added
        if (skillVal === 'CUSTOM') loadCatalog();
      } else {
        showToast(res.data.message || 'Failed to add skill.', 'error');
      }
    });
  }
}

async function loadMySkills() {
  const res = await apiGet('/api/skills/my');
  if (!res.ok || !res.data.success) {
    showToast('Failed to load your skills.', 'error');
    return;
  }

  const { offered, wanted } = res.data;

  renderSkillsList('offered-list', 'offered-empty', offered, 'OFFER');
  renderSkillsList('wanted-list', 'wanted-empty', wanted, 'LEARN');
}

function renderSkillsList(containerId, emptyId, skills, type) {
  const container = document.getElementById(containerId);
  const emptyState = document.getElementById(emptyId);

  if (!container) return;

  if (skills.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = skills.map(s => {
    const badgeClass = type === 'OFFER' ? 'badge-offer' : 'badge-learn';
    const typeLabel = type === 'OFFER' ? 'Can Teach' : 'Wants to Learn';

    return `
      <div class="card" style="margin-bottom: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <h3 style="margin: 0; font-size: 1.1rem;">${s.skill_name}</h3>
              <span class="badge ${badgeClass}">${s.category}</span>
            </div>
            <p style="margin: 0 0 6px 0; font-size: 0.85rem; color: var(--text-muted);">
              Proficiency: <strong>${s.proficiency_level}</strong>
            </p>
            ${s.description ? `<p style="margin: 0; font-size: 0.8rem; color: var(--text-light);">${s.description}</p>` : ''}
          </div>
          <button class="btn btn-outline btn-sm delete-skill-btn" 
            data-id="${s.user_skill_id}" 
            data-name="${s.skill_name}"
            style="color: var(--danger); border-color: #fecaca;">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach delete listeners
  container.querySelectorAll('.delete-skill-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userSkillId = btn.getAttribute('data-id');
      const skillName = btn.getAttribute('data-name');

      if (!confirm(`Are you sure you want to remove "${skillName}" from your profile?`)) {
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Removing...';

      const res = await apiDelete(`/api/skills/my/${userSkillId}`);

      if (res.ok && res.data.success) {
        showToast(res.data.message, 'success');
        loadMySkills();
      } else {
        showToast(res.data.message || 'Could not delete skill.', 'error');
        btn.disabled = false;
        btn.textContent = 'Remove';
      }
    });
  });
}
