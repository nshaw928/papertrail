"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TopicNode } from "@/lib/types/app";
import cytoscape from "cytoscape";

interface TopicGraphProps {
  topics: TopicNode[];
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
  0: 50,
  1: 35,
  2: 25,
  3: 18,
};

function buildAncestryPath(
  topic: TopicNode,
  topicMap: Map<string, TopicNode>
): string {
  const parts: string[] = [];
  let current: TopicNode | undefined = topic;
  while (current) {
    parts.unshift(current.name);
    current = current.parent_topic_id
      ? topicMap.get(current.parent_topic_id)
      : undefined;
  }
  return parts.join("/");
}

export default function TopicGraph({ topics }: TopicGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const buildElements = useCallback(() => {
    const topicMap = new Map(topics.map((t) => [t.id, t]));
    const topicIds = new Set(topics.map((t) => t.id));

    // Group by level and sort by ancestry path within each level
    const byLevel = new Map<number, TopicNode[]>();
    for (const t of topics) {
      const group = byLevel.get(t.level) ?? [];
      group.push(t);
      byLevel.set(t.level, group);
    }

    // Sort each level by ancestry path and assign sort fractions
    const sortFractions = new Map<string, number>();
    for (const [, group] of byLevel) {
      group.sort((a, b) =>
        buildAncestryPath(a, topicMap).localeCompare(
          buildAncestryPath(b, topicMap)
        )
      );
      group.forEach((t, i) => {
        sortFractions.set(t.id, i / Math.max(group.length, 1));
      });
    }

    const nodes = topics.map((t) => ({
      data: {
        id: t.id,
        label: t.name,
        level: t.level,
        works_count: t.works_count ?? 0,
        concentricValue: 3 - t.level + 1 + (sortFractions.get(t.id) ?? 0),
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
            label: "data(label)",
            color: "#e2e8f0",
            "font-size": "11px",
            "font-weight": "bold" as const,
            "text-wrap": "ellipsis",
            "text-max-width": "140px",
            "text-valign": "bottom",
            "text-margin-y": 8,
            width: LEVEL_SIZES[0],
            height: LEVEL_SIZES[0],
          },
        },
        {
          selector: "node[level = 1]",
          style: {
            "background-color": LEVEL_COLORS[1],
            label: "data(label)",
            color: "#94a3b8",
            "font-size": "9px",
            "text-wrap": "ellipsis",
            "text-max-width": "110px",
            "text-valign": "bottom",
            "text-margin-y": 6,
            width: LEVEL_SIZES[1],
            height: LEVEL_SIZES[1],
          },
        },
        {
          selector: "node[level = 2]",
          style: {
            "background-color": LEVEL_COLORS[2],
            label: "data(label)",
            color: "#94a3b8",
            "font-size": "8px",
            "text-wrap": "ellipsis",
            "text-max-width": "90px",
            "text-valign": "bottom",
            "text-margin-y": 5,
            width: LEVEL_SIZES[2],
            height: LEVEL_SIZES[2],
          },
        },
        {
          selector: "node[level = 3]",
          style: {
            "background-color": LEVEL_COLORS[3],
            label: "data(label)",
            color: "#94a3b8",
            "font-size": "7px",
            "text-wrap": "ellipsis",
            "text-max-width": "80px",
            "text-valign": "bottom",
            "text-margin-y": 4,
            width: LEVEL_SIZES[3],
            height: LEVEL_SIZES[3],
          },
        },
        {
          selector: "edge",
          style: {
            "line-color": "#334155",
            width: 1,
            opacity: 0.4,
            "curve-style": "bezier",
          },
        },
        {
          selector: "node.dimmed",
          style: {
            opacity: 0.15,
          },
        },
        {
          selector: "edge.dimmed",
          style: {
            opacity: 0.05,
          },
        },
        {
          selector: "node.highlighted",
          style: {
            opacity: 1,
            "border-width": 2,
            "border-color": "#fff",
          },
        },
        {
          selector: "edge.highlighted",
          style: {
            opacity: 0.8,
            "line-color": "#94a3b8",
            width: 2,
          },
        },
      ],
      layout: {
        name: "concentric",
        concentric(node: cytoscape.NodeSingular) {
          return node.data("concentricValue") as number;
        },
        levelWidth() {
          return 1;
        },
        animate: false,
        minNodeSpacing: 30,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      minZoom: 0.1,
      maxZoom: 3,
    });

    cy.on("tap", "node", (evt) => {
      const id = evt.target.id();
      router.push(`/topics/${id}`);
    });

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass("dimmed");
      neighborhood.removeClass("dimmed").addClass("highlighted");
    });

    cy.on("mouseout", "node", () => {
      cy.elements().removeClass("dimmed").removeClass("highlighted");
    });

    return () => {
      cy.destroy();
    };
  }, [buildElements, router]);

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full">
      <div ref={containerRef} className="h-full w-full" />
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
