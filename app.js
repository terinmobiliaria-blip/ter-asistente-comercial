const state = {
  project: "",
  profile: "Todos",
  interest: "Todos",
  query: "",
  limit: 5
};

const profileOptions = ["Todos", "Familia", "Inversionista", "Profesional"];
const interestOptions = [
  "Todos",
  "Financiero",
  "Sostenibilidad",
  "Areas Comunes",
  "Tecnologia",
  "Diseno",
  "Acabados",
  "Seguridad"
];

const labels = {
  "Areas Comunes": "Áreas comunes",
  "Tecnologia": "Tecnología",
  "Diseno": "Diseño"
};

const projectSelect = document.querySelector("#projectSelect");
const profileButtons = document.querySelector("#profileButtons");
const interestButtons = document.querySelector("#interestButtons");
const searchInput = document.querySelector("#searchInput");
const limitSelect = document.querySelector("#limitSelect");
const resultTitle = document.querySelector("#resultTitle");
const resultCount = document.querySelector("#resultCount");
const quickSummary = document.querySelector("#quickSummary");
const cards = document.querySelector("#cards");
const shareText = document.querySelector("#shareText");
const copyShare = document.querySelector("#copyShare");
const resetFilters = document.querySelector("#resetFilters");

const allArguments = Array.isArray(window.TER_ARGUMENTOS) ? window.TER_ARGUMENTOS : [];

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function makeButton(text, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = active ? "chip active" : "chip";
  button.textContent = labels[text] || text;
  button.addEventListener("click", onClick);
  return button;
}

function init() {
  const projects = unique(allArguments.filter(item => item.kind === "project").map(item => item.project));
  projectSelect.innerHTML = projects.map(project => `<option value="${project}">${project}</option>`).join("");
  state.project = projects[0] || "";

  profileOptions.forEach(profile => {
    profileButtons.appendChild(makeButton(profile, profile === state.profile, () => {
      state.profile = profile;
      renderControls();
      render();
    }));
  });

  interestOptions.forEach(interest => {
    interestButtons.appendChild(makeButton(interest, interest === state.interest, () => {
      state.interest = interest;
      renderControls();
      render();
    }));
  });

  projectSelect.addEventListener("change", event => {
    state.project = event.target.value;
    render();
  });

  searchInput.addEventListener("input", event => {
    state.query = event.target.value;
    render();
  });

  limitSelect.addEventListener("change", event => {
    state.limit = Number(event.target.value);
    render();
  });

  copyShare.addEventListener("click", async () => {
    try {
      await copyText(shareText.value);
      copyShare.textContent = "Copiado";
      setTimeout(() => (copyShare.textContent = "Copiar mensaje"), 1200);
    } catch (error) {
      copyShare.textContent = "Selecciona el texto";
      setTimeout(() => (copyShare.textContent = "Copiar mensaje"), 1200);
    }
  });

  resetFilters.addEventListener("click", () => {
    state.profile = "Todos";
    state.interest = "Todos";
    state.query = "";
    state.limit = 5;
    searchInput.value = "";
    limitSelect.value = "5";
    renderControls();
    render();
  });

  renderControls();
  render();
}

function renderControls() {
  [...profileButtons.children].forEach((button, index) => {
    button.classList.toggle("active", profileOptions[index] === state.profile);
  });
  [...interestButtons.children].forEach((button, index) => {
    button.classList.toggle("active", interestOptions[index] === state.interest);
  });
}

function categoryMatch(item) {
  if (state.interest === "Todos") return true;
  const category = normalize(item.category);
  const text = normalize(`${item.feature} ${item.advantage} ${item.benefit} ${item.objection}`);
  const interest = normalize(state.interest);
  if (interest === "seguridad") return text.includes("seguridad") || text.includes("camara") || text.includes("smart");
  return category === interest || text.includes(interest);
}

function profileMatch(item) {
  if (state.profile === "Todos") return true;
  const profile = normalize(item.profile);
  return profile.includes(normalize(state.profile)) || profile.includes("todos");
}

