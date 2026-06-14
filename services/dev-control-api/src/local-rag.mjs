import { execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const defaultProjectRoot = process.env.SIRINX_PROJECT_ROOT || "/Users/sirinx/sirinx-os";

const blockedActions = [
  "deploy",
  "push",
  "publish",
  "external_connector_activation",
  "real_mcp_execution",
  "paid_api_call",
  "external_embedding_api_call",
  "secret_read_or_print",
  "customer_message_send",
  "production_database_write",
  "telegram_send",
  "line_send"
];

const excludedDirectoryNames = new Set([
  ".git",
  ".cache",
  ".next",
  ".nuxt",
  ".turbo",
  ".venv",
  ".worktrees",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target"
]);

const secretFileNames = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".npmrc",
  ".pypirc",
  "id_rsa",
  "id_ed25519",
  "credentials.json",
  "service-account.json"
]);

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".py",
  ".sh",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const secretPatterns = [
  /OPENAI_API_KEY\s*=/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
  /ANTHROPIC_API_KEY\s*=/i,
  /GEMINI_API_KEY\s*=/i,
  /sk-[a-z0-9_-]{6,}/i,
  /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/i
];

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function safeFlags() {
  return {
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canCallPaidApi: false,
    canActivateConnector: false,
    canRunMcp: false,
    canReadSecrets: false,
    canDeploy: false,
    canPublish: false
  };
}

function extensionOf(path) {
  const dotIndex = path.lastIndexOf(".");
  return dotIndex >= 0 ? path.slice(dotIndex).toLowerCase() : "";
}

function hasSecretLikePattern(content) {
  return secretPatterns.some((pattern) => pattern.test(content));
}

function normalizeSnippet(content) {
  return content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

function tokenize(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9ก-๙]+/i)
      .filter((token) => token.length > 1)
  );
}

function scoreDocument(queryTokens, document) {
  const haystack = tokenize(`${document.relativePath} ${document.title} ${document.snippet}`);
  let score = 0;

  for (const token of queryTokens) {
    if (haystack.has(token)) {
      score += 1;
    }
  }

  return score;
}

function detectTurbovec(options = {}) {
  if (options.turbovecStatus) {
    return options.turbovecStatus;
  }

  if (process.env.SIRINX_RAG_SKIP_TURBOVEC_CHECK === "1" || options.skipTurbovecCheck) {
    return {
      status: "not_checked",
      package: "turbovec",
      optional: true,
      reason: "check-skipped"
    };
  }

  try {
    execFileSync("python3", ["-c", "import importlib.util; raise SystemExit(0 if importlib.util.find_spec('turbovec') else 1)"], {
      stdio: "ignore",
      timeout: 1500
    });
    return {
      status: "available",
      package: "turbovec",
      optional: true,
      importName: "turbovec"
    };
  } catch {
    return {
      status: "missing",
      package: "turbovec",
      optional: true,
      installHint: "pip install turbovec",
      fallback: "deterministic-local-fixture"
    };
  }
}

function makeCorpusScope(projectRoot) {
  return {
    id: "full-repo-safe-text",
    title: "Full Repo Safe Text",
    projectRoot,
    include: ["repo text files", "docs", "vault", "scripts", "source files"],
    exclude: [
      ".env and credential files",
      "node_modules and dependency folders",
      "build/dist/coverage/cache outputs",
      "binary files",
      "files containing secret-like patterns"
    ]
  };
}

function makeSummary(dependency) {
  return {
    corpusScope: "full-repo-safe-text",
    embeddingBackend: "deterministic-local-fixture",
    optionalVectorIndex: "turbovec",
    turbovecStatus: dependency.turbovec.status,
    canCallPaidApi: false,
    canRunMcp: false,
    canReadSecrets: false,
    externalWrites: false
  };
}

export async function getLocalRagStatus(options = {}) {
  const projectRoot = options.projectRoot || defaultProjectRoot;
  const dependency = {
    pythonWorker: {
      status: "optional",
      path: "tools/local-rag/turbovec_worker.py"
    },
    turbovec: detectTurbovec(options)
  };

  return {
    title: "Local RAG Prototype",
    status: "local-rag-prototype-ready",
    mode: "local-only-rag-prototype",
    ...safeFlags(),
    corpusScope: makeCorpusScope(projectRoot),
    dependency,
    summary: makeSummary(dependency),
    blockedActions,
    nextActions: [
      "Run a safe-text scan dry-run before building any vector index.",
      "Install turbovec only in a local Python environment when approved for dependency testing.",
      "Use deterministic fixture embeddings until a local embedding model is approved and verified.",
      "Stop before paid embeddings, connector activation, real MCP, deploy, push, publish, or message sending."
    ],
    stopPoint: "LOCAL RAG PROTOTYPE READY - WAITING FOR HUMAN APPROVAL",
    updatedAt: nowIso(options)
  };
}

