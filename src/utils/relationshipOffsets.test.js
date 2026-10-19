import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getRelationshipLayout,
  getRelationshipSides,
} from "./relationshipOffsets.js";

const field = (id) => ({ id });
const parent = {
  id: "parent",
  x: 500,
  y: 100,
  width: 220,
  fields: [field("id"), field("next")],
};
const child = (id, x = 0) => ({
  id,
  x,
  y: 0,
  width: 220,
  fields: [field("parent_id")],
});
const relationship = (id, startTableId = `child-${id}`) => ({
  id,
  startTableId,
  endTableId: "parent",
  fields: [{ startFieldId: "parent_id", endFieldId: "id" }],
});
const fixture = (left, right = 0) => {
  const children = Array.from({ length: left + right }, (_, i) =>
    child(`child-${i}`, i < left ? 0 : 1000),
  );
  return {
    tables: [parent, ...children],
    relationships: children.map((table, i) => relationship(i, table.id)),
  };
};
const layout = ({ tables, relationships }) =>
  getRelationshipLayout(relationships, tables, 36);
const values = (result) =>
  [...result.offsets.values()].map((entry) => entry.endFieldOffsets[0]);

test("up to three same-side connections keep the normal row height and 10px spacing", () => {
  for (const count of [1, 2, 3]) {
    const result = layout(fixture(count));
    assert.equal(result.fieldHeights.get("parent").get("id"), 36);
    assert.deepEqual(
      values(result),
      Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * 10),
    );
  }
});

test("four and more same-side connections grow the row instead of overlapping", () => {
  for (const count of [4, 8, 20]) {
    const result = layout(fixture(count));
    const height = result.fieldHeights.get("parent").get("id");
    assert.equal(height, 36 + (count - 3) * 10);
    const ys = values(result);
    assert.equal(new Set(ys).size, count);
    ys.forEach((offset, i) => {
      assert.ok(Math.abs(offset) + 7 < height / 2);
      if (i) assert.equal(offset - ys[i - 1], 10);
    });
  }
});

test("opposite sides use independent slots and the height of the busiest side", () => {
  let result = layout(fixture(3, 3));
  assert.equal(result.fieldHeights.get("parent").get("id"), 36);
  assert.deepEqual(values(result), [-10, 0, 10, -10, 0, 10]);
  result = layout(fixture(4, 2));
  assert.equal(result.fieldHeights.get("parent").get("id"), 46);
  assert.deepEqual(values(result), [-15, -5, 5, 15, -5, 5]);
});

test("moving, hiding and deleting connections recomputes heights without changing schema data", () => {
  const data = fixture(6);
  const original = JSON.stringify(data);
  assert.equal(layout(data).fieldHeights.get("parent").get("id"), 66);
  assert.equal(JSON.stringify(data), original);
  data.tables.slice(4).forEach((table) => {
    table.x = 1000;
  });
  assert.equal(layout(data).fieldHeights.get("parent").get("id"), 36);
  data.tables.slice(1).forEach((table) => {
    table.x = 0;
    table.hidden = true;
  });
  assert.equal(layout(data).fieldHeights.get("parent"), undefined);
  data.tables.forEach((table) => {
    table.hidden = false;
  });
  data.relationships.splice(3);
  assert.equal(layout(data).fieldHeights.get("parent").get("id"), 36);
});

test("incoming and outgoing connections to the same side share slots", () => {
  const data = fixture(1);
  const other = child("other");
  data.tables.push(other);
  data.relationships.push({
    id: "outgoing",
    startTableId: "parent",
    endTableId: "other",
    startFieldId: "id",
    endFieldId: "parent_id",
  });
  const result = layout(data);
  assert.deepEqual(result.offsets.get(0).endFieldOffsets, [-5]);
  assert.deepEqual(result.offsets.get("outgoing").startFieldOffsets, [5]);
});

test("composite pairs grow only the matching column and malformed references are ignored", () => {
  const data = fixture(4);
  data.relationships[0].fields.push({
    startFieldId: "second",
    endFieldId: "next",
  });
  data.tables[1].fields.push(field("second"));
  data.relationships.push({
    id: "missing",
    startTableId: "absent",
    endTableId: "parent",
    startFieldId: "x",
    endFieldId: "id",
  });
  const result = layout(data);
  assert.deepEqual(result.offsets.get(0).endFieldOffsets, [-15, 0]);
  assert.equal(result.fieldHeights.get("parent").get("id"), 46);
  assert.equal(result.fieldHeights.get("parent").get("next"), 36);
  assert.equal(result.offsets.has("missing"), false);
});

test("legacy field indexes resolve to the same column as IDs", () => {
  const data = fixture(2);
  data.relationships[1].fields = [{ startFieldId: 0, endFieldId: 0 }];
  assert.deepEqual(values(layout(data)), [-5, 5]);
});

test("overlapping tables and self references use the same outer side for layout and routing", () => {
  assert.deepEqual(getRelationshipSides(parent, parent), {
    startSide: 1,
    endSide: 1,
  });
  assert.deepEqual(getRelationshipSides(parent, { ...parent, x: 600 }), {
    startSide: 1,
    endSide: 1,
  });
  const data = {
    tables: [parent],
    relationships: [
      {
        id: "self",
        startTableId: "parent",
        endTableId: "parent",
        startFieldId: "id",
        endFieldId: "id",
      },
    ],
  };
  const result = layout(data);
  assert.deepEqual(result.offsets.get("self").startFieldOffsets, [-5]);
  assert.deepEqual(result.offsets.get("self").endFieldOffsets, [5]);
});
