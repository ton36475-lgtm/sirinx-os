import {
  DASHBOARD_STORAGE_KEY,
  buildCsvExport,
  buildExtensionHandoff,
  buildMarkdownExport,
  buildProjectMetrics,
  createDashboardProject,
  setSceneStatus,
  updateProjectFromIntake,
  updateScene
} from "./autoglow-dashboard-core.mjs";

let project = await loadProject();

const els = {
  metrics: document.querySelector("#metrics"),
  projectSummary: document.querySelector("#projectSummary"),
  storyboard: document.querySelector("#storyboardGrid"),
  statusList: document.querySelector("#statusList"),
  exportFiles: document.querySelector("#exportFiles"),
  handoffPreview: document.querySelector("#handoffPreview"),
  form: document.querySelector("#intakeForm"),
  exportMarkdown: document.querySelector("#exportMarkdown"),
  exportCsv: document.querySelector("#exportCsv"),
  copyHandoff: document.querySelector("#copyHandoff"),
  resetDemo: document.querySelector("#resetDemo"),
  toast: document.querySelector("#toast")
};

hydrateForm(project);
render();

els.form.addEventListener("input", () => {
  project = updateProjectFromIntake(project, Object.fromEntries(new FormData(els.form)));
  void persistProject(project);
  render();
});

els.exportMarkdown.addEventListener("click", () => copyText(buildMarkdownExport(project), "Markdown pack copied"));
els.exportCsv.addEventListener("click", () => copyText(buildCsvExport(project), "CSV prompt pack copied"));
els.copyHandoff.addEventListener("click", () =>
  copyText(JSON.stringify(buildExtensionHandoff(project), null, 2), "Extension handoff JSON copied")
);
els.resetDemo.addEventListener("click", () => {
  project = createDashboardProject();
  void persistProject(project);
  hydrateForm(project);
  render();
  showToast("Demo project restored");
});

async function loadProject() {
  const backendProject = await fetchJson("/api/project").catch(() => null);
  if (backendProject) {
    saveProject(backendProject);
    return backendProject;
  }

  try {
    const stored = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    return stored ? JSON.parse(stored) : createDashboardProject();
  } catch {
    return createDashboardProject();
  }
}

function saveProject(nextProject) {
  window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(nextProject));
}

async function persistProject(nextProject) {
  saveProject(nextProject);
  await fetchJson("/api/project", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(nextProject)
  }).catch(() => null);
}

function hydrateForm(nextProject) {
  els.form.elements.brandName.value = nextProject.brandName;
  els.form.elements.businessName.value = nextProject.businessName;
  els.form.elements.productName.value = nextProject.productName;
  els.form.elements.targetAudience.value = nextProject.targetAudience;
  els.form.elements.objective.value = nextProject.objective;
  els.form.elements.durationSec.value = nextProject.durationSec;
  els.form.elements.aspectRatio.value = nextProject.aspectRatio;
  els.form.elements.tone.value = nextProject.tone.join(", ");
  els.form.elements.visualStyle.value = nextProject.visualStyle;
  els.form.elements.referenceNotes.value = nextProject.referenceNotes;
}

function render() {
  renderMetrics();
  renderProjectSummary();
  renderStoryboard();
  renderStatusList();
  renderExportPack();
  renderHandoff();
}

function renderMetrics() {
  const metrics = buildProjectMetrics(project);
  const cards = [
    ["Total Projects", metrics.totalProjects, "+ local workspace"],
    ["Active Scenes", metrics.activeScenes, "storyboard cards"],
    ["Image Assets", metrics.attachedImages, "storyboard references"],
    ["Queue Status", metrics.queueInProgress, "copied or generating"],
    ["Local Sync", `${metrics.localSync}%`, "all systems in sync"]
  ];
  els.metrics.innerHTML = cards
    .map(
      ([label, value, note], index) => `<article class="metric metric-${index + 1}">
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${note}</small>
      </article>`
    )
    .join("");
}

function renderProjectSummary() {
  els.projectSummary.innerHTML = `<div class="project-media" aria-hidden="true">
      <div class="clapper">▶</div>
      <div class="cube"></div>
    </div>
    <div class="project-copy">
      <div class="project-title-row">
        <h2>Demo Product Video</h2>
        <span class="state-pill">ACTIVE</span>
      </div>
      <dl class="summary-list">
        <div><dt>Brand / Business</dt><dd>${escapeHtml(project.businessName)}</dd></div>
        <div><dt>Product Name</dt><dd>${escapeHtml(project.productName)}</dd></div>
        <div><dt>Target Audience</dt><dd>${escapeHtml(project.targetAudience)}</dd></div>
        <div><dt>Campaign Objective</dt><dd>${escapeHtml(project.objective)}</dd></div>
        <div><dt>Platform</dt><dd>${project.platform.join(" / ")}</dd></div>
        <div><dt>Duration</dt><dd>${project.durationSec} sec</dd></div>
        <div><dt>Aspect Ratio</dt><dd>${project.aspectRatio}</dd></div>
        <div><dt>Tone</dt><dd>${project.tone.join(", ")}</dd></div>
      </dl>
    </div>`;
}

