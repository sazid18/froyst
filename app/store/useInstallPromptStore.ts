import { create } from "zustand";
import type { BeforeInstallPromptEvent } from "../types/state";

type InstallPromptStore = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isInstalled: boolean;
  captureDeferredPrompt: (event: BeforeInstallPromptEvent) => void;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  markInstalled: () => void;
};

export const useInstallPromptStore = create<InstallPromptStore>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,
  captureDeferredPrompt: (event) => set({ deferredPrompt: event, isInstallable: true }),
  promptInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) {
      return "unavailable";
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    set({ deferredPrompt: null, isInstallable: false });
    return outcome;
  },
  markInstalled: () => set({ isInstalled: true, deferredPrompt: null, isInstallable: false }),
}));

/**
 * Captures `beforeinstallprompt` (deferring the browser's default prompt
 * so any component can trigger it later via promptInstall()) and
 * `appinstalled`. Call once at app boot.
 */
export function bindInstallPromptListeners(): () => void {
  function handleBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    useInstallPromptStore.getState().captureDeferredPrompt(event as BeforeInstallPromptEvent);
  }
  function handleAppInstalled() {
    useInstallPromptStore.getState().markInstalled();
  }

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
  };
}
