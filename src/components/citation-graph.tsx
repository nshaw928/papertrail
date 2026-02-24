"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GraphData } from "@/lib/types/app";
import cytoscape from "cytoscape";

// @ts-expect-error - no types for this layout extension
import coseBilkent from "cytoscape-cose-bilkent";

let layoutRegistered = false;
if (!layoutRegistered) {
  cytoscape.use(coseBilkent);
  layoutRegistered = true;
}

interface CitationGraphProps {
  data: GraphData;
  centerId: string;
}

export default function CitationGraph({ data, centerId }: CitationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const router = useRouter();

  const buildElements = useCallback(() => {
    const nodes = data.nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        type: n.type,
        year: n.year,
        cited_by_count: n.cited_by_count ?? 0,
        isCenter: n.id === centerId,
      },
    }));

    const edges = data.edges.map((e, i) => ({
      data: {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        type: e.type,
      },
    }));

    return [...nodes, ...edges];
  }, [data, centerId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(),
      style: [
        {
          selector: 'node[type="paper"]',
          style: {
            "background-color": "#6c8cff",
            label: "data(label)",
            color: "#94a3b8",
            "font-size": "10px",
            "text-wrap": "ellipsis",
            "text-max-width": "120px",
            "text-valign": "bottom",
            "text-margin-y": 6,
            width: "mapData(cited_by_count, 0, 1000, 20, 50)",
            height: "mapData(cited_by_count, 0, 1000, 20, 50)",
          },
        },
        {
          selector: 'node[type="topic"]',
          style: {
            "background-color": "#fb923c",
            label: "data(label)",
            color: "#94a3b8",
            "font-size": "10px",
            shape: "diamond",
            width: 25,
            height: 25,
            "text-valign": "bottom",
            "text-margin-y": 6,
          },
        },
        {
          selector: "node[?isCenter]",
          style: {
            "background-color": "#4ade80",
            "border-width": 3,
            "border-color": "#fff",
            width: 40,
            height: 40,
            "font-size": "12px",
            "font-weight": "bold" as const,
          },
        },
        {
          selector: 'edge[type="cites"]',
          style: {
            "line-color": "#475569",
            "target-arrow-color": "#475569",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            width: 1.5,
            "arrow-scale": 0.8,
          },
        },
        {
          selector: 'edge[type="has_topic"]',
          style: {
            "line-color": "#334155",
            "line-style": "dashed",
            width: 1,
            "curve-style": "bezier",
          },
        },
      ],
      layout: {
        name: "cose-bilkent",
        // @ts-expect-error - cose-bilkent options
        animate: false,
        idealEdgeLength: 120,
        nodeRepulsion: 8000,
        gravity: 0.3,
        numIter: 2500,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const type = node.data("type");
      const id = node.id();
      if (type === "paper") {
        router.push(`/paper/${id}`);
      } else if (type === "topic") {
        router.push(`/topics/${id}`);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [buildElements, router]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-[400px] w-full rounded-lg border border-border bg-card"
      />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#4ade80]" />
          This paper
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#6c8cff]" />
          Paper
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rotate-45 bg-[#fb923c]" />
          Topic
        </span>
      </div>
    </div>
  );
}
