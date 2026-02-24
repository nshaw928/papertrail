import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { levelName } from "@/lib/utils";

interface TopicItem {
  id: string;
  name: string;
  level: number;
  works_count: number;
  paper_count?: number;
}

interface TopicGridProps {
  topics: TopicItem[];
  title?: string;
}

export default function TopicGrid({ topics, title }: TopicGridProps) {
  if (topics.length === 0) return null;

  return (
    <div>
      {title && (
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <Link key={topic.id} href={`/topics/${topic.id}`}>
            <Card className="transition-colors hover:bg-accent/50 h-full">
              <CardContent className="p-4">
                <h3 className="font-medium leading-snug">{topic.name}</h3>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {levelName(topic.level)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {(topic.paper_count ?? topic.works_count).toLocaleString()}{" "}
                    papers
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
