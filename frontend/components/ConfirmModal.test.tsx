import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmModal from "./ConfirmModal";

describe("ConfirmModal", () => {
  it("renders nothing when closed", () => {
    render(
      <ConfirmModal open={false} message="Delete this?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.queryByText("Delete this?")).not.toBeInTheDocument();
  });

  it("renders the message and default labels when open", () => {
    render(
      <ConfirmModal open message="Delete this?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("Delete this?")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onConfirm and onCancel when their buttons are clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmModal open message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables the action buttons while loading", () => {
    render(
      <ConfirmModal open message="Sure?" onConfirm={vi.fn()} onCancel={vi.fn()} loading />
    );
    expect(screen.getByText("Delete").closest("button")).toBeDisabled();
    expect(screen.getByText("Cancel").closest("button")).toBeDisabled();
  });
});
