import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const maxPreviewChars = 16000;
const maxNotesPerRoot = 220;

export const brainRoots = [
  {
    id: "sirinx",
    label: "SIRINX Obsidian HQ",
    root: "/Users/sirinx/Documents/Obsidian Vault/SIRINX",
    vault: "Obsidian Vault",
    obsidianPrefix: "SIRINX",
    kind: "obsidian"
  },
  {
    id: "mysecondbrain",
    label: "MySecondBrain Vault",
    root: "/Users/sirinx/Documents/Codex/2026-05-09/plugin-computer-use-openai-bundled-play/MySecondBrain",
    vault: "MySecondBrain",
    obsidianPrefix: "",
    kind: "obsidian"
  },
  {
    id: "kms",
    label: "thClaws KMS",
    root: "/Users/sirinx/sirinx-os/.thclaws/kms/sirinx-brain",
    vault: "",
    obsidianPrefix: "",
    kind: "kms"
  },
  {
    id: "docs",
    label: "SIRINX Project Docs",
    root: "/Users/sirinx/sirinx-os/docs",
    vault: "",
    obsidianPrefix: "",
    kind: "project"
  },
  {
    id: "skills",
    label: "SIRINX Local Skills",
    root: "/Users/sirinx/sirinx-os/skills",
    vault: "",
    obsidianPrefix: "",
    kind: "skill"
  }
];

function slugPart(value) {
  return value
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugFromPath(rootId, relativePath) {
  return `${rootId}-${slugPart(relativePath)}`;
}

function titleFromMarkdown(fileName, content) {
  const heading = content.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() || path.basename(fileName, ".md");
}

function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\s*/u, "").trim();
}

function summaryFromMarkdown(content) {
  const body = stripFrontmatter(content);
  const line = body
    .split("\n")
    .map((value) => value.trim())
    .find((value) => value && !value.startsWith("#") && !value.startsWith("%%"));

  return line?.replace(/^[-*]\s+/, "").replace(/^- \[[ xX]\]\s+/, "") || "No summary yet.";
}

function extractWikiLinks(content) {
  return [...content.matchAll(/\[\[([^\]\n]+)\]\]/g)]
    .map((match) => match[1].split("|")[0].trim())
    .filter(Boolean)
    .slice(0, 20);
}

function extractMarkdownLinks(content) {
  return [...content.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)]
    .map((match) => match[1].trim())
    .filter(Boolean)
    .slice(0, 20);
}

function extractHeadings(content) {
  return [...content.matchAll(/^(#{1,3})\s+(.+)$/gm)]
    .map((match) => ({
      level: match[1].length,
      title: match[2].trim()
    }))
    .slice(0, 20);
}

function taskStats(content) {
  const open = [...content.matchAll(/^- \[ \]/gm)].length;
  const done = [...content.matchAll(/^- \[[xX]\]/gm)].length;
  return { open, done, total: open + done };
}

function obsidianUrl(root, relativePath) {
  if (!root.vault) {
    return "";
  }

  const filePath = root.obsidianPrefix
    ? `${root.obsidianPrefix}/${relativePath}`
    : relativePath;

  return `obsidian://open?vault=${encodeURIComponent(root.vault)}&file=${encodeURIComponent(filePath)}`;
}

async function walkMarkdownFiles(rootPath, basePath = rootPath, files = []) {
  const entries = await readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".thclaws") {
      continue;
    }

    const fullPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", ".git", "archive"].includes(entry.name)) {
        continue;
      }
      await walkMarkdownFiles(fullPath, basePath, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.relative(basePath, fullPath));
    }

    if (files.length >= maxNotesPerRoot) {
      break;
    }
  }

  return files;
}

async function noteFromFile(root, relativePath, includeContent = false) {
  const fullPath = path.join(root.root, relativePath);
  const [content, info] = await Promise.all([
    readFile(fullPath, "utf8"),
    stat(fullPath)
  ]);
  const stripped = stripFrontmatter(content);
  const wikiLinks = extractWikiLinks(content);
  const markdownLinks = extractMarkdownLinks(content);

  const note = {
    slug: slugFromPath(root.id, relativePath),
    rootId: root.id,
    sourceLabel: root.label,
    sourceKind: root.kind,
    relativePath,
    fileName: path.basename(relativePath),
    title: titleFromMarkdown(relativePath, content),
    summary: summaryFromMarkdown(content),
    headings: extractHeadings(content),
    links: [...wikiLinks, ...markdownLinks].slice(0, 30),
    tasks: taskStats(content),
    updatedAt: info.mtime.toISOString(),
    path: fullPath,
    obsidianUrl: obsidianUrl(root, relativePath)
  };

  if (includeContent) {
    note.content = stripped.slice(0, maxPreviewChars);
    note.truncated = stripped.length > maxPreviewChars;
  }

  return note;
}

async function listRoot(root) {
  try {
    const files = (await walkMarkdownFiles(root.root)).sort((a, b) => a.localeCompare(b));
    const notes = await Promise.all(files.map((file) => noteFromFile(root, file)));
    return {
      id: root.id,
      label: root.label,
      root: root.root,
      kind: root.kind,
      vault: root.vault,
      ok: true,
      noteCount: notes.length,
      notes
    };
  } catch (error) {
    return {
      id: root.id,
      label: root.label,
      root: root.root,
      kind: root.kind,
      vault: root.vault,
      ok: false,
      error: error.message,
      noteCount: 0,
      notes: []
    };
  }
}

export async function listBrainNotes() {
  const roots = await Promise.all(brainRoots.map((root) => listRoot(root)));
  const notes = roots.flatMap((root) => root.notes);
  const totals = notes.reduce(
    (acc, note) => {
      acc.openTasks += note.tasks.open;
      acc.doneTasks += note.tasks.done;
      acc.links += note.links.length;
      return acc;
    },
    { openTasks: 0, doneTasks: 0, links: 0 }
  );

  notes.sort((a, b) => {
    const featuredA = /work-summary|dna-brain|hq-config|status/i.test(a.slug) ? 1 : 0;
    const featuredB = /work-summary|dna-brain|hq-config|status/i.test(b.slug) ? 1 : 0;
    if (featuredA !== featuredB) {
      return featuredB - featuredA;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return {
    generatedAt: new Date().toISOString(),
    rootCount: roots.length,
    roots: roots.map(({ notes: _notes, ...root }) => root),
    noteCount: notes.length,
    totals,
    notes
  };
}

export async function getBrainNote(slug) {
  const suffixMatches = [];

  for (const root of brainRoots) {
    try {
      const files = await walkMarkdownFiles(root.root);
      const relativePath = files.find((file) => {
        const fileSlug = slugFromPath(root.id, file);

        if (fileSlug === slug) {
          return true;
        }

        if (slug && fileSlug.endsWith(`-${slug}`)) {
          suffixMatches.push({ root, relativePath: file });
        }

        return false;
      });

      if (relativePath) {
        return noteFromFile(root, relativePath, true);
      }
    } catch {
      // Keep searching other roots.
    }
  }

  if (suffixMatches.length === 1) {
    const [match] = suffixMatches;
    return noteFromFile(match.root, match.relativePath, true);
  }

  return null;
}
