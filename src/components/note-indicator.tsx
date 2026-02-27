import { Pencil } from "lucide-react";

interface NoteIndicatorProps {
  count: number;
}

export default function NoteIndicator({ count }: NoteIndicatorProps) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Pencil className="size-3" />
      {count}
    </span>
  );
}
