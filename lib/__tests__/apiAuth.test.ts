import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

const getUserMock = vi.fn();
const profileSingleMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: profileSingleMock,
        }),
      }),
    }),
  },
}));

const fakeReq = (auth?: string): NextRequest =>
  ({
    headers: {
      get: (name: string) =>
        name === "Authorization" && auth ? auth : null,
    },
  }) as unknown as NextRequest;

describe("requireAdmin", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    profileSingleMock.mockReset();
  });

  it("returns false when Authorization header is missing", async () => {
    const { requireAdmin } = await import("@/lib/apiAuth");
    expect(await requireAdmin(fakeReq())).toBe(false);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns false when scheme is not Bearer", async () => {
    const { requireAdmin } = await import("@/lib/apiAuth");
    expect(await requireAdmin(fakeReq("Basic abc"))).toBe(false);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns false when token verification fails", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid jwt" },
    });
    const { requireAdmin } = await import("@/lib/apiAuth");
    expect(await requireAdmin(fakeReq("Bearer bad"))).toBe(false);
    expect(profileSingleMock).not.toHaveBeenCalled();
  });

  it("returns false when user has non-admin role", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    profileSingleMock.mockResolvedValue({
      data: { role: "user" },
      error: null,
    });
    const { requireAdmin } = await import("@/lib/apiAuth");
    expect(await requireAdmin(fakeReq("Bearer good"))).toBe(false);
  });

  it("returns false when profile row is missing", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    profileSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });
    const { requireAdmin } = await import("@/lib/apiAuth");
    expect(await requireAdmin(fakeReq("Bearer good"))).toBe(false);
  });

  it("returns true only when role is exactly 'admin'", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    profileSingleMock.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });
    const { requireAdmin } = await import("@/lib/apiAuth");
    expect(await requireAdmin(fakeReq("Bearer good"))).toBe(true);
  });

  it("strips exactly 7 chars for the Bearer prefix", async () => {
    let captured = "";
    getUserMock.mockImplementation(async (token: string) => {
      captured = token;
      return { data: { user: null }, error: { message: "no" } };
    });
    const { requireAdmin } = await import("@/lib/apiAuth");
    await requireAdmin(fakeReq("Bearer my-token-xyz"));
    expect(captured).toBe("my-token-xyz");
  });
});
