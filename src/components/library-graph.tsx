"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LibraryGraphData } from "@/lib/types/app";
import cytoscape from "cytoscape";

interface LibraryGraphProps {
  data: LibraryGraphData;
}

const TOPIC_LEVEL_COLORS: Record<number, string> = {
  0: "#6c8cff",
  1: "#8b5cf6",
  2: "#f97316",
  3: "#22d3ee",
};

const TOPIC_LEVEL_SIZES: Record<number, number> = {
  0: 60,
  1: 45,
  2: 35,
  3: 28,
};

const PAPER_COLOR = "#3b82f6";
const PAPER_SIZE = 40;

const LABEL_FONT_SIZES: Record<string, number> = {
  paper: 11,
  topic_0: 13,
  topic_1: 11,
  topic_2: 10,
  topic_3: 9,
};

const LABEL_WRAP_WIDTHS: Record<string, number> = {
  paper: 160,
  topic_0: 180,
  topic_1: 160,
  topic_2: 140,
  topic_3: 120,
};

export default function LibraryGraph({ data }: LibraryGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const buildElements = useCallback(() => {
    const nodes = data.nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        nodeType: n.type,
        level: n.level ?? -1,
        year: n.year,
        cited_by_count: n.cited_by_count ?? 0,
      },
    }));

    const nodeIds = new Set(data.nodes.map((n) => n.id));
    const edges = data.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e, i) => ({
        data: {
          id: `e-${i}`,
          source: e.source,
          target: e.target,
          edgeType: e.type,
        },
      }));

    return [...nodes, ...edges];
  }, [data]);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(),
      style: [
        // Paper nodes
        {
          selector: "node[nodeType = 'paper']",
          style: {
            "background-color": PAPER_COLOR,
            "background-opacity": 0.9,
            width: PAPER_SIZE,
            height: PAPER_SIZE,
            shape: "round-rectangle",
            "border-width": 2,
            "border-color": "#60a5fa",
            "border-opacity": 0.3,
            cursor: "pointer",
            "transition-property":
              "width, height, border-width, border-color",
            "transition-duration": "150ms",
            label: "data(label)",
            "text-opacity": 0,
            "font-size": 11,
            "text-wrap": "wrap",
            "text-max-width": "160px",
            "text-valign": "bottom",
            "text-margin-y": 8,
          },
        },
        // Topic nodes by level
        ...([0, 1, 2, 3] as const).map((level) => ({
          selector: `node[nodeType = 'topic'][level = ${level}]`,
          style: {
            "background-color": TOPIC_LEVEL_COLORS[level],
            "background-opacity": 0.85,
            width: TOPIC_LEVEL_SIZES[level],
            height: TOPIC_LEVEL_SIZES[level],
            "border-width": 2,
            "border-color": TOPIC_LEVEL_COLORS[level],
            "border-opacity": 0.3,
            cursor: "pointer",
            "transition-property":
              "width, height, border-width, border-color",
            "transition-duration": "150ms",
            label: "data(label)",
            "text-opacity": 0,
            "font-size": LABEL_FONT_SIZES[`topic_${level}`] ?? 10,
            "text-wrap": "wrap",
            "text-max-width": `${LABEL_WRAP_WIDTHS[`topic_${level}`] ?? 120}px`,
            "text-valign": "bottom",
            "text-margin-y": 8,
          },
        })),
        // has_topic edges
        {
          selector: "edge[edgeType = 'has_topic']",
          style: {
            opacity: 0.12,
            width: 1,
            "line-color": "#475569",
            "curve-style": "bezier",
            events: "no",
          },
        },
        // cites edges
        {
          selector: "edge[edgeType = 'cites']",
          style: {
            opacity: 0.3,
            width: 1.5,
            "line-color": "#60a5fa",
            "line-style": "dashed",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#60a5fa",
            "arrow-scale": 0.8,
            events: "no",
          },
        },
        // topic_parent edges
        {
          selector: "edge[edgeType = 'topic_parent']",
          style: {
            opacity: 0.15,
            width: 1,
            "line-color": "#475569",
            "curve-style": "bezier",
            events: "no",
          },
        },
        // Hover state
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
          const type = node.data("nodeType") as string;
          if (type === "paper") return PAPER_SIZE * 100;
          const level = node.data("level") as number;
          const size = TOPIC_LEVEL_SIZES[level] ?? 28;
          return size * 100;
        },
        nodeOverlap: 20,
        idealEdgeLength: () => 100,
        edgeElasticity: () => 150,
        gravity: 0.3,
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

    // Navigation
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const type = node.data("nodeType") as string;
      const id = node.id();
      if (type === "paper") {
        router.push(`/paper/${id}`);
      } else {
        router.push(`/topics/${id}`);
      }
    });

    // Hover effects
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      node.addClass("hovered");
      const type = node.data("nodeType") as string;
      const baseSize =
        type === "paper"
          ? PAPER_SIZE
          : (TOPIC_LEVEL_SIZES[node.data("level") as number] ?? 28);
      const hoverSize = Math.round(baseSize * 1.25);
      node.animate(
        { style: { width: hoverSize, height: hoverSize } },
        {
          duration: 150,
          easing:
            "ease-out-cubic" as cytoscape.Css.TransitionTimingFunction,
        }
      );
    });

    cy.on("mouseout", "node", (evt) => {
      const node = evt.target;
      node.removeClass("hovered");
      const type = node.data("nodeType") as string;
      const baseSize =
        type === "paper"
          ? PAPER_SIZE
          : (TOPIC_LEVEL_SIZES[node.data("level") as number] ?? 28);
      node.animate(
        { style: { width: baseSize, height: baseSize } },
        {
          duration: 150,
          easing:
            "ease-out-cubic" as cytoscape.Css.TransitionTimingFunction,
        }
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
      const type = node.data("nodeType") as string;
      const level = node.data("level") as number;
      const key = type === "paper" ? "paper" : `topic_${level}`;
      const fontSize = LABEL_FONT_SIZES[key] ?? 10;
      const wrapWidth = LABEL_WRAP_WIDTHS[key] ?? 120;
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

      if (el.scrollWidth > wrapWidth) {
        el.style.whiteSpace = "normal";
        el.style.borderRadius = "12px";
      }
    });

    let initialZoom = Infinity;

    function updateLabelPositions() {
      const zoom = cy.zoom();
      const pan = cy.pan();
      cy.nodes().forEach((node) => {
        const el = labelEls.get(node.id());
        if (!el) return;
        const type = node.data("nodeType") as string;
        const level = node.data("level") as number;

        // Zoom thresholds per type
        let threshold: number;
        if (type === "paper") {
          threshold = initialZoom * 0.8;
        } else if (level === 0) {
          threshold = 0;
        } else if (level === 1) {
          threshold = initialZoom;
        } else {
          threshold = initialZoom * 1.3;
        }

        const visible = zoom >= threshold;
        el.style.opacity = visible ? "1" : "0";
        if (!visible) return;

        const scale = Math.max(0.3, Math.pow(zoom, 0.75));
        const pos = node.position();
        const baseSize =
          type === "paper"
            ? PAPER_SIZE
            : (TOPIC_LEVEL_SIZES[level] ?? 28);
        const x = pos.x * zoom + pan.x;
        const y = pos.y * zoom + pan.y + (baseSize / 2) * zoom + 6;
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
    <div className="relative h-[calc(100dvh-3rem)] w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-4 rounded-2xl bg-card/80 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: PAPER_COLOR }}
          />
          Paper
        </span>
        {Object.entries(TOPIC_LEVEL_COLORS).map(([level, color]) => (
          <span key={level} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {["Domain", "Field", "Subfield", "Topic"][Number(level)]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-blue-400" />
          Cites
        </span>
      </div>
    </div>
  );
}
