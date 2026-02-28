"use client";

import { useEffect, useState } from "react";
import LabPaperNotes from "./lab-paper-notes";

export default function LabPaperNotesLoader({ workId }: { workId: string }) {
  const [labId, setLabId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/labs")
      .then((res) => (res.ok ? res.json() : []))
      .then((labs) => {
        if (labs.length > 0) setLabId(labs[0].id);
      })
      .catch(() => {});
  }, []);

  if (!labId) return null;

  return <LabPaperNotes workId={workId} labId={labId} />;
}
