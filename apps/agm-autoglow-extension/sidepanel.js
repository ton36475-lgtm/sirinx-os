const demoProject = {
  id: "agm-autoglow-demo-001",
  brandName: "AGM AUTOGLOW",
  productName: "ข้าวหมูแดงเตาถ่านลุงแบงค์",
  scenes: [
    {
      id: "scene-001",
      sceneNo: 1,
      hook: "Hook shot",
      prompt:
        "Ultra realistic cinematic Thai street food commercial, close-up of juicy charcoal roasted red pork being sliced on a wooden board, warm golden light, steam rising gently, macro close-up, slow push-in, vertical 9:16, human-reviewed assisted workflow",
      voiceoverText: "หมูแดงเตาถ่านแท้ ๆ หอม ฉ่ำ นุ่ม แบบที่กินแล้วจำได้ทันที",
      captionText: "ข้าวหมูแดงเตาถ่าน ฉ่ำทุกคำ หอมทุกชิ้น",
      status: "draft"
    }
  ]
};

const queueEl = document.getElementById("queue");
const pageStateEl = document.getElementById("page-state");
const loadDemoButton = document.getElementById("load-demo");
const exportButton = document.getElementById("export-pack");

loadDemoButton.addEventListener("click", async () => {
  await chrome.storage.local.set({ autoglowProject: demoProject });
  renderProject(demoProject);
});

exportButton.addEventListener("click", async () => {
  const { autoglowProject } = await chrome.storage.local.get("autoglowProject");
  const project = autoglowProject || demoProject;
  const markdown = buildMarkdown(project);
  await navigator.clipboard.writeText(markdown);
  exportButton.textContent = "Copied Pack";
  setTimeout(() => {
    exportButton.textContent = "Export Pack";
  }, 1400);
});

chrome.storage.local.get(["autoglowProject", "flowPageState"], ({ autoglowProject, flowPageState }) => {
  renderPageState(flowPageState);
  renderProject(autoglowProject);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.flowPageState) renderPageState(changes.flowPageState.newValue);
  if (changes.autoglowProject) renderProject(changes.autoglowProject.newValue);
});

function renderPageState(state) {
  if (!state) {
    pageStateEl.textContent = "Open Google Flow, then click the extension icon.";
    return;
  }

  pageStateEl.innerHTML = "";
  const rows = [
    `Flow page: ${state.isFlowPage ? "detected" : "not detected"}`,
    `Workspace text: ${state.hasPromptWorkspace ? "prompt area visible" : "not confirmed"}`,
    `Checked: ${new Date(state.detectedAt).toLocaleString()}`
  ];

  for (const row of rows) {
    const div = document.createElement("div");
    div.textContent = row;
    pageStateEl.appendChild(div);
  }
}

function renderProject(project) {
  queueEl.innerHTML = "";
  if (!project?.scenes?.length) {
    queueEl.innerHTML = '<div class="empty">No project loaded yet. Load demo or import a delivery pack from the AUTOGLOW dashboard.</div>';
    return;
  }

  for (const scene of project.scenes) {
    queueEl.appendChild(renderScene(project, scene));
  }
}

function renderScene(project, scene) {
  const card = document.createElement("article");
  card.className = "scene-card";

  const top = document.createElement("div");
  top.className = "scene-top";

  const title = document.createElement("div");
  title.className = "scene-title";
  title.textContent = `Scene ${String(scene.sceneNo).padStart(2, "0")} — ${scene.hook}`;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = scene.status;

  const prompt = document.createElement("p");
  prompt.className = "prompt";
  prompt.textContent = scene.prompt;

  const actions = document.createElement("div");
  actions.className = "scene-actions";

  const copyButton = document.createElement("button");
  copyButton.className = "primary";
  copyButton.textContent = "Copy Prompt";
  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(scene.prompt);
    await updateSceneStatus(project, scene.id, "copied");
  });

  const doneButton = document.createElement("button");
  doneButton.textContent = "Mark Done";
  doneButton.addEventListener("click", async () => {
    await updateSceneStatus(project, scene.id, "done");
  });

  actions.append(copyButton, doneButton);
  top.append(title, badge);
  card.append(top, prompt, actions);
  return card;
}

async function updateSceneStatus(project, sceneId, status) {
  const nextProject = {
    ...project,
    scenes: project.scenes.map((scene) => (scene.id === sceneId ? { ...scene, status } : scene))
  };
  await chrome.storage.local.set({ autoglowProject: nextProject });
  renderProject(nextProject);
}

function buildMarkdown(project) {
  const scenes = project.scenes
    .map(
      (scene) => `### Scene ${String(scene.sceneNo).padStart(2, "0")} — ${scene.hook}

- Status: ${scene.status}
- Prompt: ${scene.prompt}
- Voiceover: ${scene.voiceoverText}
- Caption: ${scene.captionText}`
    )
    .join("\n\n");

  return `# AGM AUTOGLOW Delivery Pack

- Project: ${project.id}
- Brand: ${project.brandName}
- Product: ${project.productName}

## Storyboard

${scenes}

## Safety Note

Human-reviewed assisted production only. No credit bypass, no hidden automation, no session or token access.`;
}
