import { describe, it, expect, vi } from "vitest";
import { sanitizeInput } from "../security";

function runMiddleware(body: unknown) {
  const req: any = { body };
  const res: any = {};
  const next = vi.fn();
  sanitizeInput(req, res, next);
  expect(next).toHaveBeenCalledOnce();
  return req.body;
}

describe("sanitizeInput (prototype-pollution defense)", () => {
  it("strips a top-level __proto__ key", () => {
    const body = JSON.parse('{"__proto__": {"polluted": true}, "name": "ok"}');
    const result = runMiddleware(body);
    expect(Object.prototype.hasOwnProperty.call(result, "__proto__") ? result.__proto__.polluted : undefined).toBeUndefined();
    expect(result.name).toBe("ok");
  });

  it("strips constructor and prototype keys", () => {
    const body = { constructor: { polluted: true }, prototype: { polluted: true }, name: "ok" };
    const result = runMiddleware(body);
    expect(result.constructor).not.toEqual({ polluted: true });
    expect(result.prototype).toBeUndefined();
    expect(result.name).toBe("ok");
  });

  it("strips dangerous keys nested several levels deep, not just at the top level", () => {
    const body = { user: { profile: { settings: { __proto__: { polluted: true } } } } };
    const result = runMiddleware(body);
    const settings = result.user.profile.settings;
    expect(Object.keys(settings)).not.toContain("__proto__");
  });

  it("strips dangerous keys inside arrays", () => {
    const body = { items: [{ __proto__: { polluted: true } }, { name: "fine" }] };
    const result = runMiddleware(body);
    expect(Object.keys(result.items[0])).not.toContain("__proto__");
    expect(result.items[1].name).toBe("fine");
  });

  it("leaves ordinary request bodies completely untouched", () => {
    const body = { email: "a@example.com", nested: { count: 3, tags: ["x", "y"] } };
    const result = runMiddleware(body);
    expect(result).toEqual(body);
  });

  it("does not throw when body is missing or not an object", () => {
    expect(() => runMiddleware(undefined)).not.toThrow();
    expect(() => runMiddleware("just a string")).not.toThrow();
  });
});