export async function createLocalRagScanDryRun(body = {}, options = {}) {
  const status = await getLocalRagStatus(options);
  const requestId = String(body.requestId || "local-rag-scan-dry-run");
  const source = String(body.source || "codex-local");
  const scan = await scanSafeTextCorpus(status.corpusScope.projectRoot, {
    maxFiles: Number(body.maxFiles || options.maxFiles || 500),
    maxFileBytes: Number(body.maxFileBytes || options.maxFileBytes || 80_000)
  });

  return {
    title: "Local RAG Safe Corpus Scan Dry-Run",
    status: "dry-run-local-rag-scan-ready",
    mode: "local-only-scan-dry-run",
    requestId,
    source,
    ...safeFlags(),
    corpusScope: status.corpusScope,
    dependency: status.dependency,
    summary: {
      corpusScope: status.corpusScope.id,
      filesVisited: scan.filesVisited,
      filesIndexed: scan.documents.length,
      excludedPaths: scan.excluded.length,
      secretLikeFilesBlocked: scan.excluded.filter((entry) => entry.reason === "secret-like-pattern").length,
      generatedOrDependencyPathsBlocked: scan.excluded.filter((entry) => entry.reason === "generated-or-dependency-path").length,
      canCallPaidApi: false,
      canRunMcp: false,
      canReadSecrets: false
    },
    documents: scan.documents,
    excluded: scan.excluded,
    blockedActions,
    nextActions: [
      "Review excluded paths before indexing a larger corpus.",
      "Keep fixture embeddings until local embedding dependencies are explicitly approved.",
      "Record benchmark evidence before accepting upstream memory or latency claims."
    ],
    stopPoint: "LOCAL RAG SCAN DRY-RUN COMPLETE - WAITING FOR HUMAN APPROVAL",
    updatedAt: nowIso(options)
  };
}

export async function createLocalRagQueryDryRun(body = {}, options = {}) {
  const query = String(body.query || "").trim();
  const scan = await createLocalRagScanDryRun(
    {
      requestId: body.requestId || "local-rag-query-scan",
      source: body.source || "codex-local",
      maxFiles: body.maxFiles,
      maxFileBytes: body.maxFileBytes
    },
    options
  );
  const queryTokens = tokenize(query);
  const topResults = scan.documents
    .map((document) => ({
      ...document,
      score: scoreDocument(queryTokens, document)
    }))
    .filter((document) => document.score > 0)
    .sort((left, right) => right.score - left.score || left.relativePath.localeCompare(right.relativePath))
    .slice(0, Number(body.k || 5));

  return {
    title: "Local RAG Query Dry-Run",
    status: "dry-run-local-rag-query-ready",
    mode: "local-only-query-dry-run",
    requestId: String(body.requestId || "local-rag-query-dry-run"),
    source: String(body.source || "codex-local"),
    query,
    embeddingBackend: "deterministic-local-fixture",
    optionalVectorIndex: "turbovec",
    ...safeFlags(),
    summary: {
      corpusScope: scan.corpusScope.id,
      scannedDocuments: scan.documents.length,
      resultCount: topResults.length,
      canCallPaidApi: false,
      canRunMcp: false,
      canReadSecrets: false
    },
    topResults,
    blockedActions,
    nextActions: [
      "Use these results as local retrieval evidence only.",
      "Do not call external embedding APIs or activate connectors.",
      "Benchmark turbovec locally before promoting the vector index path."
    ],
    stopPoint: "LOCAL RAG QUERY DRY-RUN COMPLETE - WAITING FOR HUMAN APPROVAL",
    updatedAt: nowIso(options)
  };
}

export async function scanSafeTextCorpus(root, options = {}) {
  const documents = [];
  const excluded = [];
  let filesVisited = 0;
  const maxFiles = options.maxFiles || 500;
  const maxFileBytes = options.maxFileBytes || 80_000;

  async function walk(directory) {
    if (documents.length >= maxFiles) {
      return;
    }

    let entries = [];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      excluded.push({
        relativePath: relative(root, directory) || ".",
        reason: "unreadable-path",
        detail: error.code || "read-failed"
      });
      return;
    }

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (documents.length >= maxFiles) {
        return;
      }

      const absolutePath = join(directory, entry.name);
      const relativePath = relative(root, absolutePath);

      if (entry.isDirectory()) {
        if (excludedDirectoryNames.has(entry.name)) {
          excluded.push({ relativePath, reason: "generated-or-dependency-path" });
          continue;
        }
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        excluded.push({ relativePath, reason: "non-regular-file" });
        continue;
      }

      filesVisited += 1;

      if (secretFileNames.has(entry.name) || entry.name.endsWith(".pem") || entry.name.endsWith(".key")) {
        excluded.push({ relativePath, reason: "secret-file-name" });
        continue;
      }

      if (!textExtensions.has(extensionOf(entry.name))) {
        excluded.push({ relativePath, reason: "non-text-extension" });
        continue;
      }

      const fileStat = await stat(absolutePath);
      if (fileStat.size > maxFileBytes) {
        excluded.push({ relativePath, reason: "file-too-large" });
        continue;
      }

      const content = await readFile(absolutePath, "utf8");
      if (hasSecretLikePattern(content)) {
        excluded.push({ relativePath, reason: "secret-like-pattern" });
        continue;
      }

      documents.push({
        id: `repo:${relativePath}`,
        relativePath,
        title: relativePath.split("/").pop(),
        bytes: fileStat.size,
        snippet: normalizeSnippet(content),
        provenance: {
          source: "local-file",
          corpusScope: "full-repo-safe-text"
        }
      });
    }
  }

  await walk(root);

  return {
    root,
    filesVisited,
    documents,
    excluded
  };
}
