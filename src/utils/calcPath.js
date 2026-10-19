import { tableHeaderHeight } from "../data/constants";
import {
  getCommentHeight,
  getFieldOffsetY,
  getTableWidth,
  getFieldContentHeight,
} from "./utils";

/**
 * Generates an SVG path string to visually represent a relationship between two fields.
 *
 * @param {{
 *   startTable: { x: number, y: number, width?: number },
 *   endTable: { x: number, y: number, width?: number },
 *   startFieldIndex: number,
 *   endFieldIndex: number
 * }} r - Relationship data.
 * @param {number} zoom - Zoom level (used to scale vertical spacing).
 * @returns {string} SVG path "d" attribute string.
 */
export function calcPath(r, zoom = 1, showComments = true) {
  if (!r) {
    return "";
  }

  const startTableWidth = getTableWidth(r.startTable);
  const endTableWidth = getTableWidth(r.endTable);
  const startWidth = startTableWidth * zoom;
  const endWidth = endTableWidth * zoom;
  let x1 = r.startTable.x;
  let y1 =
    r.startTable.y +
    getFieldOffsetY(
      r.startTable.fields ?? [],
      r.startFieldIndex,
      startTableWidth,
      showComments,
      r.startTable.fieldHeights,
    ) +
    tableHeaderHeight +
    getCommentHeight(r.startTable.comment, startTableWidth, showComments) +
    getFieldContentHeight(
      r.startTable.fields?.[r.startFieldIndex],
      r.startTable.fieldHeights,
    ) /
      2 +
    (r.startOffset ?? 0) * zoom;
  let x2 = r.endTable.x;
  let y2 =
    r.endTable.y +
    getFieldOffsetY(
      r.endTable.fields ?? [],
      r.endFieldIndex,
      endTableWidth,
      showComments,
      r.endTable.fieldHeights,
    ) +
    getCommentHeight(r.endTable.comment, endTableWidth, showComments) +
    tableHeaderHeight +
    getFieldContentHeight(
      r.endTable.fields?.[r.endFieldIndex],
      r.endTable.fieldHeights,
    ) /
      2 +
    (r.endOffset ?? 0) * zoom;

  if (r.startSide !== undefined && r.endSide !== undefined) {
    const sx = x1 + (r.startSide > 0 ? startWidth : 0);
    const ex = x2 + (r.endSide > 0 ? endWidth : 0);
    const lane = (r.routeOffset ?? 0) * zoom;
    const clearance = (30 + (r.routePadding ?? 0)) * zoom;
    const mx =
      r.startSide === r.endSide
        ? r.startSide > 0
          ? Math.max(sx, ex) + clearance + lane
          : Math.min(sx, ex) - clearance - lane
        : (sx + ex) / 2 + lane;
    return roundedTrunk(sx, y1, ex, y2, mx, zoom);
  }

  let radius = 10 * zoom;
  const midX = (x2 + x1 + startWidth) / 2 + (r.routeOffset ?? 0) * zoom;
  const endX = x2 + endWidth < x1 ? x2 + endWidth : x2;

  if (Math.abs(y1 - y2) <= 36 * zoom) {
    radius = Math.abs(y2 - y1) / 3;
    if (radius <= 2) {
      if (x1 + startWidth <= x2)
        return `M ${x1 + startWidth} ${y1} L ${x2} ${y2 + 0.1}`;
      else if (x2 + endWidth < x1)
        return `M ${x1} ${y1} L ${x2 + endWidth} ${y2 + 0.1}`;
    }
  }

  if (y1 <= y2) {
    if (x1 + startWidth <= x2) {
      return `M ${x1 + startWidth} ${y1} L ${
        midX - radius
      } ${y1} A ${radius} ${radius} 0 0 1 ${midX} ${y1 + radius} L ${midX} ${
        y2 - radius
      } A ${radius} ${radius} 0 0 0 ${midX + radius} ${y2} L ${endX} ${y2}`;
    } else if (x2 <= x1 + startWidth && x1 <= x2) {
      return `M ${x1 + startWidth} ${y1} L ${
        x2 + endWidth
      } ${y1} A ${radius} ${radius} 0 0 1 ${x2 + endWidth + radius} ${
        y1 + radius
      } L ${x2 + endWidth + radius} ${y2 - radius} A ${radius} ${radius} 0 0 1 ${
        x2 + endWidth
      } ${y2} L ${x2 + endWidth} ${y2}`;
    } else if (x2 + endWidth >= x1 && x2 + endWidth <= x1 + startWidth) {
      return `M ${x1} ${y1} L ${
        x2 - radius
      } ${y1} A ${radius} ${radius} 0 0 0 ${x2 - radius - radius} ${
        y1 + radius
      } L ${x2 - radius - radius} ${y2 - radius} A ${radius} ${radius} 0 0 0 ${
        x2 - radius
      } ${y2} L ${x2} ${y2}`;
    } else {
      return `M ${x1} ${y1} L ${
        midX + radius
      } ${y1} A ${radius} ${radius} 0 0 0 ${midX} ${y1 + radius} L ${midX} ${
        y2 - radius
      } A ${radius} ${radius} 0 0 1 ${midX - radius} ${y2} L ${endX} ${y2}`;
    }
  } else {
    if (x1 + startWidth <= x2) {
      return `M ${x1 + startWidth} ${y1} L ${
        midX - radius
      } ${y1} A ${radius} ${radius} 0 0 0 ${midX} ${y1 - radius} L ${midX} ${
        y2 + radius
      } A ${radius} ${radius} 0 0 1 ${midX + radius} ${y2} L ${endX} ${y2}`;
    } else if (x1 + startWidth >= x2 && x1 + startWidth <= x2 + endWidth) {
      return `M ${x1} ${y1} L ${
        x1 - radius - radius
      } ${y1} A ${radius} ${radius} 0 0 1 ${x1 - radius - radius - radius} ${
        y1 - radius
      } L ${x1 - radius - radius - radius} ${
        y2 + radius
      } A ${radius} ${radius} 0 0 1 ${
        x1 - radius - radius
      } ${y2} L ${endX} ${y2}`;
    } else if (x1 >= x2 && x1 <= x2 + endWidth) {
      return `M ${x1 + startWidth} ${y1} L ${
        x1 + startWidth + radius
      } ${y1} A ${radius} ${radius} 0 0 0 ${x1 + startWidth + radius + radius} ${
        y1 - radius
      } L ${x1 + startWidth + radius + radius} ${
        y2 + radius
      } A ${radius} ${radius} 0 0 0 ${x1 + startWidth + radius} ${y2} L ${
        x2 + endWidth
      } ${y2}`;
    } else {
      return `M ${x1} ${y1} L ${
        midX + radius
      } ${y1} A ${radius} ${radius} 0 0 1 ${midX} ${y1 - radius} L ${midX} ${
        y2 + radius
      } A ${radius} ${radius} 0 0 0 ${midX - radius} ${y2} L ${endX} ${y2}`;
    }
  }
}

