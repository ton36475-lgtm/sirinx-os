export const DASHBOARD_STORAGE_KEY = "agm-autoglow-dashboard-project";

export const sceneStatuses = Object.freeze([
  "draft",
  "approved",
  "copied",
  "generating",
  "done",
  "failed",
  "needs_review"
]);

export function createDashboardProject() {
  const now = "2026-06-15T00:00:00.000Z";

  const base = {
    id: "agm-autoglow-demo-001",
    brandName: "AGM AUTOGLOW",
    businessName: "AGM AUTOGLOW",
    productName: "AutoGlow AI Suite",
    targetAudience: "นักการตลาด, ครีเอเตอร์, ทีมคอนเทนต์",
    objective: "แนะนำสินค้าและสร้างการรับรู้",
    platform: ["youtube_shorts", "reels", "tiktok"],
    durationSec: 30,
    aspectRatio: "9:16",
    tone: ["พรีเมียม", "ทันสมัย", "น่าเชื่อถือ"],
    visualStyle: "cinematic futuristic command center",
    referenceNotes: "โทนไฟฟ้าน้ำเงิน + UI mockups",
    localMode: true,
    updatedAt: now
  };

  const scenes = [
    {
      id: "scene-001",
      sceneNo: 1,
      hook: "AI that builds your video workflow",
      visualDescription: "dark command center dashboard with storyboard cards and export status panels",
      cameraDirection: "slow push-in from wide dashboard view",
      motionDirection: "parallel UI light sweep, subtle data lines, clean motion rhythm",
      voiceoverText: "เปลี่ยนไอเดียให้กลายเป็นสตอรี่บอร์ดและ prompt พร้อมผลิต",
      captionText: "AI that builds your video workflow.",
      status: "approved",
      duration: "0:00 - 0:05",
      attachments: []
    },
    {
      id: "scene-002",
      sceneNo: 2,
      hook: "From idea to storyboard in seconds",
      visualDescription: "floating storyboard panels assemble into a production timeline",
      cameraDirection: "orbit shot with clean parallax",
      motionDirection: "elements assemble in sequence, glowing connectors pulse once",
      voiceoverText: "จากไอเดีย สู่ฉาก บทพากย์ และไฟล์ส่งงานลูกค้า",
      captionText: "From idea to storyboard in seconds.",
      status: "copied",
      duration: "0:05 - 0:15",
      attachments: []
    },
    {
      id: "scene-003",
      sceneNo: 3,
      hook: "Professional voice. Local-first.",
      visualDescription: "voiceover waveform panel beside prompt compiler and export pack",
      cameraDirection: "close-up with shallow depth and precise UI framing",
      motionDirection: "waveform pulse, export checklist lights up line by line",
      voiceoverText: "ทำงานแบบ local-first ปลอดภัย และมีคนตรวจทุกขั้นตอน",
      captionText: "Professional voice. Local-first.",
      status: "needs_review",
      duration: "0:15 - 0:25",
      attachments: []
    }
  ];

  return {
    ...base,
    scenes: scenes.map((scene) => ({
      ...scene,
      prompt: compileScenePrompt(base, scene)
    }))
  };
}

export function updateProjectFromIntake(project, intake = {}) {
  const next = {
    ...project,
    brandName: intake.brandName?.trim() || project.brandName,
    businessName: intake.businessName?.trim() || project.businessName,
    productName: intake.productName?.trim() || project.productName,
    targetAudience: intake.targetAudience?.trim() || project.targetAudience,
    objective: intake.objective?.trim() || project.objective,
    visualStyle: intake.visualStyle?.trim() || project.visualStyle,
    referenceNotes: intake.referenceNotes?.trim() || project.referenceNotes,
    durationSec: Number(intake.durationSec || project.durationSec),
    aspectRatio: intake.aspectRatio || project.aspectRatio,
    tone: parseTone(intake.tone || project.tone),
    updatedAt: new Date().toISOString()
  };

  return {
    ...next,
    scenes: project.scenes.map((scene) => ({
      ...scene,
      prompt: compileScenePrompt(next, scene)
    }))
  };
}

