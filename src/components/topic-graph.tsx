"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TopicNode } from "@/lib/types/app";
import cytoscape from "cytoscape";
import { ensureCoseBilkent } from "@/lib/cytoscape-setup";

ensureCoseBilkent();

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

export default function TopicGraph({ topics }: TopicGraphProps) {
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
            label: "data(label)",
            color: "#e2e8f0",
            "font-size": "11px",
            "font-weight": "bold" as const,
            "text-wrap": "ellipsis",
            "text-max-width": "140px",
            "text-valign": "bottom",
            "text-margin-y": 8,
            width: 50,
            height: 50,
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
            width: 35,
            height: 35,
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
            width: 25,
            height: 25,
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
            width: 18,
            height: 18,
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
        name: "cose-bilkent",
        // @ts-expect-error - cose-bilkent options
        animate: false,
        idealEdgeLength: 100,
        nodeRepulsion: 10000,
        gravity: 0.4,
        gravityRange: 1.5,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 20,
        tilingPaddingHorizontal: 20,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      minZoom: 0.2,
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
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="h-[600px] w-full rounded-lg border border-border bg-card"
      />
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