/**
 * Builds a "fork" path for a composite (multi-column) foreign key: a short
 * stub from every column on each table converges to a vertical collector,
 * the two collectors are joined by a single orthogonal trunk, and the trunk
 * forks back out to the columns on the other table.
 *
 * @param {{
 *   startTable: { x: number, y: number, width?: number, comment?: string, fields?: any[] },
 *   endTable: { x: number, y: number, width?: number, comment?: string, fields?: any[] },
 *   startFieldIndices: number[],
 *   endFieldIndices: number[],
 * }} r
 * @returns {{
 *   path: string,
 *   labelPoint: { x: number, y: number },
 *   startCardinality: { x: number, y: number },
 *   endCardinality: { x: number, y: number },
 * } | null}
 */
export function calcCompositePath(r, zoom = 1, showComments = true) {
  if (!r || !r.startFieldIndices?.length || !r.endFieldIndices?.length) {
    return null;
  }

  const startTableWidth = getTableWidth(r.startTable);
  const endTableWidth = getTableWidth(r.endTable);
  const startWidth = startTableWidth * zoom;
  const endWidth = endTableWidth * zoom;
  const anchorY = (table, index, tableWidth) =>
    table.y +
    tableHeaderHeight +
    getCommentHeight(table.comment, tableWidth, showComments) +
    getFieldOffsetY(
      table.fields ?? [],
      index,
      tableWidth,
      showComments,
      table.fieldHeights,
    ) +
    getFieldContentHeight(table.fields?.[index], table.fieldHeights) / 2;

  const startYs = r.startFieldIndices.map(
    (i, pairIndex) =>
      anchorY(r.startTable, i, startTableWidth) +
      (r.startFieldOffsets?.[pairIndex] ?? 0) * zoom,
  );
  const endYs = r.endFieldIndices.map(
    (i, pairIndex) =>
      anchorY(r.endTable, i, endTableWidth) +
      (r.endFieldOffsets?.[pairIndex] ?? 0) * zoom,
  );

  // Connect each table on the edge facing the other table.
  const startCenter = r.startTable.x + startWidth / 2;
  const endCenter = r.endTable.x + endWidth / 2;
  const startIsLeft = startCenter <= endCenter;
  const startSide = r.startSide ?? (startIsLeft ? 1 : -1);
  const endSide = r.endSide ?? -startSide;
  const startX = r.startTable.x + (startSide > 0 ? startWidth : 0);
  const endX = r.endTable.x + (endSide > 0 ? endWidth : 0);
  const fork = (24 + (r.routePadding ?? 0) + (r.routeOffset ?? 0)) * zoom;
  const mergeStartX = startX + startSide * fork;
  const mergeEndX = endX + endSide * fork;

  const minS = Math.min(...startYs);
  const maxS = Math.max(...startYs);
  const minE = Math.min(...endYs);
  const maxE = Math.max(...endYs);
  const trunkStartY = (minS + maxS) / 2;
  const trunkEndY = (minE + maxE) / 2;
  const midX =
    startSide === endSide
      ? startSide > 0
        ? Math.max(mergeStartX, mergeEndX) + 30 * zoom
        : Math.min(mergeStartX, mergeEndX) - 30 * zoom
      : (mergeStartX + mergeEndX) / 2;

  const radius = 10 * zoom;

  // A column branch: horizontal stub from the table edge to the collector x,
  // a rounded corner, then a vertical run down to the trunk level. Branches
  // overlap on the collector x, reading as a single fork that converges into
  // the trunk.
  const branch = (fromX, fromY, cornerX, toY) => {
    if (Math.abs(fromY - toY) < 0.5) {
      return `M ${fromX} ${fromY} L ${cornerX} ${toY}`;
    }
    const dx = Math.sign(cornerX - fromX);
    const dy = Math.sign(toY - fromY);
    const r = Math.min(
      radius,
      Math.abs(toY - fromY),
      Math.abs(cornerX - fromX),
    );
    return `M ${fromX} ${fromY} L ${cornerX - dx * r} ${fromY} Q ${cornerX} ${fromY} ${cornerX} ${fromY + dy * r} L ${cornerX} ${toY}`;
  };

  const segs = [];
  // Each start column forks into the trunk.
  startYs.forEach((y) =>
    segs.push(branch(startX, y, mergeStartX, trunkStartY)),
  );
  // Single trunk between the two collectors.
  segs.push(
    roundedTrunk(mergeStartX, trunkStartY, mergeEndX, trunkEndY, midX, zoom),
  );
  // Each end column forks out of the trunk.
  endYs.forEach((y) => segs.push(branch(endX, y, mergeEndX, trunkEndY)));

  return {
    path: segs.join(" "),
    labelPoint: { x: midX, y: (trunkStartY + trunkEndY) / 2 },
    startCardinality: { x: mergeStartX, y: trunkStartY },
    endCardinality: { x: mergeEndX, y: trunkEndY },
  };
}

