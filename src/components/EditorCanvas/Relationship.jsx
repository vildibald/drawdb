import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Cardinality,
  ObjectType,
  Tab,
  darkBgTheme,
} from "../../data/constants";
import { calcPath, calcCompositePath } from "../../utils/calcPath";
import { useSettings, useLayout, useSelect } from "../../hooks";
import { useTranslation } from "react-i18next";
import { SideSheet } from "@douyinfe/semi-ui";
import RelationshipInfo from "../EditorSidePanel/RelationshipsTab/RelationshipInfo";
import {
  getVisibleFieldIndex,
  getVisibleFields,
  getRelationshipFields,
  getTableWidth,
} from "../../utils/utils";

import { inferRelationshipCardinality } from "../../utils/relationshipCardinality";

const labelFontSize = 16;
const cardinalityOffset = 28;

export default memo(function Relationship({
  data,
  startTable,
  endTable,
  relationships,
  offsets,
}) {
  const { layout } = useLayout();
  const { selectedElement, setSelectedElement } = useSelect();
  const { t } = useTranslation();

  const edit = useCallback(() => {
    setSelectedElement((prev) => ({
      ...prev,
      ...(layout.sidebar && { currentTab: Tab.RELATIONSHIPS }),
      element: ObjectType.RELATIONSHIP,
      id: data.id,
      open: true,
    }));
    if (layout.sidebar) {
      document
        .getElementById(`scroll_ref_${data.id}`)
        ?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data.id, layout.sidebar, setSelectedElement]);

  return (
    <>
      <RelationshipPath
        data={data}
        startTable={startTable}
        endTable={endTable}
        relationships={relationships}
        offsets={offsets}
        onEdit={edit}
      />
      <SideSheet
        title={t("edit")}
        size="small"
        visible={
          selectedElement.element === ObjectType.RELATIONSHIP &&
          selectedElement.id === data.id &&
          selectedElement.open &&
          !layout.sidebar
        }
        onCancel={() => {
          setSelectedElement((prev) => ({
            ...prev,
            open: false,
          }));
        }}
        style={{ paddingBottom: "16px" }}
      >
        <div className="sidesheet-theme">
          <RelationshipInfo data={data} />
        </div>
      </SideSheet>
    </>
  );
});

const RelationshipPath = memo(function RelationshipPath({
  data,
  startTable,
  endTable,
  relationships,
  onEdit,
  offsets,
}) {
  const { settings } = useSettings();
  const { t } = useTranslation();

  const pathValues = useMemo(() => {
    if (!startTable || !endTable || startTable.hidden || endTable.hidden)
      return null;

    const startFields = getVisibleFields(startTable, relationships);
    const endFields = getVisibleFields(endTable, relationships);

    const pairs = getRelationshipFields(data);

    return {
      ...offsets,
      startOffset: offsets?.startFieldOffsets[0] ?? 0,
      endOffset: offsets?.endFieldOffsets[0] ?? 0,
      routeOffset:
        offsets?.endFieldOffsets.find((offset) => offset !== 0) ??
        offsets?.startFieldOffsets.find((offset) => offset !== 0) ??
        0,
      startFieldIndex: getVisibleFieldIndex(
        startTable,
        data.startFieldId,
        relationships,
      ),
      endFieldIndex: getVisibleFieldIndex(
        endTable,
        data.endFieldId,
        relationships,
      ),
      startFieldIndices: pairs.map((p) =>
        getVisibleFieldIndex(startTable, p.startFieldId, relationships),
      ),
      endFieldIndices: pairs.map((p) =>
        getVisibleFieldIndex(endTable, p.endFieldId, relationships),
      ),
      startTable: {
        x: startTable.x,
        y: startTable.y,
        width: getTableWidth(startTable),
        comment: startTable.comment,
        fields: startFields,
      },
      endTable: {
        x: endTable.x,
        y: endTable.y,
        width: getTableWidth(endTable),
        comment: endTable.comment,
        fields: endFields,
      },
    };
  }, [startTable, endTable, relationships, data, offsets]);

  const crowsFoot = settings.notation === "crows_foot";
  const inferred = inferRelationshipCardinality(
    startTable,
    getRelationshipFields(data).map((pair) => pair.startFieldId),
  );

  const isComposite = (pathValues?.startFieldIndices?.length ?? 0) > 1;

  const composite = useMemo(() => {
    if (!pathValues || !isComposite) return null;
    return calcCompositePath(pathValues, 1, settings.showComments);
  }, [pathValues, isComposite, settings.showComments]);

  const d = useMemo(() => {
    if (!pathValues) return null;
    if (composite) return composite.path;
    return calcPath(pathValues, 1, settings.showComments);
  }, [pathValues, composite, settings.showComments]);

  const pathRef = useRef();
  const labelRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [anchors, setAnchors] = useState(null);

  useLayoutEffect(() => {
    if (!d || !pathRef.current) {
      setAnchors(null);
      return;
    }

    const labelBox = labelRef.current?.getBBox();
    const labelWidth = labelBox?.width ?? 0;
    const labelHeight = labelBox?.height ?? 0;

    let labelPoint, startPoint, endPoint;
    if (composite) {
      labelPoint = composite.labelPoint;
      startPoint = composite.startCardinality;
      endPoint = composite.endCardinality;
    } else {
      const path = pathRef.current;
      const pathLength = path.getTotalLength();
      labelPoint = path.getPointAtLength(pathLength / 2);
      startPoint = path.getPointAtLength(cardinalityOffset);
      endPoint = path.getPointAtLength(pathLength - cardinalityOffset);
    }

    const path = pathRef.current;
    const length = path.getTotalLength();
    const startTip = composite
      ? composite.startCardinality
      : path.getPointAtLength(0);
    const endTip = composite
      ? composite.endCardinality
      : path.getPointAtLength(length);
    const direction = (tip, inside, table) =>
      composite
        ? tip.x > table.x + getTableWidth(table) / 2
          ? 1
          : -1
        : inside.x >= tip.x
          ? 1
          : -1;

    setAnchors({
      startTip: {
        x: startTip.x,
        y: startTip.y,
        direction: direction(
          startTip,
          path.getPointAtLength(Math.min(1, length)),
          pathValues.startTable,
        ),
      },
      endTip: {
        x: endTip.x,
        y: endTip.y,
        direction: direction(
          endTip,
          path.getPointAtLength(Math.max(0, length - 1)),
          pathValues.endTable,
        ),
      },
      label: {
        x: labelPoint.x - labelWidth / 2,
        y: labelPoint.y + labelHeight / 2,
      },
      start: { x: startPoint.x, y: startPoint.y },
      end: { x: endPoint.x, y: endPoint.y },
    });
  }, [d, composite, pathValues, data.name, settings.showRelationshipLabels]);

  let cardinalityStart = "1";
  let cardinalityEnd = "1";

  switch (data.cardinality) {
    // the translated values are to ensure backwards compatibility
    case t(Cardinality.MANY_TO_ONE):
    case Cardinality.MANY_TO_ONE:
      cardinalityStart = data.manyLabel || "n";
      cardinalityEnd = "1";
      break;
    case t(Cardinality.ONE_TO_MANY):
    case Cardinality.ONE_TO_MANY:
      cardinalityStart = "1";
      cardinalityEnd = data.manyLabel || "n";
      break;
    case t(Cardinality.ONE_TO_ONE):
    case Cardinality.ONE_TO_ONE:
      cardinalityStart = "1";
      cardinalityEnd = "1";
      break;
    default:
      break;
  }

  if (!d) return null;

  return (
    <g
      className="select-none group"
      onDoubleClick={onEdit}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* invisible wider path for better hover ux */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        cursor="pointer"
      />
      <path
        ref={pathRef}
        d={d}
        className="relationship-path"
        style={{ stroke: hovered ? undefined : data.color }}
        fill="none"
        cursor="pointer"
      />
      {settings.showRelationshipLabels && (
        <text
          x={anchors?.label.x ?? 0}
          y={anchors?.label.y ?? 0}
          fill={data.color ?? (settings.mode === "dark" ? "lightgrey" : "#333")}
          fontSize={labelFontSize}
          fontWeight={500}
          ref={labelRef}
          className="group-hover:fill-sky-600"
        >
          {data.name}
        </text>
      )}
      {anchors && settings.showCardinality && crowsFoot && (
        <>
          <CrowsFoot
            anchor={anchors.startTip}
            cardinality={inferred.start}
            color={data.color}
            mode={settings.mode}
          />
          <CrowsFoot
            anchor={anchors.endTip}
            cardinality={inferred.end}
            color={data.color}
            mode={settings.mode}
          />
        </>
      )}
      {anchors && settings.showCardinality && !crowsFoot && (
        <>
          <CardinalityLabel
            x={anchors.start.x}
            y={anchors.start.y}
            text={cardinalityStart}
            color={data.color}
          />
          <CardinalityLabel
            x={anchors.end.x}
            y={anchors.end.y}
            text={cardinalityEnd}
            color={data.color}
          />
        </>
      )}
    </g>
  );
});

function CardinalityLabel({ x, y, text, color, r = 12, padding = 14 }) {
  const [textWidth, setTextWidth] = useState(0);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      const bbox = textRef.current.getBBox();
      setTextWidth(bbox.width);
    }
  }, [text]);

  return (
    <g>
      <rect
        x={x - textWidth / 2 - padding / 2}
        y={y - r}
        rx={r}
        ry={r}
        width={textWidth + padding}
        height={r * 2}
        fill={color ?? "grey"}
        className="group-hover:fill-sky-600"
      />
      <text
        ref={textRef}
        x={x}
        y={y}
        fill="white"
        strokeWidth="0.5"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {text}
      </text>
    </g>
  );
}

function CrowsFoot({ anchor, cardinality, color, mode }) {
  return (
    <g
      transform={`translate(${anchor.x} ${anchor.y}) scale(${anchor.direction} 1)`}
      stroke={color ?? "grey"}
      strokeWidth={1.5}
      fill="none"
      className="group-hover:stroke-sky-600"
      pointerEvents="none"
    >
      {cardinality.max === "many" ? (
        <path d="M 0 -7 L 14 0 L 0 7" />
      ) : (
        <path d="M 7 -7 V 7" />
      )}
      {cardinality.min === 0 ? (
        <circle
          cx={21}
          cy={0}
          r={4}
          fill={mode === "dark" ? darkBgTheme : "white"}
        />
      ) : (
        <path d="M 17 -7 V 7" />
      )}
    </g>
  );
}
