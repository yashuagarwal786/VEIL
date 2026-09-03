import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const dashboard = { case_id: 1, metrics: { active_cases: 3, entities: 11, open_alerts: 2, documents: 8, anomalies: 4 }, priority_entities: [], recent_alerts: [], anomaly_series: [] };
const caseRows = [{ id: 1, case_number: "VEIL-2026-001", title: "Project Eclipse", description: "Synthetic investigation", status: "ACTIVE", created_at: "2026-09-02T00:00:00Z", updated_at: "2026-09-02T00:00:00Z", assigned_investigator: { investigator_id: "INV-1042", name: "Yash Agarwal", role: "Senior Investigator" }, risk_level: "HIGH", priority_score: 82 }];

describe("unified investigation shell", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (url.includes("/api/workspace/cases")) return Promise.resolve({ ok: true, json: () => Promise.resolve(caseRows) });
      if (url.includes("/api/workspace/dashboard")) return Promise.resolve({ ok: true, json: () => Promise.resolve(dashboard) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }));
  });

  it("requires an investigator session before showing the dashboard", async () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Investigator Sign In" })).toBeInTheDocument();
  });

  it("renders the account-backed dashboard and primary navigation", async () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /Use seeded senior investigator account/i }));
    expect(await screen.findByRole("heading", { name: "Yash Agarwal" })).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Network" })).toHaveAttribute("href", "/network");
  });
});
