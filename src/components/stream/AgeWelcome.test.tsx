import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgeWelcome } from "./AgeWelcome";

describe("AgeWelcome", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the welcome dialog open when a minor age range is selected", async () => {
    render(<AgeWelcome />);

    const minorAge = await screen.findByRole("button", { name: "14 à 17 ans" });
    fireEvent.click(minorAge);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("réservé aux personnes majeures");
    expect(sessionStorage.getItem("goontube-age-welcome-dismissed")).toBeNull();
  });

  it("closes the dialog and remembers the session after an adult age range is selected", async () => {
    render(<AgeWelcome />);

    fireEvent.click(await screen.findByRole("button", { name: "18 à 25 ans" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(sessionStorage.getItem("goontube-age-welcome-dismissed")).toBe("1");
  });

  it("does not show the dialog again when the session was already confirmed", async () => {
    sessionStorage.setItem("goontube-age-welcome-dismissed", "1");
    render(<AgeWelcome />);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
