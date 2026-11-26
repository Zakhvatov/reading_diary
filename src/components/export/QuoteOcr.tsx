import { Camera, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { prepareImage, recognizeText, type OcrProgressInfo } from '@/lib/ocr'

export type QuoteOcrProps = {
  initialText?: string
  onText: (text: string) => void
}

/**
 * OCR цитаты с фото страницы. `tesseract.js` грузится лениво только при
 * первом распознавании; текст всегда можно вписать или поправить вручную.
 */
export function QuoteOcr({ initialText = '', onText }: QuoteOcrProps) {
  const [text, setText] = useState(initialText)
  const [progress, setProgress] = useState<OcrProgressInfo | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function updateText(value: string) {
    setText(value)
    onText(value)
  }

  function cancel() {
    controllerRef.current?.abort()
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const controller = new AbortController()
    controllerRef.current = controller

    setPreviewUrl(URL.createObjectURL(file))
    setBusy(true)
    setError(null)
    setProgress({ status: 'preparing', label: 'Готовим фото', progress: 0 })

    try {
      const image = await prepareImage(file)
      const recognized = await recognizeText(image, {
        signal: controller.signal,
        onProgress: setProgress,
      })
      if (!recognized.trim()) {
        setError('На фото не нашёлся текст. Впишите его вручную или попробуйте другое фото.')
        return
      }
      updateText(recognized)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setError('Распознавание отменено')
      } else {
        setError('Не удалось распознать текст. Впишите его вручную или попробуйте другое фото.')
      }
    } finally {
      controllerRef.current = null
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] leading-[18px] font-medium text-muted">Фото страницы</p>
          <p className="mt-1 text-[13px] leading-[18px] text-muted">
            Русский и английский. Первый запуск загружает модель.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="shrink-0"
        >
          <Camera size={20} aria-hidden />
          {busy ? 'Распознаём…' : 'Фото'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="sr-only"
        aria-label="Выбрать фото страницы"
      />

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Фото страницы для распознавания"
          className="mt-3 max-h-40 w-auto rounded-[var(--radius-control)] border border-line object-contain"
        />
      ) : null}

      {offline ? (
        <p className="mt-3 text-[13px] leading-[18px] text-muted">
          Нет сети: в первый раз OCR загружает движок из интернета. Текст можно вписать вручную.
        </p>
      ) : null}

      {progress ? (
        <div className="mt-3">
          <p role="status" className="text-[13px] leading-[18px] text-muted">
            {progress.label} · {Math.round(progress.progress * 100)}%
          </p>
          <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-line" aria-hidden>
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.round(progress.progress * 100)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={cancel}
            className="mt-2 flex min-h-11 items-center gap-1.5 text-[13px] leading-[18px] font-medium text-muted"
          >
            <X size={16} aria-hidden />
            Отмена
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-[14px] leading-[20px] text-signal">
          {error}
        </p>
      ) : null}

      <label className="mt-4 block">
        <span className="text-[13px] leading-[18px] font-medium text-muted">Текст цитаты</span>
        <textarea
          value={text}
          onChange={(event) => updateText(event.target.value)}
          rows={4}
          disabled={busy}
          placeholder="Распознанный текст появится здесь — его можно поправить"
          className="mt-1 min-h-28 w-full resize-y rounded-[var(--radius-control)] border border-line bg-surface px-3 py-3 text-[16px] leading-[24px] text-ink placeholder:text-muted/70"
        />
      </label>
    </div>
  )
}
