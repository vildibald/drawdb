/** An identifying FK is wholly included in the referencing table's primary key.
 * UNIQUE and NOT NULL constraints do not establish identifying relationships.
 */
export function isIdentifyingRelationship(table, fieldIds) {
  return (
    fieldIds.length > 0 &&
    fieldIds.every((id) => {
      const field =
        table?.fields?.find((candidate) => candidate.id === id) ??
        table?.fields?.[id];
      return field?.primary === true;
    })
  );
}

/** Infer endpoint cardinalities from the referencing table's SQL constraints.
 * A foreign key never requires the referenced row to have any children.
 */
export function inferRelationshipCardinality(table, fieldIds) {
  const fields = fieldIds.map((id) => table?.fields.find((f) => f.id === id));
  const valid = fields.length > 0 && fields.every(Boolean);
  const containsKey = (key) =>
    key.length > 0 && key.every((field) => fields.includes(field));
  const primary = table?.fields.filter((field) => field.primary) ?? [];
  const containsNamedKey = (key) =>
    key.length > 0 &&
    key.every((name) => fields.some((field) => field.name === name));
  const unique =
    valid &&
    (fields.some((field) => field.unique) ||
      containsKey(primary) ||
      (table.uniqueConstraints ?? []).some((constraint) =>
        containsNamedKey(constraint.fields),
      ) ||
      (table.indices ?? []).some(
        (index) =>
          index.unique &&
          index.fields.length > 0 &&
          index.fields.every((name) =>
            fields.some((field) => field.name === name),
          ),
      ));

  return {
    start: { min: 0, max: unique ? 1 : "many" },
    end: {
      min:
        valid && fields.every((field) => field.notNull || field.primary)
          ? 1
          : 0,
      max: 1,
    },
  };
}
