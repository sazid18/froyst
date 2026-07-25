import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Text, textVariantClassMap, type TextVariant } from "./Text";

const defaultTagByVariant: Record<TextVariant, string> = {
  display: "h1",
  heading: "h2",
  body: "span",
  caption: "span",
  label: "span",
  eyebrow: "span",
  colhead: "span",
  num: "span",
  numSmall: "span",
};

describe("Text", () => {
  it.each(Object.keys(textVariantClassMap) as TextVariant[])(
    "renders the %s variant with its default element and classes",
    (variant) => {
      render(<Text variant={variant}>content</Text>);
      const node = screen.getByText("content");

      expect(node.tagName.toLowerCase()).toBe(defaultTagByVariant[variant]);
      for (const cls of textVariantClassMap[variant].split(" ")) {
        expect(node).toHaveClass(cls);
      }
    }
  );

  it("defaults to the body variant when none is given", () => {
    render(<Text>hello</Text>);
    const node = screen.getByText("hello");

    expect(node.tagName.toLowerCase()).toBe("span");
    for (const cls of textVariantClassMap.body.split(" ")) {
      expect(node).toHaveClass(cls);
    }
  });

  it("both mono variants include tabular-nums", () => {
    expect(textVariantClassMap.num).toContain("tabular-nums");
    expect(textVariantClassMap.numSmall).toContain("tabular-nums");
  });

  it("renders the element passed via the `as` prop", () => {
    render(
      <Text as="label" variant="label" htmlFor="amount">
        Amount
      </Text>
    );
    const node = screen.getByText("Amount");

    expect(node.tagName.toLowerCase()).toBe("label");
    expect(node).toHaveAttribute("for", "amount");
  });

  it("renders a table column header via as='th'", () => {
    render(
      <table>
        <thead>
          <tr>
            <Text as="th" variant="colhead" scope="col">
              NAME
            </Text>
          </tr>
        </thead>
      </table>
    );
    const node = screen.getByText("NAME");

    expect(node.tagName.toLowerCase()).toBe("th");
    expect(node).toHaveAttribute("scope", "col");
  });

  it("merges className after variant classes, letting overrides win", () => {
    render(
      <Text variant="num" className="text-gain">
        +$120
      </Text>
    );
    const node = screen.getByText("+$120");

    // text-gain (override) wins over text-ink (variant default) via
    // tailwind-merge, so only one of the two competing color utilities
    // survives on the element.
    expect(node).toHaveClass("text-gain");
    expect(node).not.toHaveClass("text-ink");

    // Non-conflicting variant classes (font, size, weight, tabular-nums)
    // are preserved.
    expect(node).toHaveClass("font-mono");
    expect(node).toHaveClass("tabular-nums");
  });

  it("forwards a ref to the rendered element", () => {
    let el: HTMLElement | null = null;
    render(
      <Text
        variant="body"
        ref={(node) => {
          el = node;
        }}
      >
        ref me
      </Text>
    );

    expect(el).not.toBeNull();
    expect((el as unknown as HTMLElement).tagName.toLowerCase()).toBe("span");
  });
});
