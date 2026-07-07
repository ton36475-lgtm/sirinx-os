import "dotenv/config";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  Memory,
  VoltAgent,
  VoltAgentObservability,
  VoltOpsClient,
} from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLObservabilityAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { createEnterpriseCompanyAgents } from "./company/agent-factory";
import { ENTERPRISE_AI_COMPANY_ROLES } from "./company/org-chart";
import { boardApprovalWorkflow } from "./workflows/board-approval";

const runtimeDir = fileURLToPath(new URL("../.voltagent/", import.meta.url));
const memoryDbPath = fileURLToPath(new URL("../.voltagent/enterprise-company-memory.db", import.meta.url));
const observabilityDbPath = fileURLToPath(
  new URL("../.voltagent/enterprise-company-observability.db", import.meta.url),
);
mkdirSync(runtimeDir, { recursive: true });

const logger = createPinoLogger({
  name: "sirinx-enterprise-ai-company",
  level: process.env.LOG_LEVEL ?? "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: `file:${memoryDbPath}`,
    logger: logger.child({ component: "libsql-memory" }),
  }),
});

const observability = new VoltAgentObservability({
  storage: new LibSQLObservabilityAdapter({
    url: `file:${observabilityDbPath}`,
  }),
});

const model = process.env.AI_MODEL || "ollama/llama3.2";
const agents = createEnterpriseCompanyAgents(model);

new VoltAgent({
  agents,
  workflows: { boardApprovalWorkflow },
  server: honoServer(),
  logger,
  observability,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
  }),
});

logger.info(
  {
    roles: ENTERPRISE_AI_COMPANY_ROLES.length,
    model,
    publicActionsRequireApproval: true,
  },
  "SIRINX Enterprise AI Company VoltAgent runtime configured",
);
