export const AUTOGLOW_FORBIDDEN_ACTIONS = Object.freeze([
  "NO_COOKIE_SESSION_TOKEN_ACCESS",
  "NO_CREDIT_OR_RATE_LIMIT_BYPASS",
  "NO_PRIVATE_API_REPLAY",
  "NO_HIDDEN_BACKGROUND_AUTOMATION",
  "NO_AUTO_POST_OR_COMMENT",
  "NO_COMPETITOR_CODE_OR_UI_CLONING"
] as const);

export const AUTOGLOW_SAFE_MODE = Object.freeze({
  mode: "assisted-workflow",
  humanApprovalRequiredForGeneration: true,
  externalPublishingAllowed: false,
  hiddenAutomationAllowed: false,
  credentialAccessAllowed: false
});

export type Platform = "tiktok" | "reels" | "youtube_shorts" | "shopee_video" | "facebook_reels";

export type Objective = "sales" | "awareness" | "lead_generation" | "education";

export type AspectRatio = "9:16" | "1:1" | "16:9";

export type SceneStatus =
  | "draft"
  | "approved"
  | "copied"
  | "generating"
  | "done"
  | "failed"
  | "needs_review";

export type Asset = {
  id: string;
  type: "product" | "character" | "location" | "logo" | "reference";
  filename: string;
  localUrl?: string;
  remoteUrl?: string;
  notes?: string;
};

export type Scene = {
  id: string;
  sceneNo: number;
  hook: string;
  visualDescription: string;
  cameraDirection: string;
  motionDirection: string;
  prompt: string;
  negativePrompt?: string;
  voiceoverText: string;
  captionText: string;
  status: SceneStatus;
};

export type Project = {
  id: string;
  brandName: string;
  productName: string;
  targetAudience: string;
  objective: Objective;
  platform: Platform[];
  durationSec: 15 | 30 | 45 | 60;
  aspectRatio: AspectRatio;
  tone: string[];
  visualStyle: string;
  scenes: Scene[];
  assets: Asset[];
  createdAt: string;
  updatedAt: string;
};

export type ValidationResult = {
  ok: boolean;
  findings: string[];
};

const VALID_PLATFORMS = new Set<Platform>([
  "tiktok",
  "reels",
  "youtube_shorts",
  "shopee_video",
  "facebook_reels"
]);

const VALID_STATUSES = new Set<SceneStatus>([
  "draft",
  "approved",
  "copied",
  "generating",
  "done",
  "failed",
  "needs_review"
]);

const UNSAFE_PROMPT_TERMS = /\b(cookie|session|token|captcha|bypass|auto-click|rate limit bypass)\b/i;

export function createMockProject(): Project {
  const now = "2026-06-15T00:00:00.000Z";

  const scene: Scene = {
    id: "scene-001",
    sceneNo: 1,
    hook: "Hook shot",
    visualDescription:
      "close-up of juicy Thai charcoal roasted red pork being sliced on a wooden board with soft steam and glossy sauce",
    cameraDirection: "macro close-up, slow push-in, shallow depth of field",
    motionDirection: "steam rises gently, sauce drips slowly, cinematic food commercial motion",
    prompt: "",
    voiceoverText: "หมูแดงเตาถ่านแท้ ๆ หอม ฉ่ำ นุ่ม แบบที่กินแล้วจำได้ทันที",
    captionText: "ข้าวหมูแดงเตาถ่าน ฉ่ำทุกคำ หอมทุกชิ้น",
    status: "draft"
  };

  return {
    id: "agm-autoglow-demo-001",
    brandName: "AGM AUTOGLOW",
    productName: "ข้าวหมูแดงเตาถ่านลุงแบงค์",
    targetAudience: "คนพิษณุโลก คนทำงาน และคนชอบอาหารจานเดียว",
    objective: "sales",
    platform: ["tiktok", "reels"],
    durationSec: 30,
    aspectRatio: "9:16",
    tone: ["น่ากิน", "ท้องถิ่น", "พรีเมียม", "เตาถ่าน", "ฉ่ำ"],
    visualStyle: "Ultra realistic cinematic Thai street food commercial",
    scenes: [{ ...scene, prompt: compileScenePromptBase("9:16", scene, ["น่ากิน", "ท้องถิ่น", "พรีเมียม", "เตาถ่าน", "ฉ่ำ"], "Ultra realistic cinematic Thai street food commercial") }],
    assets: [
      {
        id: "asset-product-001",
        type: "product",
        filename: "charcoal-red-pork-reference.png",
        notes: "Local reference placeholder. Replace with user-approved product photo before production."
      }
    ],
    createdAt: now,
    updatedAt: now
  };
}

