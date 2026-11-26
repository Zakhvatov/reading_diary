export type OcrProgressInfo = {
  /** Сырой статус tesseract.js: `loading language traineddata` и т. п. */
  status: string
  /** Подпись на русском для интерфейса. */
  label: string
  /** 0…1 */
  progress: number
}

export type OcrOptions = {
  onProgress?: (info: OcrProgressInfo) => void
  signal?: AbortSignal
}

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Загружаем движок',
  'initializing tesseract': 'Готовим движок',
  'loading language traineddata': 'Загружаем язык',
  'initializing api': 'Готовим распознавание',
  'recognizing text': 'Распознаём текст',
}

export function ocrStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? 'Распознаём'
}

/**
 * Убирает мусор OCR: хвостовые пробелы, тройные пустые строки и перенос
 * слова через дефис — без изменения авторской пунктуации.
 */
export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Уменьшает фото страницы до 1600 px по длинной стороне: tesseract работает
 * быстрее, а мелкий текст распознаётся не хуже. В среде без canvas возвращает
 * исходный файл.
 */
export async function prepareImage(image: Blob, maxSide = 1600): Promise<Blob> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return image

  let bitmap: ImageBitmap | undefined

  try {
    bitmap = await createImageBitmap(image)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    if (scale >= 1) return image

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) return image

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.88),
    )
    return blob ?? image
  } catch {
    return image
  } finally {
    bitmap?.close()
  }
}

/**
 * Ленивый OCR: `tesseract.js` подгружается только при первом вызове, поэтому
 * чанк не попадает в основной бандл. Первый запуск требует сети (движок и
 * русская модель ~10 МБ), дальше браузер и service worker отдают из кэша.
 */
export async function recognizeText(image: Blob, options: OcrOptions = {}): Promise<string> {
  const { signal, onProgress } = options
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const { createWorker } = await import('tesseract.js')

  const worker = await createWorker('rus+eng', undefined, {
    logger: (message) => {
      onProgress?.({
        status: message.status,
        label: ocrStatusLabel(message.status),
        progress: message.progress,
      })
    },
  })

  if (signal?.aborted) {
    await worker.terminate()
    throw new DOMException('Aborted', 'AbortError')
  }

  let aborted = false
  const handleAbort = () => {
    aborted = true
    void worker.terminate()
  }

  signal?.addEventListener('abort', handleAbort, { once: true })

  try {
    const result = await worker.recognize(image)
    return normalizeOcrText(result.data.text)
  } catch (error) {
    if (aborted) throw new DOMException('Aborted', 'AbortError')
    throw error
  } finally {
    signal?.removeEventListener('abort', handleAbort)
    try {
      await worker.terminate()
    } catch {
      // Воркер мог быть уже остановлен отменой.
    }
  }
}