// Rounded orthogonal connector. The same construction works for opposing edges,
// outer-edge loops and coincident/self-referencing fields.
function roundedTrunk(sx, sy, ex, ey, mx, zoom) {
  if (
    Math.abs(sy - ey) < 0.5 &&
    mx >= Math.min(sx, ex) &&
    mx <= Math.max(sx, ex)
  ) {
    return `M ${sx} ${sy} L ${ex} ${ey}`;
  }
  // A self-reference needs a loop even when both ends share a row centre.
  if (Math.abs(sx - ex) < 0.5 && Math.abs(sy - ey) < 0.5) {
    return `M ${sx} ${sy} H ${mx} V ${sy - 20 * zoom} H ${ex} V ${ey}`;
  }
  const dy = Math.sign(ey - sy);
  const dxs = Math.sign(mx - sx);
  const dxe = Math.sign(ex - mx);
  const radius = Math.min(
    10 * zoom,
    Math.abs(ey - sy) / 2,
    Math.abs(mx - sx),
    Math.abs(ex - mx),
  );
  return `M ${sx} ${sy} L ${mx - dxs * radius} ${sy} Q ${mx} ${sy} ${mx} ${sy + dy * radius} L ${mx} ${ey - dy * radius} Q ${mx} ${ey} ${mx + dxe * radius} ${ey} L ${ex} ${ey}`;
}
