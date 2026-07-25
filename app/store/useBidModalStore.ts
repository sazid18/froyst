import { create } from "zustand";
import type { BidOutcome } from "../types/state";

type BidModalStore = {
  isOpen: boolean;
  marketId: string | null;
  outcome: BidOutcome | null;
  open: (marketId: string, outcome?: BidOutcome | null) => void;
  close: () => void;
  setOutcome: (outcome: BidOutcome) => void;
};

/**
 * Client UI state for the bid modal — which market it's open for and the
 * currently-picked side. The modal reads the live price for that market
 * from the Query cache (['market', marketId]); this store never holds
 * price data itself.
 */
export const useBidModalStore = create<BidModalStore>((set) => ({
  isOpen: false,
  marketId: null,
  outcome: null,
  open: (marketId, outcome = null) => set({ isOpen: true, marketId, outcome }),
  close: () => set({ isOpen: false, marketId: null, outcome: null }),
  setOutcome: (outcome) => set({ outcome }),
}));
