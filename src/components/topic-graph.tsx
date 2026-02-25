"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { TopicNode } from "@/lib/types/app";
import cytoscape from "cytoscape";

interface TopicGraphProps {
  topics: TopicNode[];
  children?: ReactNode;
}

const LEVEL_COLORS: Record<number, string> = {
  0: "#6c8cff",
  1: "#8b5cf6",
  2: "#f97316",
  3: "#22d3ee",
};

const LEVEL_LABELS: Record<number, string> = {
  0: "Domain",
  1: "Field",
  2: "Subfield",
  3: "Topic",
};

const LEVEL_SIZES: Record<number, number> = {
  0: 90,
  1: 65,
  2: 45,
  3: 32,
};

const LABEL_FONT_SIZES: Record<number, number> = { 0: 14, 1: 12, 2: 11, 3: 10 };
const LABEL_WRAP_WIDTH: Record<number, number> = { 0: 180, 1: 160, 2: 140, 3: 120 };

const LEVEL_BORDER_COLORS: Record<number, string> = {
  0: "#9db3ff",
  1: "#b08df8",
  2: "#fba54d",
  3: "#5ee3f2",
};

const LABEL_ZOOM_THRESHOLDS: Record<number, number> = {
  0: 0,
  1: 0,
  2: 0.45,
  3: 0.8,
};