function renderStoryboard() {
  els.storyboard.innerHTML = project.scenes
    .map(
      (scene) => `<article class="scene-card" data-scene-id="${scene.id}">
        <div class="scene-visual visual-${scene.sceneNo}">
          <button class="play-button" type="button" aria-label="Preview scene ${scene.sceneNo}">▶</button>
          <span class="duration">${scene.duration}</span>
        </div>
        <div class="scene-head">
          <span class="scene-no">${String(scene.sceneNo).padStart(2, "0")}</span>
          <strong>Scene ${String(scene.sceneNo).padStart(2, "0")}</strong>
          <select class="scene-status" data-field="status" aria-label="Scene ${scene.sceneNo} status">
            ${statusOptions(scene.status)}
          </select>
        </div>
        <label>Hook <input value="${escapeAttr(scene.hook)}" data-field="hook"></label>
        <label>Visual <textarea data-field="visualDescription">${escapeHtml(scene.visualDescription)}</textarea></label>
        <label>Camera <input value="${escapeAttr(scene.cameraDirection)}" data-field="cameraDirection"></label>
        <label>Motion <input value="${escapeAttr(scene.motionDirection)}" data-field="motionDirection"></label>
        <label>Voiceover <textarea data-field="voiceoverText">${escapeHtml(scene.voiceoverText)}</textarea></label>
        <label>Caption <input value="${escapeAttr(scene.captionText)}" data-field="captionText"></label>
        <div class="attachment-block">
          <div class="attachment-head">
            <strong>Image References</strong>
            <label class="upload-button">
              Attach
              <input class="scene-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
            </label>
          </div>
          <div class="attachment-grid">
            ${renderAttachments(scene)}
          </div>
        </div>
        <details>
          <summary>Prompt Preview</summary>
          <p>${escapeHtml(scene.prompt)}</p>
        </details>
      </article>`
    )
    .join("");

  els.storyboard.querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("change", (event) => {
      const card = event.target.closest("[data-scene-id]");
      const sceneId = card.dataset.sceneId;
      if (event.target.dataset.field === "status") {
        project = setSceneStatus(project, sceneId, event.target.value);
      } else {
        project = updateScene(project, sceneId, {
          [event.target.dataset.field]: event.target.value
        });
      }
      void persistProject(project);
      render();
    });
  });

  els.storyboard.querySelectorAll(".scene-image-input").forEach((input) => {
    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const card = event.target.closest("[data-scene-id]");
      await uploadSceneImage(card.dataset.sceneId, file);
      event.target.value = "";
    });
  });

  els.storyboard.querySelectorAll("[data-remove-attachment]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-scene-id]");
      await removeSceneImage(card.dataset.sceneId, event.target.dataset.removeAttachment);
    });
  });
}

function renderAttachments(scene) {
  const attachments = scene.attachments || [];
  if (!attachments.length) {
    return `<div class="attachment-empty">No images attached</div>`;
  }

  return attachments
    .map(
      (asset) => `<figure class="attachment-card">
        <img src="${escapeAttr(asset.relativeUrl)}" alt="${escapeAttr(asset.altText || asset.originalName || "Storyboard reference")}">
        <figcaption>
          <span>${escapeHtml(asset.originalName || asset.fileName)}</span>
          <button type="button" data-remove-attachment="${escapeAttr(asset.id)}">Remove</button>
        </figcaption>
      </figure>`
    )
    .join("");
}

async function uploadSceneImage(sceneId, file) {
  if (!file.type.startsWith("image/")) {
    showToast("Only image files are supported");
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const response = await fetchJson(`/api/project/scenes/${encodeURIComponent(sceneId)}/images`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      dataUrl,
      altText: file.name
    })
  });

  project = response.project;
  saveProject(project);
  render();
  showToast("Image attached to storyboard");
}

async function removeSceneImage(sceneId, assetId) {
  const response = await fetchJson(
    `/api/project/scenes/${encodeURIComponent(sceneId)}/images/${encodeURIComponent(assetId)}`,
    { method: "DELETE" }
  );
  project = response.project;
  saveProject(project);
  render();
  showToast("Image removed");
}

function renderStatusList() {
  const metrics = buildProjectMetrics(project);
  els.statusList.innerHTML = Object.entries(metrics.statusCounts)
    .map(
      ([status, count]) => `<li>
        <span class="dot dot-${status}"></span>
        <span>${status}</span>
        <strong>${count}</strong>
        <i style="--bars:${Math.max(1, count)}"></i>
      </li>`
    )
    .join("");
}

function renderExportPack() {
  const files = [
    ["project.json", JSON.stringify(project, null, 2)],
    ["storyboard.md", buildMarkdownExport(project)],
    ["prompts.csv", buildCsvExport(project)],
    ["voiceover.txt", project.scenes.map((scene) => scene.voiceoverText).join("\n")],
    ["captions.txt", project.scenes.map((scene) => scene.captionText).join("\n")],
    ["extension-handoff.json", JSON.stringify(buildExtensionHandoff(project), null, 2)]
  ];
  els.exportFiles.innerHTML = files
    .map(([name, content]) => `<li>
      <span>${name}</span>
      <small>${byteSize(content)}</small>
      <button type="button" data-file="${name}">Copy</button>
    </li>`)
    .join("");
  els.exportFiles.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const file = files.find(([name]) => name === button.dataset.file);
      copyText(file[1], `${file[0]} copied`);
    });
  });
}

function renderHandoff() {
  els.handoffPreview.textContent = JSON.stringify(buildExtensionHandoff(project), null, 2);
}

function statusOptions(selected) {
  return ["draft", "approved", "copied", "generating", "done", "failed", "needs_review"]
    .map((status) => `<option value="${status}" ${status === selected ? "selected" : ""}>${status}</option>`)
    .join("");
}

async function copyText(text, message) {
  await navigator.clipboard.writeText(text);
  showToast(message);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error || new Error("file_read_failed")));
    reader.readAsDataURL(file);
  });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 1400);
}

function byteSize(text) {
  return `${new Blob([text]).size.toLocaleString()} B`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
