import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../ui/Button";

describe("Button Component", () => {
  it("should render button with children", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText("Click me"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByText("Click me");
    expect(button).toBeDisabled();
  });

  it("should not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>
    );

    fireEvent.click(screen.getByText("Click me"));

    expect(handleClick).not.toHaveBeenCalled();
  });
});
