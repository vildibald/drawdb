/** Space connections within a field row, leaving room for the 14px markers.
 * Input relationships have normalized `fields` pairs. Excess connections use
 * the centre rather than expanding into neighbouring rows.
 */
export function getRelationshipOffsets(relationships, fieldHeight) {
  const capacity = 4;
  const availableSpan = Math.max(0, fieldHeight - 16);
  const groups = new Map();
  const offsets = new Map();

  for (const relationship of relationships) {
    const entry = { startFieldOffsets: [], endFieldOffsets: [] };
    offsets.set(relationship.id, entry);
    relationship.fields.forEach((pair, index) => {
      for (const side of ["start", "end"]) {
        const key = JSON.stringify([
          relationship[`${side}TableId`],
          pair[`${side}FieldId`],
        ]);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ values: entry[`${side}FieldOffsets`], index });
      }
    });
  }

  for (const connections of groups.values()) {
    const slots = Math.min(connections.length, capacity);
    const spacing = slots > 1 ? Math.min(10, availableSpan / (slots - 1)) : 0;
    connections.forEach(({ values, index }, slot) => {
      values[index] = slot < slots ? (slot - (slots - 1) / 2) * spacing : 0;
    });
  }
  return offsets;
}
