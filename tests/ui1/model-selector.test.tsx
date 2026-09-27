import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelSelector } from "@/components/ModelSelector";
import { SELECTABLE_MODELS } from "@/lib/models";

function Harness({ onChange = () => {}, navigationEpoch }: { onChange?: (id: string) => void; navigationEpoch?: number }) {
  const [value, setValue] = useState("auto");
  const [drawer, setDrawer] = useState(false);
  const [route, setRoute] = useState(0);
  return (
    <>
      <button>Before</button>
      <ModelSelector value={value} onChange={(id) => { setValue(id); onChange(id); }} suspended={drawer} dismissKey={navigationEpoch ?? route} />
      <button onClick={() => setDrawer(true)}>Open drawer</button>
      <button onClick={() => setRoute((previous) => previous + 1)}>Navigate</button>
      <button>After</button>
    </>
  );
}

describe("UI-1 model selector", () => {
  it("TC-UI-MODEL-01 opens with Enter and Space and focuses the selected option", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: /Modèle : Sao 4/ });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("listbox")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("option", { name: /Sao 4/ })));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.keyboard(" ");
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("TC-UI-MODEL-02 navigates with arrows, Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Modèle : Sao 4/ }));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /Toumaï 5/ }));
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /Sao 4/ }));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /Toumaï 5/ }));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /Sao 4/ }));
  });

  it("TC-UI-MODEL-03/05 selects with Enter and returns focus", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Modèle : Sao 4/ }));
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("sayibi-reflexion");
    expect(screen.queryByRole("listbox")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: /Modèle : Toumaï 5/ })));
  });

  it("selects with Space and restores focus", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Modèle : Sao 4/ }));
    await user.keyboard("{ArrowDown} ");
    expect(onChange).toHaveBeenCalledWith("sayibi-reflexion");
    expect(screen.queryByRole("listbox")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: /Modèle : Toumaï 5/ })));
  });

  it("TC-UI-MODEL-04/05 Escape closes and returns focus; Tab exits", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: /Modèle : Sao 4/ });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.click(trigger);
    await user.keyboard("{Tab}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open drawer" }));
    await user.click(trigger);
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Before" }));
  });

  it("lets an outside click activate its target while closing the menu", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Modèle : Sao 4/ }));
    await user.click(screen.getByRole("button", { name: "Navigate" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("TC-UI-MODEL-06 skips a disabled option", async () => {
    SELECTABLE_MODELS.push({ id: "disabled-test", name: "Disabled test", tagline: "Unavailable", description: "Unavailable", color: "#000", disabled: true });
    try {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      await user.click(screen.getByRole("button", { name: /Modèle : Sao 4/ }));
      await user.keyboard("{End}");
      expect(document.activeElement).toBe(screen.getByRole("option", { name: /Toumaï 5/ }));
      expect(screen.getByRole("option", { name: /Disabled test/ }).hasAttribute("disabled")).toBe(true);
      await user.keyboard("{ArrowDown}{Enter}");
      expect(onChange).toHaveBeenCalledWith("auto");
      expect(onChange).not.toHaveBeenCalledWith("disabled-test");
    } finally {
      SELECTABLE_MODELS.pop();
    }
  });

  it("TC-UI-OVERLAY-01/02 closes on drawer and navigation changes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Modèle : Sao 4/ }));
    await user.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("TC-UI-OVERLAY-02 dismisses an open menu on conversation change", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness navigationEpoch={0} />);
    await user.click(screen.getByRole("button", { name: /Modèle : Sao 4/ }));
    rerender(<Harness navigationEpoch={1} />);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
