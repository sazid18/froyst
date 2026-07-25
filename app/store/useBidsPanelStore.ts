import { create } from "zustand";

type BidsPanelStore = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

/**
 * Client UI state for the "My bids" sidebar — mirrors useBidModalStore's
 * shape (isOpen + open/close). Mutual exclusion with the bid modal (opening
 * one closes the other) is enforced at the call sites (FilterBar,
 * MarketRow), not here — keeping the two stores independent avoids a
 * circular import between them.
 */
export const useBidsPanelStore = create<BidsPanelStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