export function validateProject(project: Project): ValidationResult {
  const findings: string[] = [];

  if (!project.id?.trim()) findings.push("missing_project_id");
  if (!project.brandName?.trim()) findings.push("missing_brand_name");
  if (!project.productName?.trim()) findings.push("missing_product_name");
  if (!project.targetAudience?.trim()) findings.push("missing_target_audience");
  if (!project.platform.length) findings.push("missing_platform");

  for (const platform of project.platform) {
    if (!VALID_PLATFORMS.has(platform)) findings.push(`invalid_platform:${platform}`);
  }

  if (!project.scenes.length) findings.push("missing_scenes");

  const sceneNos = new Set<number>();
  for (const scene of project.scenes) {
    if (!scene.id?.trim()) findings.push(`scene_${scene.sceneNo || "unknown"}_missing_id`);
    if (!Number.isInteger(scene.sceneNo) || scene.sceneNo < 1) findings.push(`invalid_scene_no:${scene.sceneNo}`);
    if (sceneNos.has(scene.sceneNo)) findings.push(`duplicate_scene_no:${scene.sceneNo}`);
    sceneNos.add(scene.sceneNo);
    if (!scene.visualDescription?.trim()) findings.push(`scene_${scene.sceneNo}_missing_visual_description`);
    if (!scene.cameraDirection?.trim()) findings.push(`scene_${scene.sceneNo}_missing_camera_direction`);
    if (!scene.motionDirection?.trim()) findings.push(`scene_${scene.sceneNo}_missing_motion_direction`);
    if (!scene.voiceoverText?.trim()) findings.push(`scene_${scene.sceneNo}_missing_voiceover`);
    if (!VALID_STATUSES.has(scene.status)) findings.push(`scene_${scene.sceneNo}_invalid_status:${scene.status}`);
    if (UNSAFE_PROMPT_TERMS.test(scene.prompt)) findings.push(`scene_${scene.sceneNo}_unsafe_prompt_terms`);
  }

  return {
    ok: findings.length === 0,
    findings
  };
}

export function compileScenePrompt(project: Project, scene: Scene): string {
  return compileScenePromptBase(project.aspectRatio, scene, project.tone, project.visualStyle, project.productName);
}

function compileScenePromptBase(
  aspectRatio: AspectRatio,
  scene: Scene,
  tones: readonly string[],
  visualStyle: string,
  productName?: string
): string {
  const ratio = aspectRatio === "9:16" ? "vertical 9:16" : aspectRatio === "1:1" ? "square 1:1" : "wide 16:9";
  const toneText = tones.filter(Boolean).join(", ");
  const productContext = productName ? `product context: ${productName}, ` : "";

  return [
    visualStyle,
    productContext + scene.visualDescription,
    scene.cameraDirection,
    scene.motionDirection,
    toneText ? `${toneText} atmosphere` : "",
    ratio,
    "professional lighting",
    "clean composition",
    "high-end production quality",
    "human-reviewed assisted workflow"
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMarkdownExport(project: Project): string {
  const scenes = project.scenes
    .map((scene) => {
      const prompt = scene.prompt || compileScenePrompt(project, scene);
      return [
        `### Scene ${String(scene.sceneNo).padStart(2, "0")} — ${scene.hook}`,
        "",
        `- Status: ${scene.status}`,
        `- Visual: ${scene.visualDescription}`,
        `- Camera: ${scene.cameraDirection}`,
        `- Motion: ${scene.motionDirection}`,
        `- Voiceover: ${scene.voiceoverText}`,
        `- Caption: ${scene.captionText}`,
        "",
        "```text",
        prompt,
        "```"
      ].join("\n");
    })
    .join("\n\n");

  return [
    "# AGM AUTOGLOW Delivery Pack",
    "",
    `- Project: ${project.id}`,
    `- Brand: ${project.brandName}`,
    `- Product: ${project.productName}`,
    `- Audience: ${project.targetAudience}`,
    `- Platforms: ${project.platform.join(", ")}`,
    `- Duration: ${project.durationSec}s`,
    `- Aspect ratio: ${project.aspectRatio}`,
    "",
    "## Storyboard",
    "",
    scenes,
    "",
    "## Prompt Pack",
    "",
    project.scenes
      .map((scene) => `${scene.sceneNo}. ${scene.prompt || compileScenePrompt(project, scene)}`)
      .join("\n\n"),
    "",
    "## Safety Note",
    "",
    "This pack is for human-reviewed assisted production only. It does not bypass provider credits, rate limits, sessions, or platform controls."
  ].join("\n");
}

export function buildCsvExport(project: Project): string {
  const header = [
    "sceneNo",
    "hook",
    "visualDescription",
    "cameraDirection",
    "motionDirection",
    "prompt",
    "voiceoverText",
    "captionText",
    "status"
  ];

  const rows = project.scenes.map((scene) =>
    [
      scene.sceneNo,
      scene.hook,
      scene.visualDescription,
      scene.cameraDirection,
      scene.motionDirection,
      scene.prompt || compileScenePrompt(project, scene),
      scene.voiceoverText,
      scene.captionText,
      scene.status
    ].map(csvCell)
  );

  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}
