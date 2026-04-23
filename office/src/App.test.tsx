import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Office App", () => {
  it("renders the office title and tracker shortcut", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>,
    );

    expect(screen.getAllByText("Paperclip Office").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /view in tracker/i }),
    ).toBeInTheDocument();
  });
});
