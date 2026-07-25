import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Avatar,
  Badge,
  Button,
  Chip,
  Divider,
  Icon,
  IconButton,
  Input,
  LiveDot,
  Scrim,
  Select,
  Skeleton,
  Tag,
} from ".";

describe("Icon", () => {
  it("renders an svg sized 15px by default, hidden from AT", () => {
    render(<Icon name="star" data-testid="icon" />);
    const svg = screen.getByTestId("icon");

    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg).toHaveAttribute("width", "15");
    expect(svg).toHaveAttribute("height", "15");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("fill", "none");
  });

  it("respects a custom size", () => {
    render(<Icon name="close" size={24} data-testid="icon" />);
    expect(screen.getByTestId("icon")).toHaveAttribute("width", "24");
  });

  it("switches to a filled fill when filled=true", () => {
    render(<Icon name="star" filled data-testid="icon" />);
    expect(screen.getByTestId("icon")).toHaveAttribute("fill", "currentColor");
  });
});

describe("Button", () => {
  it("renders primary variant classes by default", () => {
    render(<Button>Place bid</Button>);
    const button = screen.getByRole("button", { name: "Place bid" });

    expect(button).toHaveClass("bg-yes");
    expect(button).toHaveClass("text-white");
    expect(button).toHaveClass("h-10"); // md size
    expect(button).toHaveClass("rounded-[8px]");
  });

  it("applies lg size classes", () => {
    render(<Button size="lg">Confirm</Button>);
    const button = screen.getByRole("button", { name: "Confirm" });

    expect(button).toHaveClass("h-12");
    expect(button).toHaveClass("rounded-[10px]");
  });

  it("shows the active outline state only for the outline variant", () => {
    render(
      <Button variant="outline" active>
        Yes
      </Button>
    );
    const button = screen.getByRole("button", { name: "Yes" });

    expect(button).toHaveClass("border-yes");
    expect(button).toHaveClass("text-yes");
  });

  it("disables the button and shows a spinner while loading", () => {
    render(<Button loading>Submitting</Button>);
    const button = screen.getByRole("button", { name: "Submitting" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("merges className after variant classes, letting overrides win", () => {
    render(<Button className="bg-no">Reject</Button>);
    const button = screen.getByRole("button", { name: "Reject" });

    expect(button).toHaveClass("bg-no");
    expect(button).not.toHaveClass("bg-yes");
  });
});

describe("IconButton", () => {
  it("requires a label, rendered as aria-label", () => {
    render(<IconButton icon={<Icon name="close" />} label="Close modal" />);
    expect(
      screen.getByRole("button", { name: "Close modal" })
    ).toBeInTheDocument();
  });

  it("omits aria-pressed when `pressed` is not provided", () => {
    render(<IconButton icon={<Icon name="close" />} label="Close" />);
    expect(screen.getByRole("button", { name: "Close" })).not.toHaveAttribute(
      "aria-pressed"
    );
  });

  it("reflects pressed state via aria-pressed and gold color", () => {
    render(
      <IconButton icon={<Icon name="star" />} label="Favorite" pressed />
    );
    const button = screen.getByRole("button", { name: "Favorite" });

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveClass("text-gold");
  });

  it("defaults to the idle icon color when not pressed", () => {
    render(
      <IconButton
        icon={<Icon name="star" />}
        label="Favorite"
        pressed={false}
      />
    );
    const button = screen.getByRole("button", { name: "Favorite" });

    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveClass("text-iconIdle");
  });
});

describe("Input", () => {
  it("renders a text input and forwards native props", () => {
    render(<Input placeholder="0.00" aria-label="Amount" />);
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveAttribute(
      "placeholder",
      "0.00"
    );
  });

  it("renders a prefix inside the bordered wrapper", () => {
    render(<Input prefix="$" aria-label="Amount" />);
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("applies the lg wrapper height (46px) when size='lg'", () => {
    const { container } = render(<Input size="lg" aria-label="Amount" />);
    expect(container.firstElementChild).toHaveClass("h-[46px]");
  });
});

describe("Select", () => {
  const options = [
    { value: "crypto", label: "Crypto" },
    { value: "sports", label: "Sports" },
  ];

  it("renders every option", () => {
    render(<Select options={options} value="crypto" onChange={() => {}} />);
    expect(screen.getByRole("option", { name: "Crypto" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sports" })).toBeInTheDocument();
  });

  it("calls onChange with the selected value", () => {
    const onChange = vi.fn();
    render(<Select options={options} value="crypto" onChange={onChange} />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "sports" },
    });

    expect(onChange).toHaveBeenCalledWith("sports");
  });
});

describe("Badge", () => {
  it("is hidden (renders nothing) when count is 0", () => {
    const { container } = render(<Badge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the count otherwise", () => {
    render(<Badge count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("Chip", () => {
  it("maps each category to its token color pair", () => {
    render(<Chip category="Sports" data-testid="chip" />);
    const chip = screen.getByTestId("chip");

    expect(chip).toHaveClass("bg-chip-sports-bg");
    expect(screen.getByText("Sports")).toHaveClass("text-chip-sports-text");
  });

  it("merges className after category classes, letting overrides win", () => {
    render(
      <Chip category="Crypto" className="bg-chip-science-bg" data-testid="chip" />
    );
    const chip = screen.getByTestId("chip");

    expect(chip).toHaveClass("bg-chip-science-bg");
    expect(chip).not.toHaveClass("bg-chip-crypto-bg");
  });
});

describe("Tag", () => {
  it("defaults its label to the tone name", () => {
    render(<Tag tone="won" />);
    expect(screen.getByText("won")).toHaveClass("text-gain");
  });

  it("accepts custom children while keeping the tone's color", () => {
    render(<Tag tone="no">Rejected</Tag>);
    expect(screen.getByText("Rejected")).toHaveClass("text-no");
  });
});

describe("Avatar", () => {
  it("renders an accessible image at the given size", () => {
    render(<Avatar src="/avatar.png" alt="Jane Doe" size={32} />);
    const img = screen.getByAltText("Jane Doe");

    expect(img.tagName.toLowerCase()).toBe("img");
  });
});

describe("Divider", () => {
  it("renders an hr with no margin", () => {
    render(<Divider data-testid="divider" />);
    const hr = screen.getByTestId("divider");

    expect(hr.tagName.toLowerCase()).toBe("hr");
    expect(hr).toHaveClass("m-0");
    expect(hr).toHaveClass("border-line");
  });
});

describe("Skeleton", () => {
  it("sizes the row shape as a full-width 72px block", () => {
    render(<Skeleton shape="row" data-testid="skeleton" />);
    const el = screen.getByTestId("skeleton");

    expect(el).toHaveClass("h-[72px]");
    expect(el).toHaveClass("w-full");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("sizes the cell shape as 80x16", () => {
    render(<Skeleton shape="cell" data-testid="skeleton" />);
    const el = screen.getByTestId("skeleton");

    expect(el).toHaveClass("w-20");
    expect(el).toHaveClass("h-4");
  });

  it("respects prefers-reduced-motion", () => {
    render(<Skeleton shape="cell" data-testid="skeleton" />);
    expect(screen.getByTestId("skeleton")).toHaveClass(
      "motion-reduce:animate-none"
    );
  });
});

describe("LiveDot", () => {
  it("shows the live label and pulsing gain dot when open", () => {
    const { container } = render(<LiveDot state="open" />);
    expect(screen.getByText("live")).toBeInTheDocument();
    expect(container.querySelector("span > span")).toHaveClass(
      "bg-gain",
      "animate-pulse"
    );
  });

  it("shows the connecting label without a pulse", () => {
    const { container } = render(<LiveDot state="connecting" />);
    expect(screen.getByText("connecting…")).toBeInTheDocument();
    expect(container.querySelector("span > span")).toHaveClass("bg-gold");
    expect(container.querySelector("span > span")).not.toHaveClass(
      "animate-pulse"
    );
  });

  it("shows the reconnecting label without a pulse", () => {
    const { container } = render(<LiveDot state="reconnecting" />);
    expect(screen.getByText("reconnecting…")).toBeInTheDocument();
    expect(container.querySelector("span > span")).toHaveClass("bg-gold");
    expect(container.querySelector("span > span")).not.toHaveClass(
      "animate-pulse"
    );
  });

  it("shows the offline label with no animation when closed", () => {
    const { container } = render(<LiveDot state="closed" />);
    expect(screen.getByText("offline")).toBeInTheDocument();
    expect(container.querySelector("span > span")).toHaveClass("bg-control");
    expect(container.querySelector("span > span")).not.toHaveClass(
      "animate-pulse"
    );
  });
});

describe("Scrim", () => {
  it("is always aria-hidden", () => {
    const { container } = render(<Scrim open onDismiss={() => {}} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("is invisible and non-interactive when closed", () => {
    const { container } = render(<Scrim open={false} onDismiss={() => {}} />);
    const scrim = container.firstElementChild as HTMLElement;

    expect(scrim).toHaveClass("opacity-0");
    expect(scrim).toHaveClass("pointer-events-none");
  });

  it("is visible and interactive when open", () => {
    const { container } = render(<Scrim open onDismiss={() => {}} />);
    const scrim = container.firstElementChild as HTMLElement;

    expect(scrim).toHaveClass("opacity-100");
    expect(scrim).toHaveClass("pointer-events-auto");
  });

  it("calls onDismiss when clicked", () => {
    const onDismiss = vi.fn();
    const { container } = render(<Scrim open onDismiss={onDismiss} />);

    fireEvent.click(container.firstElementChild as HTMLElement);

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
