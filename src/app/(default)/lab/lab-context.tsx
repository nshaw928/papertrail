"use client";

import { createContext, useContext } from "react";

interface LabContextValue {
  lab: {
    id: string;
    name: string;
    role: string;
  };
}

const LabContext = createContext<LabContextValue | null>(null);

export function LabProvider({
  lab,
  children,
}: {
  lab: LabContextValue["lab"];
  children: React.ReactNode;
}) {
  return (
    <LabContext.Provider value={{ lab }}>{children}</LabContext.Provider>
  );
}

export function useLab(): LabContextValue {
  const ctx = useContext(LabContext);
  if (!ctx) {
    throw new Error("useLab must be used within a LabProvider");
  }
  return ctx;
}
