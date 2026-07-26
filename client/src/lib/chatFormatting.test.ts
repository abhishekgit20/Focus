import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { renderFormattedText } from "./chatFormatting";

// This project's vitest config runs in a plain Node environment (no jsdom,
// no @testing-library/react), so these assert directly against the returned
// React element tree instead of rendering to a DOM.
function isElement(node: unknown): node is ReactElement {
  return typeof node === "object" && node !== null && "type" in node && "props" in node;
}

describe("renderFormattedText", () => {
  it("renders **bold** segments as <strong>, not literal asterisks", () => {
    const nodes = renderFormattedText("**Emergency Helplines (India):**");
    expect(nodes).toHaveLength(1);
    const strong = nodes[0];
    expect(isElement(strong) && strong.type).toBe("strong");
    expect(isElement(strong) && strong.props.children).toBe("Emergency Helplines (India):");
  });

  it("leaves plain text untouched when there is no markdown", () => {
    const nodes = renderFormattedText("Just a normal reply.");
    expect(nodes).toEqual(["Just a normal reply."]);
  });

  it("linkifies helpline numbers with tel: when linkifyPhoneNumbers is true", () => {
    const nodes = renderFormattedText("Call iCall: 9152987821 now.", true);
    const link = nodes.find((n) => isElement(n) && n.type === "a") as ReactElement | undefined;
    expect(link?.props.href).toBe("tel:9152987821");
    expect(link?.props.children).toBe("9152987821");
  });

  it("linkifies a bolded phone number as both <strong> and a tel: link", () => {
    const nodes = renderFormattedText("Call **112** immediately.", true);
    const strong = nodes.find((n) => isElement(n) && n.type === "strong") as ReactElement;
    expect(strong).toBeDefined();
    const link = strong.props.children;
    expect(isElement(link) && link.type).toBe("a");
    expect(isElement(link) && link.props.href).toBe("tel:112");
  });

  it("does not linkify phone numbers unless explicitly requested", () => {
    const nodes = renderFormattedText("Call 9152987821 now.", false);
    expect(nodes.some((n) => isElement(n) && n.type === "a")).toBe(false);
  });

  it("strips hyphens from a linkified number's tel: href but keeps them in the visible text", () => {
    const nodes = renderFormattedText("Vandrevala: 1860-2662-345", true);
    const link = nodes.find((n) => isElement(n) && n.type === "a") as ReactElement | undefined;
    expect(link?.props.href).toBe("tel:18602662345");
    expect(link?.props.children).toBe("1860-2662-345");
  });
});
