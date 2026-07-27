import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeeeelightttComponent } from "./DeeeelightttComponent";

describe("DeeeelightttComponent", () => {
  it("renders correctly", () => {
    render(<DeeeelightttComponent />);
    expect(screen.getByText("Deeeelighttt Feature")).toBeDefined();
  });
});
