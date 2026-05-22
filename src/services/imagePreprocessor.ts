export interface PreparedReceiptImage {
  image: File | Blob | string
  operations: string[]
}

export interface ImagePreprocessor {
  prepareReceiptImage(image: File | string): Promise<PreparedReceiptImage>
}

export function createNoopImagePreprocessor(): ImagePreprocessor {
  return {
    async prepareReceiptImage(image) {
      return {
        image,
        operations: [],
      }
    },
  }
}
