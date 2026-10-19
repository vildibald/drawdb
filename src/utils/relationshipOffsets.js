/** Choose attachment sides from table geometry, independently of row heights.
 * Overlapping tables connect around their outer edge; self references use right.
 * Tables passed here have resolved widths.
 */
export function getRelationshipSides(start, end) {
  if (start.x + start.width <= end.x) return { startSide: 1, endSide: -1 };
  if (end.x + end.width <= start.x) return { startSide: -1, endSide: 1 };
  const side = start.x + start.width / 2 <= end.x + end.width / 2 ? 1 : -1;
  return { startSide: side, endSide: side };
}

/** Compute transient row heights and offsets; schema objects are never changed.
 * Three connections fit the normal row at 10px spacing. Further connections
 * grow the row by 10px each. Opposite sides share the same vertical space.
 */
export function getRelationshipLayout(relationships, tables, fieldHeight) {
  const spacing = 10;
  const groups = new Map();
  const offsets = new Map();
  const fieldHeights = new Map();
  const tablesById = new Map(tables.map((table) => [table.id, table]));

  for (const relationship of relationships) {
    const start = tablesById.get(relationship.startTableId);
    const end = tablesById.get(relationship.endTableId);
    if (!start || !end || start.hidden || end.hidden) continue;
    const pairs = relationship.fields?.length
      ? relationship.fields
      : [relationship];
    const resolved = pairs.map((pair) => ({
      start:
        start.fields.find((field) => field.id === pair.startFieldId) ??
        start.fields[pair.startFieldId],
      end:
        end.fields.find((field) => field.id === pair.endFieldId) ??
        end.fields[pair.endFieldId],
    }));
    if (resolved.some((pair) => !pair.start || !pair.end)) continue;

    const sides = getRelationshipSides(start, end);
    const entry = { startFieldOffsets: [], endFieldOffsets: [], ...sides };
    offsets.set(relationship.id, entry);
    resolved.forEach((pair, index) => {
      for (const side of ["start", "end"]) {
        const table = side === "start" ? start : end;
        const field = pair[side];
        const key = JSON.stringify([table.id, field.id, sides[`${side}Side`]]);
        if (!groups.has(key))
          groups.set(key, {
            tableId: table.id,
            fieldId: field.id,
            connections: [],
          });
        groups
          .get(key)
          .connections.push({
            values: entry[`${side}FieldOffsets`],
            index,
            entry,
          });
      }
    });
  }

  for (const { tableId, fieldId, connections } of groups.values()) {
    const height = fieldHeight + Math.max(0, connections.length - 3) * spacing;
    if (!fieldHeights.has(tableId)) fieldHeights.set(tableId, new Map());
    const heights = fieldHeights.get(tableId);
    heights.set(fieldId, Math.max(heights.get(fieldId) ?? fieldHeight, height));
    connections.forEach(({ values, index, entry }, slot) => {
      entry.routePadding = Math.max(
        entry.routePadding ?? 0,
        ((connections.length - 1) * spacing) / 2,
      );
      values[index] = (slot - (connections.length - 1) / 2) * spacing;
    });
  }
  return { offsets, fieldHeights };
}
