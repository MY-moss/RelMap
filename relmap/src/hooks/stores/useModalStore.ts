import { create } from 'zustand'

interface ModalState {
  activeModal: string | null
  modalData: Record<string, unknown>
  openModal: (name: string, data?: Record<string, unknown>) => void
  closeModal: () => void
}

export const useModalStore = create<ModalState>((set) => ({
  activeModal: null,
  modalData: {},
  openModal: (name, data = {}) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: {} }),
}))
