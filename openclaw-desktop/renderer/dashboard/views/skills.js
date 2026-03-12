/**
 * Dashboard View: Skills
 * Clean card grid showing active skills the agent can use.
 */

export async function renderSkillsView(container) {
  container.innerHTML = `
    <div class="dashboard-view-header">
      <h1 class="dashboard-title">Skills</h1>
      <p class="dashboard-subtitle" id="skills-subtitle">Loading…</p>
    </div>
    <div id="skills-content" class="skills-content">
      <div class="skills-loading">Fetching skills…</div>
    </div>
  `;

  await loadSkills();
}

async function loadSkills() {
  const content = document.getElementById("skills-content");
  const subtitle = document.getElementById("skills-subtitle");

  // Show loading state immediately
  subtitle.textContent = "Loading…";
  content.innerHTML = `<div class="skills-loading">Fetching skills…</div>`;

  try {
    const skills = await window.openclaw.skills.list();

    if (skills.length === 0) {
      subtitle.textContent = "No skills available";
      content.innerHTML = `
        <div class="skills-empty">
          <p>No active skills found.</p>
          <p>Install the OpenClaw CLI to enable skills.</p>
        </div>
      `;
      return;
    }

    subtitle.textContent = `${skills.length} active`;

    content.innerHTML = `
      <div class="skill-create-banner">
        <div class="skill-create-text">
          <span class="skill-create-icon">✨</span>
          <div>
            <strong>Create your own skill</strong>
            <p>Just ask your agent — say something like <em>"Create a skill that summarizes my emails every morning"</em> and it will build one for you.</p>
          </div>
        </div>
        <a class="skill-create-link" id="btn-skill-docs">Learn more →</a>
      </div>
      <div class="skills-grid">
        ${skills.map(renderSkillCard).join("")}
      </div>
      <button class="skills-refresh-btn" id="btn-refresh-skills">🔄 Refresh</button>
    `;

    document.getElementById("btn-refresh-skills").addEventListener("click", loadSkills);
    document.getElementById("btn-skill-docs").addEventListener("click", () => {
      window.openclaw.openExternal("https://docs.openclaw.ai/skills");
    });
  } catch {
    subtitle.textContent = "Could not load skills";
    content.innerHTML = `
      <div class="skills-empty">
        <p>Failed to fetch skills.</p>
        <button class="skills-refresh-btn" id="btn-refresh-skills">🔄 Retry</button>
      </div>
    `;
    document.getElementById("btn-refresh-skills").addEventListener("click", loadSkills);
  }
}

function renderSkillCard(skill) {
  const desc = shortDesc(skill.description);
  return `
    <div class="skill-card">
      <span class="skill-card-emoji">${skill.emoji}</span>
      <span class="skill-card-name">${esc(skill.name)}</span>
      <span class="skill-card-desc">${esc(desc)}</span>
    </div>
  `;
}

function shortDesc(desc) {
  if (!desc) return "";
  const first = desc.split(/[.:]/)[0].trim();
  return first.length > 50 ? first.slice(0, 49) + "…" : first;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