function searchMatch(item) {
  const query = normalize(state.query);
  if (!query) return true;
  const text = normalize(Object.values(item).join(" "));
  return query.split(/\s+/).every(word => text.includes(word));
}

function scoreItem(item) {
  let score = 0;
  if (item.project === state.project || item.kind === "finish") score += 40;
  if (profileMatch(item)) score += 25;
  if (categoryMatch(item)) score += 20;
  if (normalize(item.profile).includes(normalize(state.profile)) && state.profile !== "Todos") score += 8;
  if (item.kind === "finish" && normalize(state.interest) === "acabados") score += 10;
  if (state.query && searchMatch(item)) score += 10;
  if (item.kind === "finish") score += 5;
  return Math.min(score, 100);
}

function scoreLevel(score) {
  if (score >= 85) return "high";
  if (score >= 65) return "medium";
  return "low";
}

function getResults() {
  const base = allArguments.filter(item => item.project === state.project || item.kind === "finish");
  const exact = base.filter(item => profileMatch(item) && categoryMatch(item) && searchMatch(item));
  const sameInterest = base.filter(item => categoryMatch(item) && searchMatch(item));
  const sameProfile = base.filter(item => profileMatch(item) && searchMatch(item));
  const anyProjectArgument = base.filter(item => searchMatch(item));
  const filtered = exact.length ? exact : sameInterest.length ? sameInterest : sameProfile.length ? sameProfile : anyProjectArgument;

  return filtered
    .map(item => ({ ...item, score: scoreItem(item) }))
    .sort((a, b) => b.score - a.score || a.project.localeCompare(b.project))
    .slice(0, state.limit);
}

function render() {
  const results = getResults();
  const visibleLabel = state.profile === "Todos" ? "todo perfil" : state.profile.toLowerCase();
  resultTitle.textContent = `${state.project} para ${visibleLabel}`;
  resultCount.textContent = results.length === 1 ? "1 argumento" : `${results.length} argumentos`;

  renderSummary(results);
  renderCards(results);
  renderShare(results);
}

function renderSummary(results) {
  const hasExactProfile = results.some(item => profileMatch(item));
  const categories = state.interest === "Acabados" && results.some(item => item.kind === "finish")
    ? "Acabados comunes TER"
    : unique(results.map(item => item.category)).slice(0, 3).join(", ") || "Sin resultados";
  const profiles = state.profile !== "Todos" && !hasExactProfile
    ? `${state.profile} (adaptable)`
    : state.profile === "Todos"
    ? unique(results.map(item => item.profile)).slice(0, 3).join(", ") || "Sin resultados"
    : state.profile;
  const firstBenefit = results[0] ? getDisplayBenefit(results[0]) : "Ajusta los filtros para encontrar el argumento mas fuerte.";
  const shortBenefit = trimText(firstBenefit, 95);
  const needsMore = firstBenefit.length > shortBenefit.length;
  quickSummary.innerHTML = `
    <div class="summary-box"><span>Foco recomendado</span><strong>${categories}</strong></div>
    <div class="summary-box"><span>Perfil elegido</span><strong>${profiles}</strong></div>
    <div class="summary-box summary-benefit">
      <span>Beneficio clave</span>
      <strong id="benefitSummary" data-short="${escapeHtml(shortBenefit)}" data-full="${escapeHtml(firstBenefit)}">${escapeHtml(shortBenefit)}</strong>
      ${needsMore ? '<button class="read-more" id="toggleBenefit" type="button">Leer más</button>' : ""}
    </div>
  `;

  const toggleBenefit = document.querySelector("#toggleBenefit");
  const benefitSummary = document.querySelector("#benefitSummary");
  if (toggleBenefit && benefitSummary) {
    toggleBenefit.addEventListener("click", () => {
      const expanded = benefitSummary.classList.toggle("expanded");
      benefitSummary.textContent = expanded ? benefitSummary.dataset.full : benefitSummary.dataset.short;
      toggleBenefit.textContent = expanded ? "Leer menos" : "Leer más";
    });
  }
}

