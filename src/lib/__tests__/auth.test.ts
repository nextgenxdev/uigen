// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

const JWT_SECRET = Buffer.from("development-secret-key");

function makeMockCookieStore(token?: string) {
  return {
    get: vi.fn((name: string) =>
      token ? { name, value: token } : undefined
    ),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("returns null when no auth-token cookie is present", async () => {
  vi.mocked(cookies).mockResolvedValue(makeMockCookieStore() as any);

  const session = await getSession();

  expect(session).toBeNull();
});

test("returns session payload with userId and email when valid token exists", async () => {
  const token = await new SignJWT({
    userId: "user-1",
    email: "test@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);

  vi.mocked(cookies).mockResolvedValue(makeMockCookieStore(token) as any);

  const session = await getSession();

  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("test@example.com");
});

test("returns null when token is malformed", async () => {
  vi.mocked(cookies).mockResolvedValue(
    makeMockCookieStore("not-a-valid-jwt") as any
  );

  const session = await getSession();

  expect(session).toBeNull();
});

test("returns null when token is expired", async () => {
  const token = await new SignJWT({
    userId: "user-1",
    email: "test@example.com",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1s")
    .setIssuedAt()
    .sign(JWT_SECRET);

  vi.mocked(cookies).mockResolvedValue(makeMockCookieStore(token) as any);

  const session = await getSession();

  expect(session).toBeNull();
});

test("returns null when token was signed with a different secret", async () => {
  const wrongSecret = Buffer.from("wrong-secret");
  const token = await new SignJWT({ userId: "user-1", email: "test@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);

  vi.mocked(cookies).mockResolvedValue(makeMockCookieStore(token) as any);

  const session = await getSession();

  expect(session).toBeNull();
});
