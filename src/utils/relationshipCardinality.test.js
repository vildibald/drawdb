import { test } from "node:test";
import assert from "node:assert/strict";
import { inferRelationshipCardinality } from "./relationshipCardinality.js";

const infer = (fields, ids, indices = []) =>
  inferRelationshipCardinality({ fields, indices }, ids);

test("nullable and mandatory foreign keys", () => {
  assert.deepEqual(infer([{ id: 1 }], [1]), {
    start: { min: 0, max: "many" },
    end: { min: 0, max: 1 },
  });
  assert.equal(infer([{ id: 1, notNull: true }], [1]).end.min, 1);
});

test("unique columns and complete primary keys limit children to one", () => {
  assert.equal(infer([{ id: 1, unique: true }], [1]).start.max, 1);
  const fields = [
    { id: 1, primary: true },
    { id: 2, primary: true },
  ];
  assert.equal(infer(fields, [1]).start.max, "many");
  assert.equal(infer(fields, [1, 2]).start.max, 1);
  assert.equal(infer(fields, [1, 2]).end.min, 1);
});

test("composite FK requires all columns and a complete unique index", () => {
  const fields = [
    { id: 1, name: "a", notNull: true },
    { id: 2, name: "b" },
    { id: 3, name: "c" },
  ];
  assert.equal(infer(fields, [1, 2]).end.min, 0);
  assert.equal(
    infer(fields, [1, 2], [{ unique: true, fields: ["b", "a"] }]).start.max,
    1,
  );
  assert.equal(
    infer(fields, [1, 2], [{ unique: true, fields: ["a", "b", "c"] }]).start
      .max,
    "many",
  );
  assert.equal(
    infer(fields, [1, 2], [{ unique: false, fields: ["a", "b"] }]).start.max,
    "many",
  );
  assert.equal(
    infer(fields, [1, 2], [{ unique: true, fields: ["a"] }]).start.max,
    1,
  );
});

test("missing fields do not imply mandatory or unique relationships", () => {
  assert.equal(infer([], [1]).end.min, 0);
  assert.equal(infer([], []).start.max, "many");
});

test("table-level unique constraints infer one-to-one", () => {
  const table = {
    fields: [
      { id: 1, name: "user_id" },
      { id: 2, name: "other" },
    ],
    uniqueConstraints: [{ name: "uq_owner", fields: ["user_id"] }],
  };
  assert.equal(inferRelationshipCardinality(table, [1]).start.max, 1);
  table.uniqueConstraints[0].fields.push("other");
  assert.equal(inferRelationshipCardinality(table, [1]).start.max, "many");
  assert.equal(inferRelationshipCardinality(table, [1, 2]).start.max, 1);
});