export default function TopicGraph({ topics, children }: TopicGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const buildElements = useCallback(() => {
    const topicIds = new Set(topics.map((t) => t.id));

    const nodes = topics.map((t) => ({
      data: {
        id: t.id,
        label: t.name,
        level: t.level,
        works_count: t.works_count ?? 0,
      },
    }));

    const edges = topics
      .filter((t) => t.parent_topic_id && topicIds.has(t.parent_topic_id))
      .map((t) => ({
        data: {
          id: `e-${t.parent_topic_id}-${t.id}`,
          source: t.parent_topic_id!,
          target: t.id,
        },
      }));

    return [...nodes, ...edges];
  }, [topics]);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(),
      style: [
        ...([0, 1, 2, 3] as const).map((level) => ({
          selector: `node[level = ${level}]`,
          style: {
            "background-color": LEVEL_COLORS[level],
            "background-opacity": 0.9,
            width: LEVEL_SIZES[level],
            height: LEVEL_SIZES[level],
            "border-width": 2,
            "border-color": LEVEL_BORDER_COLORS[level],
            "border-opacity": 0.3,
            cursor: "pointer",
            "transition-property": "width, height, border-width, border-color",
            "transition-duration": "150ms",
            // Invisible native labels — layout engine measures these for spacing
            label: "data(label)",
            "text-opacity": 0,
            "font-size": LABEL_FONT_SIZES[level],
            "text-wrap": "wrap",
            "text-max-width": `${LABEL_WRAP_WIDTH[level]}px`,
            "text-valign": "bottom",
            "text-margin-y": 8,
          },
        })),
        {
          selector: "edge",
          style: {
            opacity: 0.15,
            width: 1,
            "line-color": "#475569",
            "curve-style": "bezier",
            events: "no",
          },
        },
        {
          selector: "node.hovered",
          style: {
            "border-width": 3,
            "border-color": "#ffffff",
            "border-opacity": 1,
            "background-opacity": 1,
            "z-index": 999,
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      layout: {
        name: "cose",
        nodeDimensionsIncludeLabels: true,
        nodeRepulsion: (node: cytoscape.NodeSingular) => {
          const level = node.data("level") as number;
          const size = LEVEL_SIZES[level] ?? 32;
          return size * 120;
        },
        nodeOverlap: 20,
        idealEdgeLength: () => 120,
        edgeElasticity: () => 150,
        gravity: 0.25,
        numIter: 5000,
        fit: true,
        padding: 30,
        animate: true,
        animationDuration: 600,
        randomize: true,
      } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.3,
    });

    cy.on("tap", "node", (evt) => {
      const id = evt.target.id();
      router.push(`/topics/${id}`);
    });

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      node.addClass("hovered");

      const baseSize = LEVEL_SIZES[node.data("level") as number] ?? 25;
      const hoverSize = Math.round(baseSize * 1.25);
      node.animate(
        { style: { width: hoverSize, height: hoverSize } },
        { duration: 150, easing: "ease-out-cubic" as cytoscape.Css.TransitionTimingFunction }
      );
    });

    cy.on("mouseout", "node", (evt) => {
      const node = evt.target;
      node.removeClass("hovered");

      const baseSize = LEVEL_SIZES[node.data("level") as number] ?? 25;
      node.animate(
        { style: { width: baseSize, height: baseSize } },
        { duration: 150, easing: "ease-out-cubic" as cytoscape.Css.TransitionTimingFunction }
      );
    });

    // HTML label overlay
    const labelLayer = document.createElement("div");
    labelLayer.style.cssText =
      "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
    containerRef.current.style.position = "relative";
    containerRef.current.appendChild(labelLayer);

    const labelEls = new Map<string, HTMLDivElement>();

    cy.nodes().forEach((node) => {
      const el = document.createElement("div");
      const level = node.data("level") as number;
      const fontSize = LABEL_FONT_SIZES[level] ?? 8;
      const wrapWidth = LABEL_WRAP_WIDTH[level] ?? 120;
      el.textContent = node.data("label") as string;
      el.style.cssText = `
        position:absolute;
        transform:translate(-50%,0);
        color:#e2e8f0;
        font-size:${fontSize}px;
        line-height:1.3;
        width:fit-content;
        max-width:${wrapWidth}px;
        text-align:center;
        background:rgba(15,23,42,0.82);
        padding:4px 10px;
        border-radius:9999px;
        white-space:nowrap;
        pointer-events:none;
        opacity:0;
        transition:opacity 0.15s;
        transform-origin:center top;
      `;
      labelLayer.appendChild(el);
      labelEls.set(node.id(), el);

      // If text is wider than wrap threshold, allow 2-line wrapping
      if (el.scrollWidth > wrapWidth) {
        el.style.whiteSpace = "normal";
        el.style.borderRadius = "12px";
      }
    });

    const LABEL_MIN_SCALE: Record<number, number> = { 0: 1, 1: 0.55, 2: 0.3, 3: 0.25 };

    // Capture initial zoom after layout so field labels only appear when zoomed past it
    let initialZoom = Infinity;

    function updateLabelPositions() {
      const zoom = cy.zoom();
      const pan = cy.pan();
      cy.nodes().forEach((node) => {
        const el = labelEls.get(node.id());
        if (!el) return;
        const level = node.data("level") as number;
        const threshold = level === 1 ? initialZoom : (LABEL_ZOOM_THRESHOLDS[level] ?? 1);
        const visible = zoom >= threshold;
        el.style.opacity = visible ? "1" : "0";
        if (!visible) return;
        const minScale = LABEL_MIN_SCALE[level] ?? 0.25;
        const scale = Math.max(minScale, Math.pow(zoom, 0.75));
        const pos = node.position();
        const size = LEVEL_SIZES[level] ?? 32;
        const x = pos.x * zoom + pan.x;
        const y = pos.y * zoom + pan.y + (size / 2) * zoom + 6;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = `translate(-50%,0) scale(${scale})`;
      });
    }

    cy.one("layoutstop", () => {
      initialZoom = cy.zoom() * 1.1;
      updateLabelPositions();
    });
    cy.on("zoom pan", updateLabelPositions);
    cy.on("position", "node", updateLabelPositions);

    return () => {
      labelLayer.remove();
      cy.destroy();
    };
  }, [buildElements, router]);

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full">
      <div ref={containerRef} className="h-full w-full" />
      {children}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 rounded-full bg-card/80 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
        {Object.entries(LEVEL_COLORS).map(([level, color]) => (
          <span key={level} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {LEVEL_LABELS[Number(level)]}
          </span>
        ))}
      </div>
    </div>
  );
}
