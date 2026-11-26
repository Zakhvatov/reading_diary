import { fileToCover, type ImageResult } from './image'

export async function fetchRemoteCover(url: string): Promise<ImageResult | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(url, {
      mode: 'cors',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    const blob = await response.blob()

    if (!blob.type.startsWith('image/')) {
      return null
    }

    return await fileToCover(blob)
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}
