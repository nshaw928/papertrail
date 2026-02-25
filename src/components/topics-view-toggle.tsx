"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Network } from "lucide-react";
import TopicGrid from "@/components/topic-grid";
import TopicGraph from "@/components/topic-graph";
import type { TopicNode } from "@/lib/types/app";

interface GridTopic {
  id: string;
  name: string;
  level: number;
  works_count: number | null;
  paper_count?: number;
}

interface TopicsViewToggleProps {
  gridTopics: GridTopic[];
  allTopics: TopicNode[];
}

export default function TopicsViewToggle({
  gridTopics,
  allTopics,
}: TopicsViewToggleProps) {
  return (
    <Tabs defaultValue="grid">
      <TabsList>
        <TabsTrigger value="grid" className="gap-1.5">
          <LayoutGrid className="h-4 w-4" />
          Grid
        </TabsTrigger>
        <TabsTrigger value="graph" className="gap-1.5">
          <Network className="h-4 w-4" />
          Graph
        </TabsTrigger>
      </TabsList>
      <TabsContent value="grid">
        <TopicGrid topics={gridTopics} />
      </TabsContent>
      <TabsContent value="graph">
        <TopicGraph topics={allTopics} />
      </TabsContent>
    </Tabs>
  );
}
