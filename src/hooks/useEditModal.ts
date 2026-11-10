import { create } from "zustand";

interface EditModalStore {
  isOpen: boolean;
  listing: any;
  onOpen: (listing: any) => void;
  onClose: () => void;
}

const useEditModal = create<EditModalStore>((set) => ({
  isOpen: false,
  listing: null,
  onOpen: (listing) => set({ isOpen: true, listing }),
  onClose: () => set({ isOpen: false, listing: null }),
}));

export default useEditModal;
