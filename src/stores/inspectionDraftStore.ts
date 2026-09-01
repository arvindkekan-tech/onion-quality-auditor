import { create } from 'zustand'

export type DraftImage = {
  id: string
  file: File
  previewUrl: string
}

type InspectionDraftState = {
  images: DraftImage[]
  addImage: (file: File) => void
  removeImage: (id: string) => void
  clearImages: () => void
}

function createDraftImage(file: File): DraftImage {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  }
}

export const useInspectionDraftStore = create<InspectionDraftState>(
  (set) => ({
    images: [],
    addImage: (file) =>
      set((state) => ({
        images: [...state.images, createDraftImage(file)],
      })),
    removeImage: (id) =>
      set((state) => {
        const image = state.images.find((item) => item.id === id)
        if (image) URL.revokeObjectURL(image.previewUrl)
        return { images: state.images.filter((item) => item.id !== id) }
      }),
    clearImages: () =>
      set((state) => {
        state.images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
        return { images: [] }
      }),
  }),
)
