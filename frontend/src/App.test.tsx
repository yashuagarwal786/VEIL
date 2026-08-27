import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

const dashboard = { case_id: 1, metrics: { active_cases: 3, entities: 11, open_alerts: 2, documents: 8, anomalies: 4 }, priority_entities: [], recent_alerts: [], anomaly_series: [] };
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(dashboard) })));

describe("unified investigation shell", () => {
  it("renders the API-driven dashboard and primary navigation", async () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><App /></MemoryRouter>);
    expect(screen.getByText("VEIL")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Project Eclipse" })).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Network" })).toHaveAttribute("href", "/network");
  });
});