function renderCards(results) {
  if (!results.length) {
    cards.innerHTML = `<div class="empty">No hay argumentos con esos filtros. Prueba con otro interes o limpia la busqueda.</div>`;
    return;
  }

  cards.innerHTML = results.map((item, index) => {
    const displayProject = item.kind === "finish" ? state.project : item.project;
    const scopeTag = item.kind === "finish" ? "Acabado comun TER" : item.category;
    const displayProfile = state.profile !== "Todos" && normalize(item.profile).includes("todos")
      ? state.profile
      : item.profile;
    return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${index + 1}. ${escapeHtml(item.feature)}</h3>
          <div class="tag-row">
            <span class="tag">${escapeHtml(displayProject)}</span>
            <span class="tag">${escapeHtml(scopeTag)}</span>
            <span class="tag">${escapeHtml(displayProfile)}</span>
          </div>
        </div>
        <div class="score ${scoreLevel(item.score)}">Ideal<br>${item.score}%</div>
      </div>
      <div class="card-grid">
        <div class="argument-block">
          <span>Ventaja</span>
          <p>${escapeHtml(item.advantage)}</p>
        </div>
        <div class="argument-block">
          <span>Beneficio para cliente</span>
          <p>${escapeHtml(getDisplayBenefit(item))}</p>
        </div>
        <div class="argument-block full">
          <span>Frase comercial</span>
          <p>${escapeHtml(item.speech)}</p>
        </div>
        <div class="argument-block full">
          <span>Objecion que neutraliza</span>
          <p>${escapeHtml(item.objection)}</p>
        </div>
      </div>
      <button class="mini-action" type="button" data-copy="${index}">Copiar solo este argumento</button>
    </article>
  `;
  }).join("");

  document.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", async event => {
      const item = results[Number(event.currentTarget.dataset.copy)];
      try {
        await copyText(argumentToText(item));
        event.currentTarget.textContent = "Copiado";
        setTimeout(() => (event.currentTarget.textContent = "Copiar solo este argumento"), 1200);
      } catch (error) {
        event.currentTarget.textContent = "No se pudo copiar";
        setTimeout(() => (event.currentTarget.textContent = "Copiar solo este argumento"), 1200);
      }
    });
  });
}

function renderShare(results) {
  if (!results.length) {
    shareText.value = "No hay argumentos para compartir con esos filtros.";
    return;
  }

  const top = results.slice(0, 3);
  const intro = `Hola, te comparto lo mas relevante de ${state.project} segun lo que estas buscando:`;
  const lines = top.map((item, index) => {
    const prefix = item.kind === "finish" ? "Acabado" : item.category;
    return `${index + 1}. ${prefix} - ${item.feature}: ${getDisplayBenefit(item)}\n   ${cleanQuote(item.speech)}`;
  });
  shareText.value = `${intro}\n\n${lines.join("\n\n")}\n\nSi quieres, vemos juntos la unidad que mejor calza con tu perfil.`;
}

function argumentToText(item) {
  const project = item.kind === "finish" ? state.project : item.project;
  return `${project} - ${item.feature}\n\nVentaja: ${item.advantage}\n\nBeneficio: ${getDisplayBenefit(item)}\n\nFrase: ${cleanQuote(item.speech)}\n\nObjecion: ${item.objection}`;
}

function getDisplayBenefit(item) {
  const base = String(item.benefit || "").trim();
  if (item.kind !== "finish" || state.profile === "Todos") return base;

  const profile = normalize(state.profile);
  if (profile === "inversionista") {
    return `${base} Comercialmente ayuda a defender mejor el precio, reducir gastos posteriores y reforzar el valor para alquiler o reventa.`;
  }
  if (profile === "familia") {
    return `${base} Para una familia, esto significa menos mantenimiento, mas comodidad diaria y mejor resistencia al uso constante del hogar.`;
  }
  if (profile === "profesional") {
    return `${base} Para un profesional, suma una percepcion mas premium, ordenada y lista para vivir sin invertir tiempo en mejoras adicionales.`;
  }
  return base;
}

function cleanQuote(text) {
  return String(text || "").replace(/^"+|"+$/g, "");
}

function trimText(text, max) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.top = "-1000px";
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand("copy");
  helper.remove();
  if (!copied) throw new Error("copy failed");
}

init();