export function buildProjectMetrics(project) {
  const statusCounts = Object.fromEntries(sceneStatuses.map((status) => [status, 0]));
  for (const scene of project.scenes) {
    statusCounts[scene.status] = (statusCounts[scene.status] || 0) + 1;
  }

  return {
    totalProjects: 1,
    activeScenes: project.scenes.length,
    exportPacks: 1,
    attachedImages: project.scenes.reduce((total, scene) => total + (scene.attachments || []).length, 0),
    queueInProgress: statusCounts.generating + statusCounts.copied,
    localSync: 100,
    statusCounts
  };
}

export function compileScenePrompt(project, scene) {
  const ratio = project.aspectRatio === "9:16" ? "vertical 9:16" : project.aspectRatio === "1:1" ? "square 1:1" : "wide 16:9";
  const platforms = platformLabel(project.platform);
  return [
    project.visualStyle,
    `product context: ${project.productName}`,
    `target audience: ${project.targetAudience}`,
    scene.visualDescription,
    scene.cameraDirection,
    scene.motionDirection,
    `${parseTone(project.tone).join(", ")} atmosphere`,
    platforms,
    ratio,
    "premium commercial composition",
    "local-first human-reviewed assisted workflow"
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMarkdownExport(project) {
  return [
    "# AGM AUTOGLOW Delivery Pack",
    "",
    `- Project: ${project.id}`,
    `- Brand: ${project.brandName}`,
    `- Product: ${project.productName}`,
    `- Audience: ${project.targetAudience}`,
    `- Objective: ${project.objective}`,
    `- Platforms: ${project.platform.join(", ")}`,
    `- Duration: ${project.durationSec}s`,
    `- Aspect Ratio: ${project.aspectRatio}`,
    "",
    "## Storyboard",
    "",
    ...project.scenes.map((scene) => [
      `### Scene ${String(scene.sceneNo).padStart(2, "0")} - ${scene.hook}`,
      "",
      `- Status: ${scene.status}`,
      `- Visual: ${scene.visualDescription}`,
      `- Camera: ${scene.cameraDirection}`,
      `- Motion: ${scene.motionDirection}`,
      `- Voiceover: ${scene.voiceoverText}`,
      `- Caption: ${scene.captionText}`,
      `- Attachments: ${(scene.attachments || []).map((asset) => asset.originalName || asset.fileName).join(", ") || "none"}`,
      "",
      "```text",
      scene.prompt,
      "```",
      ""
    ].join("\n")),
    "## Safety Note",
    "",
    "Human-reviewed assisted production only. No hidden automation, no private API replay, no provider call from this dashboard."
  ].join("\n");
}

export function buildCsvExport(project) {
  const header = "sceneNo,hook,prompt,voiceoverText,captionText,status";
  const rows = project.scenes.map((scene) =>
    [scene.sceneNo, scene.hook, scene.prompt, scene.voiceoverText, scene.captionText, scene.status]
      .map(csvCell)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export function buildExtensionHandoff(project) {
  return {
    schemaVersion: "agm-autoglow.extension-handoff.v1",
    exportedAt: new Date().toISOString(),
    targetTool: "Google Flow Assisted",
    mode: "manual-assisted",
    project: {
      id: project.id,
      brandName: project.brandName,
      productName: project.productName,
      platform: project.platform,
      aspectRatio: project.aspectRatio,
      durationSec: project.durationSec
    },
    scenes: project.scenes.map((scene) => ({
      id: scene.id,
      sceneNo: scene.sceneNo,
      hook: scene.hook,
      prompt: scene.prompt,
      voiceoverText: scene.voiceoverText,
      captionText: scene.captionText,
      status: scene.status,
      attachments: scene.attachments || []
    })),
    safety: {
      localFirst: true,
      humanReviewed: true,
      providerCall: false,
      hiddenAutomation: false,
      privateApiReplay: false
    }
  };
}

export function setSceneStatus(project, sceneId, status) {
  if (!sceneStatuses.includes(status)) {
    return project;
  }
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    scenes: project.scenes.map((scene) => (scene.id === sceneId ? { ...scene, status } : scene))
  };
}

export function updateScene(project, sceneId, fields) {
  const nextProject = {
    ...project,
    updatedAt: new Date().toISOString(),
    scenes: project.scenes.map((scene) => (scene.id === sceneId ? { ...scene, ...fields } : scene))
  };
  return {
    ...nextProject,
    scenes: nextProject.scenes.map((scene) => ({
      ...scene,
      prompt: compileScenePrompt(nextProject, scene)
    }))
  };
}

function parseTone(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function platformLabel(platforms) {
  return `platforms: ${platforms.join(", ")}`;
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
