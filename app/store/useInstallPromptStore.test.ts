import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInstallPromptStore } from "./useInstallPromptStore";
import type { BeforeInstallPromptEvent } from "../types/state";

function makeDeferredPrompt(
  outcome: "accepted" | "dismissed"
): BeforeInstallPromptEvent {
  return {
    platforms: ["web"],
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome, platform: "web" }),
  } as unknown as BeforeInstallPromptEvent;
}

describe("useInstallPromptStore", () => {
  beforeEach(() => {
    useInstallPromptStore.setState({
      deferredPrompt: null,
      isInstallable: false,
      isInstalled: false,
    });
  });

  it("becomes installable once a prompt is captured", () => {
    const event = makeDeferredPrompt("accepted");
    useInstallPromptStore.getState().captureDeferredPrompt(event);

    const state = useInstallPromptStore.getState();
    expect(state.isInstallable).toBe(true);
    expect(state.deferredPrompt).toBe(event);
  });

  it("resolves 'unavailable' when no prompt has been captured", async () => {
    const outcome = await useInstallPromptStore.getState().promptInstall();
    expect(outcome).toBe("unavailable");
  });

  it("triggers the captured prompt and clears it after a choice", async () => {
    const event = makeDeferredPrompt("accepted");
    useInstallPromptStore.getState().captureDeferredPrompt(event);

    const outcome = await useInstallPromptStore.getState().promptInstall();

    expect(outcome).toBe("accepted");
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(useInstallPromptStore.getState().deferredPrompt).toBeNull();
    expect(useInstallPromptStore.getState().isInstallable).toBe(false);
  });

  it("marks installed and clears any pending prompt", () => {
    useInstallPromptStore.getState().captureDeferredPrompt(makeDeferredPrompt("accepted"));
    useInstallPromptStore.getState().markInstalled();

    const state = useInstallPromptStore.getState();
    expect(state.isInstalled).toBe(true);
    expect(state.deferredPrompt).toBeNull();
    expect(state.isInstallable).toBe(false);
  });
});
