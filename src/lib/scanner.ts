import { appBase } from '@/app/basePath'

export type IsbnDetector = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>
}

export type WakeLockHandle = {
  release(): Promise<void>
}

type NativeDetectorConstructor = new (options?: { formats?: string[] }) => IsbnDetector

type WakeLockNavigator = {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockHandle>
  }
}

export async function createIsbnDetector(): Promise<IsbnDetector> {
  const NativeDetector = (window as unknown as { BarcodeDetector?: NativeDetectorConstructor })
    .BarcodeDetector

  if (NativeDetector) {
    try {
      return new NativeDetector({ formats: ['ean_13'] })
    } catch {
      // Нативный детектор не принял формат — используем wasm.
    }
  }

  const { BarcodeDetector, setZXingModuleOverrides } = await import('barcode-detector')

  setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? `${appBase}zxing/zxing_reader.wasm` : `${prefix}${path}`,
  })

  return new BarcodeDetector({ formats: ['ean_13'] })
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return

  for (const track of stream.getTracks()) {
    track.stop()
  }
}

export async function requestScreenWakeLock(): Promise<WakeLockHandle | null> {
  const wakeLock = (navigator as unknown as WakeLockNavigator).wakeLock
  if (!wakeLock) return null

  try {
    return await wakeLock.request('screen')
  } catch {
    return null
  }
}
