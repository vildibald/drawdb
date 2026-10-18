import { test } from "node:test";
import assert from "node:assert/strict";
import { getRelationshipOffsets } from "./relationshipOffsets.js";

const relationship = (id, endFieldId = "id") => ({
  id,
  startTableId: `child-${id}`,
  endTableId: "parent",
  fields: [{ startFieldId: "parent_id", endFieldId }],
});

test("a single relationship stays centred", () => {
  assert.deepEqual(getRelationshipOffsets([relationship(1)], 36).get(1), {
    startFieldOffsets: [0],
    endFieldOffsets: [0],
  });
});

test("shared column endpoints are spaced symmetrically", () => {
  const offsets = getRelationshipOffsets(
    [relationship(1), relationship(2)],
    36,
  );
  assert.equal(offsets.get(1).endFieldOffsets[0], -5);
  assert.equal(offsets.get(2).endFieldOffsets[0], 5);
  assert.equal(offsets.get(1).startFieldOffsets[0], 0);
  const separate = getRelationshipOffsets(
    [relationship(1), relationship(2, "other")],
    36,
  );
  assert.equal(separate.get(1).endFieldOffsets[0], 0);
  assert.equal(separate.get(2).endFieldOffsets[0], 0);
});

test("overflow connections overlap at the centre within the row", () => {
  const relationships = Array.from({ length: 20 }, (_, i) => relationship(i));
  const offsets = getRelationshipOffsets(relationships, 36);
  const values = [...offsets.values()].map((value) => value.endFieldOffsets[0]);
  assert.equal(new Set(values.slice(0, 4)).size, 4);
  assert.equal(values[0], -10);
  assert.equal(values[3], 10);
  assert.deepEqual(values.slice(4), Array(16).fill(0));
});

test("four connections fit symmetrically without extending beyond the row", () => {
  const offsets = getRelationshipOffsets(
    Array.from({ length: 4 }, (_, i) => relationship(i)),
    36,
  );
  const values = [...offsets.values()].map((value) => value.endFieldOffsets[0]);
  assert.equal(new Set(values).size, 4);
  values.forEach((value, i) => {
    assert.ok(Math.abs(value + values[3 - i]) < 1e-9);
    assert.ok(Math.abs(value) + 7 < 18);
  });
});

test("start and end connections to the same field share slots", () => {
  const incoming = relationship(1);
  const outgoing = {
    id: 2,
    startTableId: "parent",
    endTableId: "other",
    fields: [{ startFieldId: "id", endFieldId: "id" }],
  };
  const offsets = getRelationshipOffsets([incoming, outgoing], 36);
  assert.equal(offsets.get(1).endFieldOffsets[0], -5);
  assert.equal(offsets.get(2).startFieldOffsets[0], 5);
});

test("composite pairs get independent offsets without mutating relationships", () => {
  const composite = relationship(1);
  composite.fields.push({ startFieldId: "other_id", endFieldId: "other" });
  const relationships = [composite, relationship(2)];
  const original = JSON.stringify(relationships);
  const offsets = getRelationshipOffsets(relationships, 36);
  assert.deepEqual(offsets.get(1).endFieldOffsets, [-5, 0]);
  assert.deepEqual(offsets.get(1).startFieldOffsets, [0, 0]);
  assert.equal(JSON.stringify(relationships), original);
});
