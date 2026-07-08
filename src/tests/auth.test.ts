import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "@/modules/identity/auth-service";
import { identityRepository } from "@/modules/identity/repository";

// Mock dependencies
vi.mock("@/modules/identity/repository", () => ({
  identityRepository: {
    findByEmail: vi.fn(),
    createUser: vi.fn(),
    countUsers: vi.fn(),
    assignRole: vi.fn(),
    rolesForUser: vi.fn(),
    createSession: vi.fn(),
    revokeSession: vi.fn(),
    audit: vi.fn(),
  },
}));

vi.mock("@/modules/market_data/core/event-bus", () => ({
  eventBus: {
    publish: vi.fn(),
  },
}));

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a new user and assigns default role", async () => {
    vi.mocked(identityRepository.findByEmail).mockResolvedValue(undefined);
    vi.mocked(identityRepository.countUsers).mockResolvedValue(2); // Not the first user
    vi.mocked(identityRepository.createUser).mockResolvedValue({ id: 2, email: "test@example.com" } as any);
    vi.mocked(identityRepository.rolesForUser).mockResolvedValue(["trader"]);

    const result = await authService.register("test@example.com", "Password123!", "Test User");

    expect(result.user.email).toBe("test@example.com");
    expect(identityRepository.createUser).toHaveBeenCalled();
    expect(identityRepository.assignRole).toHaveBeenCalledWith(2, "trader");
  });

  it("throws conflict error when email is registered", async () => {
    vi.mocked(identityRepository.findByEmail).mockResolvedValue({ id: 1 } as any);

    await expect(authService.register("test@example.com", "Password123!", "Test User"))
      .rejects.toThrow(/already registered/);
  });
});
