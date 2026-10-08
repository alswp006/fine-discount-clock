import { it, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockAnalytics } from "@/__tests__/__helpers__/mocks";
mockTds(); mockAppsInToss(); mockAnalytics();
it("x", async () => {
  vi.doMock("react-router-dom", async () => await vi.importActual("react-router-dom"));
  const { MemoryRouter } = await import("react-router-dom");
  const { default: App } = await import("@/App");
  render(<MemoryRouter><App /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "고지서 등록" }));
  await new Promise((r) => setTimeout(r, 50));
  process.stdout.write("TXT " + document.body.textContent + "\n");
});
