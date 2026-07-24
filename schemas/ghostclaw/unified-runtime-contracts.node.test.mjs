import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = JSON.parse(
  readFileSync(new URL("./unified-runtime-contracts.v1.schema.json", import.meta.url), "utf8"),
);

const rootRefs = new Set(schema.oneOf.map((entry) => entry.$ref));

test("root union exposes the complete runtime handoff contract set", () => {
  for (const name of [
    "commandEnvelopeV1",
    "actionManifestV2",
    "workMessageV1",
    "stageLeaseV1",
    "stageResultV1",
    "modelCatalogEntryV1",
    "routeReceiptV1",
    "evidenceManifestV1",
    "approvalGrantV2",
    "transitionReceiptV2",
    "redriveRequestV1",
    "nodeManifestV1",
  ]) {
    assert.ok(rootRefs.has(`#/$defs/${name}`), `missing root contract ${name}`);
  }
});

test("secret access is a hard deny across manifests, leases, approvals, and nodes", () => {
  const secretDenied = (definition) =>
    JSON.stringify(definition).includes('\"not\":{\"const\":\"secret_access\"}');

  assert.ok(secretDenied(schema.$defs.actionManifestV2.properties.action_type));
  assert.ok(secretDenied(schema.$defs.stageLeaseV1.properties.permitted_actions.items));
  assert.ok(secretDenied(schema.$defs.approvalGrantV2.properties.action_type));
  assert.ok(secretDenied(schema.$defs.nodeManifestV1.properties.capabilities.items));
});

test("only the local Mac control node may claim control-plane write authority", () => {
  const rules = schema.$defs.nodeManifestV1.allOf;
  const nonMacRule = rules.find((rule) =>
    JSON.stringify(rule.if).includes('\"node_kind\":{\"not\":{\"const\":\"mac_control\"}}'),
  );
  assert.equal(nonMacRule.then.properties.control_plane_writer.const, false);
  assert.deepEqual(nonMacRule.then.properties.capabilities.items.enum, [
    "read_local",
    "validate_local",
    "write_local_scoped",
  ]);
});

test("public edge nodes are public-data read and validation workers only", () => {
  const rules = schema.$defs.nodeManifestV1.allOf;
  const edgeRule = rules.find((rule) =>
    JSON.stringify(rule.if).includes('\"trust_zone\":{\"const\":\"public_edge\"}'),
  );
  assert.equal(edgeRule.then.properties.control_plane_writer.const, false);
  assert.equal(edgeRule.then.properties.max_data_class.const, "public");
  assert.deepEqual(edgeRule.then.properties.capabilities.items.enum, [
    "read_local",
    "validate_local",
  ]);
});
