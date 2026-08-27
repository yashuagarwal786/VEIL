import { createContext, useContext, useState, type PropsWithChildren } from "react";

type CaseContextValue = { caseId: number; graphCaseId: string; setCaseId: (value: number) => void };
const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: PropsWithChildren) { const [caseId, setCaseId] = useState(1); return <CaseContext.Provider value={{ caseId, graphCaseId: `C${String(caseId).padStart(3, "0")}`, setCaseId }}>{children}</CaseContext.Provider>; }
export function useCaseContext() { const value = useContext(CaseContext); if (!value) throw new Error("CaseProvider is missing"); return value; }
