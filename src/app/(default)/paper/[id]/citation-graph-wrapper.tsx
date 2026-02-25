"use client";

import dynamic from "next/dynamic";
import type { GraphData } from "@/lib/types/app";

const CitationGraph = dynamic(() => import("@/components/citation-graph"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-lg border border-border bg-card">
      <p className="text-sm text-muted-foreground">Loading graph...</p>
    </div>
  ),
});

interface Props {
  data: GraphData;
  centerId: string;
}

export default function CitationGraphWrapper({ data, centerId }: Props) {
  return <CitationGraph data={data} centerId={centerId} />;
}
