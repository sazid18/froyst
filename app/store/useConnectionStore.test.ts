import { beforeEach, describe, expect, it } from "vitest";
import { deriveConnectionStatus, useConnectionStore } from "./useConnectionStore";

describe("deriveConnectionStatus", () => {
  it("is closed whenever the browser is offline, regardless of socket state", () => {
    expect(deriveConnectionStatus(false, "open")).toBe("closed");
    expect(deriveConnectionStatus(false, "connecting")).toBe("closed");
    expect(deriveConnectionStatus(false, "closed")).toBe("closed");
  });

  it("is open only when online and the socket is open", () => {
    expect(deriveConnectionStatus(true, "open")).toBe("open");
  });

  it("is connecting on the initial connect attempt", () => {
    expect(deriveConnectionStatus(true, "connecting")).toBe("connecting");
  });

  it("is reconnecting when online but the socket isn't open or connecting", () => {
    expect(deriveConnectionStatus(true, "closed")).toBe("reconnecting");
    expect(deriveConnectionStatus(true, "closing")).toBe("reconnecting");
  });
});

describe("useConnectionStore", () => {
  beforeEach(() => {
    useConnectionStore.setState({
      browserOnline: true,
      socketReadyState: "closed",
      status: "closed",
    });
  });

  it("re-derives status when the socket transitions to open", () => {
    useConnectionStore.getState().setSocketReadyState("open");
    expect(useConnectionStore.getState().status).toBe("open");
  });

  it("re-derives status when the browser goes offline mid-connection", () => {
    useConnectionStore.getState().setSocketReadyState("open");
    useConnectionStore.getState().setBrowserOnline(false);

    const state = useConnectionStore.getState();
    expect(state.socketReadyState).toBe("open");
    expect(state.status).toBe("closed");
  });

  it("returns to reconnecting-derived status when back online with a closed socket", () => {
    useConnectionStore.getState().setBrowserOnline(false);
    useConnectionStore.getState().setBrowserOnline(true);

    expect(useConnectionStore.getState().status).toBe("reconnecting");
  });
});
