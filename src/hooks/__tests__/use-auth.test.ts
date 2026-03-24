import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { useRouter } from "next/navigation";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
});

describe("useAuth - initial state", () => {
  test("isLoading is false on mount", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("signIn", () => {
  test("returns failure result without navigating when credentials are invalid", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("bad@example.com", "wrongpass");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("sets isLoading to true during sign-in and false after", async () => {
    let resolveSignIn!: (v: any) => void;
    vi.mocked(signInAction).mockReturnValue(new Promise((r) => (resolveSignIn = r)));
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());

    let signInPromise: Promise<any>;
    act(() => {
      signInPromise = result.current.signIn("a@b.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      await signInPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false when signIn action throws", async () => {
    vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  describe("post-sign-in navigation", () => {
    test("creates project from anon work and navigates to it when anon messages exist", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: { "/": { type: "directory" } },
      });
      vi.mocked(createProject).mockResolvedValue({ id: "new-proj-from-anon" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("a@b.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "hello" }],
          data: { "/": { type: "directory" } },
        })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/new-proj-from-anon");
      expect(getProjects).not.toHaveBeenCalled();
    });

    test("skips anon work path when anon messages array is empty", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
      vi.mocked(getProjects).mockResolvedValue([{ id: "existing-proj" }] as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("a@b.com", "password123");
      });

      expect(clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });

    test("skips anon work path when getAnonWorkData returns null", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: "existing-proj" }] as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("a@b.com", "password123");
      });

      expect(clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });

    test("navigates to most recent project when user has existing projects", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([
        { id: "recent-proj" },
        { id: "older-proj" },
      ] as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("a@b.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-proj");
      expect(createProject).not.toHaveBeenCalled();
    });

    test("creates a new project and navigates to it when user has no existing projects", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: "brand-new-proj" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("a@b.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new-proj");
    });
  });
});

describe("signUp", () => {
  test("returns failure result without navigating when sign-up fails", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("existing@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("sets isLoading to true during sign-up and false after", async () => {
    let resolveSignUp!: (v: any) => void;
    vi.mocked(signUpAction).mockReturnValue(new Promise((r) => (resolveSignUp = r)));
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());

    let signUpPromise: Promise<any>;
    act(() => {
      signUpPromise = result.current.signUp("new@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: true });
      await signUpPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false when signUp action throws", async () => {
    vi.mocked(signUpAction).mockRejectedValue(new Error("DB error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("runs post-sign-in logic after successful sign-up", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "proj-after-signup" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-after-signup");
  });

  test("migrates anon work to new project after successful sign-up", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: [{ role: "user", content: "build me a button" }],
      fileSystemData: { "/": {}, "/components": {} },
    });
    vi.mocked(createProject).mockResolvedValue({ id: "migrated-proj" } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/migrated-proj");
  });
});
