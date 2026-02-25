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

const LEVEL_PADDING: Record<number, number> = {
  0: 30,
  1: 20,
  2: 12,
  3: 8,
};

const LEVEL_BORDER_COLORS: Record<number, string> = {
  0: "#9db3ff",
  1: "#b08df8",
  2: "#fba54d",
  3: "#5ee3f2",
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
        {
          selector: "node[level = 0]",
          style: {
            "background-color": LEVEL_COLORS[0],
            "background-opacity": 0.9,
            label: "",
            width: LEVEL_SIZES[0],
            height: LEVEL_SIZES[0],
            "border-width": 2,
            "border-color": LEVEL_BORDER_COLORS[0],
            "border-opacity": 0.3,
            cursor: "pointer",
            "transition-property": "width, height, border-width, border-color",
            "transition-duration": "150ms",
          },
        },
        {
          selector: "node[level = 1]",
          style: {
            "background-color": LEVEL_COLORS[1],
            "background-opacity": 0.9,
            label: "",
            width: LEVEL_SIZES[1],
            height: LEVEL_SIZES[1],
            "border-width": 2,
            "border-color": LEVEL_BORDER_COLORS[1],
            "border-opacity": 0.3,
            cursor: "pointer",
            "transition-property": "width, height, border-width, border-color",
            "transition-duration": "150ms",
          },
        },
        {
          selector: "node[level = 2]",
          style: {
            "background-color": LEVEL_COLORS[2],
            "background-opacity": 0.9,
            label: "",
            width: LEVEL_SIZES[2],
            height: LEVEL_SIZES[2],
            "border-width": 2,
            "border-color": LEVEL_BORDER_COLORS[2],
            "border-opacity": 0.3,
            cursor: "pointer",
            "transition-property": "width, height, border-width, border-color",
            "transition-duration": "150ms",
          },
        },
        {
          selector: "node[level = 3]",
          style: {
            "background-color": LEVEL_COLORS[3],
            "background-opacity": 0.9,
            label: "",
            width: LEVEL_SIZES[3],
            height: LEVEL_SIZES[3],
            "border-width": 2,
            "border-color": LEVEL_BORDER_COLORS[3],
            "border-opacity": 0.3,
            cursor: "pointer",
            "transition-property": "width, height, border-width, border-color",
            "transition-duration": "150ms",
          },
        },
        {
          selector: "edge",
          style: {
            opacity: 0,
            width: 0,
            events: "no",
          },
        },
        {
          selector: "node.hovered",
          style: {
            label: "data(label)",
            color: "#fff",
            "font-size": "10px",
            "font-weight": "bold",
            "text-wrap": "ellipsis",
            "text-max-width": "140px",
            "text-valign": "top",
            "text-margin-y": -8,
            "text-background-color": "#1e293b",
            "text-background-opacity": 0.85,
            "text-background-padding": "4px",
            "text-background-shape": "roundrectangle",
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
        nodeRepulsion: (node: cytoscape.NodeSingular) => {
          const level = node.data("level") as number;
          const padding = LEVEL_PADDING[level] ?? 12;
          const size = LEVEL_SIZES[level] ?? 32;
          return (size + padding) * 100;
        },
        nodeOverlap: 20,
        idealEdgeLength: (edge: cytoscape.EdgeSingular) => 60,
        edgeElasticity: (edge: cytoscape.EdgeSingular) => 100,
        gravity: 0.8,
        numIter: 5000,
        nodeDimensionsIncludeLabels: false,
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

    return () => {
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
