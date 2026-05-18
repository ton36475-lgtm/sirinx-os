import {
  extractLeadPayload,
  getLeadIntakeSchema,
  handleLeadSubmit
} from "../../../infra/cloudflare/main-router/src/worker.js";
import { qualifyLead } from "./lead-qualification.mjs";

const leadSubmitUrl = "https://www.sirinx.co/api/trpc/lead.submit?batch=1";

function createMockD1() {
  const statements = [];

  return {
    statements,
    prepare(sql) {
      const statement = {
        sql,
        bindings: [],
        bind(...values) {
          this.bindings = values;
          return this;
        },
        async run() {
          statements.push({
            sql: this.sql,
            bindings: this.bindings
          });
          return { success: true };
        }
      };
      return statement;
    }
  };
}

async function safeProductionMethodProbe() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(leadSubmitUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal
    });

    return {
      url: leadSubmitUrl,
      method: "GET",
      status: response.status,
      reachable: response.status < 500,
      edgeRouter: response.headers.get("x-sirinx-router") || "",
      leadHandlerObserved: response.status === 405 && response.headers.get("x-sirinx-router") === "main-www",
      externalWrites: false,
      postProbeRun: false
    };
  } catch (error) {
    return {
      url: leadSubmitUrl,
      method: "GET",
      status: null,
      reachable: false,
      leadHandlerObserved: false,
      error: error.name === "AbortError" ? "timeout" : "unreachable",
      externalWrites: false,
      postProbeRun: false
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runLocalLeadSelfTest() {
  const db = createMockD1();
  const schema = getLeadIntakeSchema();
  const payload = {
    0: {
      json: {
        source: "assessment",
        name: "SIRINX Local Health Probe",
        phone: "0800000000",
        interest: "Hybrid Solar Carport + BESS",
        monthlyBill: "45000",
        bessInterest: "yes",
        timeline: "this month"
      }
    }
  };
  const arrayPayload = [
    {
      input: {
        json: {
          source: "assessment",
          name: "SIRINX Local Array Probe",
          email: "array-probe@example.invalid",
          systemSize: "10 kW",
          bessInterest: "yes"
        }
      }
    }
  ];

  const extracted = extractLeadPayload(payload);
  const arrayExtracted = extractLeadPayload(arrayPayload);
  const qualification = qualifyLead(extracted.lead);
  const response = await handleLeadSubmit(
    new Request(leadSubmitUrl, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    { LEAD_DB: db }
  );
  const body = await response.json();
  const writeStatement = db.statements[1] || null;

  return {
    ok: response.status === 200 && Array.isArray(body) && Boolean(body[0]?.result?.data?.json?.id),
    status: response.status,
    parser: {
      batchPayloadSupported: extracted.isBatch === true && arrayExtracted.isBatch === true,
      numericKeyedBatchSupported: extracted.isBatch === true,
      arrayBatchSupported: arrayExtracted.isBatch === true,
      source: extracted.lead.source,
      hasName: Boolean(extracted.lead.name),
      hasContactChannel: Boolean(extracted.lead.phone || extracted.lead.email || extracted.lead.lineUserId),
      arrayHasContactChannel: Boolean(arrayExtracted.lead.phone || arrayExtracted.lead.email || arrayExtracted.lead.lineUserId)
    },
    schema: {
      version: schema.version,
      endpoint: schema.endpoint,
      method: schema.method,
      requiredAll: schema.required.all,
      requiredOneOf: schema.required.oneOf,
      acceptedPayloadShapes: schema.payloadShapes,
      fieldCount: schema.fields.length,
      piiFieldCount: schema.fields.filter((field) => field.pii).length,
      contactChannelFields: schema.fields.filter((field) => field.contactChannel).map((field) => field.name),
      dbColumns: schema.fields.map((field) => field.dbColumn)
    },
    qualification,
    mockD1: {
      externalWrites: false,
      statements: db.statements.length,
      inserted: Boolean(writeStatement),
      insertColumns: writeStatement?.sql
        ?.replace(/\s+/g, " ")
        .match(/INSERT INTO contact_leads \((.+)\) VALUES/)?.[1]
        ?.split(",")
        .map((value) => value.trim()) || []
    }
  };
}

export async function getLeadBackendHealth() {
  const [local, production] = await Promise.all([
    runLocalLeadSelfTest().catch((error) => ({
      ok: false,
      error: error.message
    })),
    safeProductionMethodProbe()
  ]);

  const productionRoutedToMainRouter = production.edgeRouter === "main-www";
  const productionLeadHandlerObserved = Boolean(production.leadHandlerObserved);
  const status = local.ok
    ? productionLeadHandlerObserved
      ? "local-ready-production-handler-observed"
      : productionRoutedToMainRouter
        ? "local-ready-production-router-proxying"
        : "local-ready-staged-not-routed"
    : "blocked-local-handler";

  return {
    title: "SIRINX lead backend health",
    mode: "local-self-test-and-safe-production-get-probe",
    status,
    schema: {
      ...local.schema,
      reviewGates: getLeadIntakeSchema().reviewGates,
      productionWriteBehavior: getLeadIntakeSchema().productionWriteBehavior,
      commandCenterProbeBehavior: getLeadIntakeSchema().commandCenterProbeBehavior
    },
    qualificationModel: {
      ...local.qualification,
      externalWrites: false
    },
    externalWrites: false,
    productionPostProbeRun: false,
    local,
    production: {
      ...production,
      routedToMainRouter: productionRoutedToMainRouter,
      leadHandlerObserved: productionLeadHandlerObserved,
      expectedSafeGetAfterRouterDeploy: "405 with x-sirinx-router: main-www",
      expectedPostAfterApproval: "200 tRPC success with D1 lead id"
    },
    nextActions: [
      "Keep contact fallback active until production POST is verified.",
      "Review D1 binding and route ownership before deploy.",
      "Run cloudflare:main-router:check and cloudflare:main-router:test before deploy approval.",
      "Deploy only after explicit Cloudflare approval, then run production POST smoke test with a controlled test lead.",
      "Expose lead success/failure state in Command Center before paid traffic."
    ],
    updatedAt: new Date().toISOString()
  };
}
