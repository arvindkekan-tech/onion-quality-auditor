import { create } from 'zustand'

export type DraftImage = {
  id: string
  file: File
  previewUrl: string
}

export type InspectionMetadata = {
  batchId: string
  procurementCentre: string
  inspector: string
  specification: string
  farmerFpo: string
  expectedSampleSize: number
}

const defaultMetadata: InspectionMetadata = {
  batchId: 'OKB-2024-1847',
  procurementCentre: 'Lasalgaon APMC',
  inspector: 'Rajesh Patil',
  specification: 'Export Grade — Nashik Red',
  farmerFpo: '',
  expectedSampleSize: 50,
}

type InspectionDraftState = {
  images: DraftImage[]
  metadata: InspectionMetadata
  previewUrl: string | null
  setMetadata: (metadata: Partial<InspectionMetadata>) => void
  addImage: (file: File) => void
  removeImage: (id: string) => void
  setPreviewUrl: (url: string | null) => void
  clearImages: () => void
  reset: () => void
}

function createDraftImage(file: File): DraftImage {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  }
}

export const useInspectionDraftStore = create<InspectionDraftState>((set) => ({
  images: [],
  metadata: defaultMetadata,
  previewUrl: null,
  setMetadata: (metadata) =>
    set((state) => ({
      metadata: { ...state.metadata, ...metadata },
    })),
  addImage: (file) =>
    set(() => {
      const draft = createDraftImage(file)
      return {
        images: [draft],
        previewUrl: draft.previewUrl,
      }
    }),
  removeImage: (id) =>
    set((state) => {
      const image = state.images.find((item) => item.id === id)
      if (image) URL.revokeObjectURL(image.previewUrl)
      return { images: [], previewUrl: null }
    }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  clearImages: () => set({ images: [] }),
  reset: () =>
    set((state) => {
      state.images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl)
      return {
        images: [],
        metadata: defaultMetadata,
        previewUrl: null,
      }
    }),
}))
