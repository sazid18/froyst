import { beforeEach, describe, expect, it } from "vitest";
import { useBidModalStore } from "./useBidModalStore";

describe("useBidModalStore", () => {
  beforeEach(() => {
    useBidModalStore.setState({ isOpen: false, marketId: null, outcome: null });
  });

  it("opens for a given market with no outcome picked yet", () => {
    useBidModalStore.getState().open("market-1");

    const state = useBidModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.marketId).toBe("market-1");
    expect(state.outcome).toBeNull();
  });

  it("tracks the picked outcome", () => {
    useBidModalStore.getState().open("market-1");
    useBidModalStore.getState().setOutcome("yes");

    expect(useBidModalStore.getState().outcome).toBe("yes");
  });

  it("clears market and outcome on close", () => {
    useBidModalStore.getState().open("market-1");
    useBidModalStore.getState().setOutcome("no");
    useBidModalStore.getState().close();

    const state = useBidModalStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.marketId).toBeNull();
    expect(state.outcome).toBeNull();
  });

  it("resets outcome when opening for a different market", () => {
    useBidModalStore.getState().open("market-1");
    useBidModalStore.getState().setOutcome("yes");
    useBidModalStore.getState().open("market-2");

    expect(useBidModalStore.getState().outcome).toBeNull();
    expect(useBidModalStore.getState().marketId).toBe("market-2");
  });
});
