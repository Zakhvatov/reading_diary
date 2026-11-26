import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeOcrText, ocrStatusLabel, recognizeText } from './ocr'

const mocks = vi.hoisted(() => ({
  createWorker: vi.fn(),
  recognize: vi.fn(),
  terminate: vi.fn(),
}))

vi.mock('tesseract.js', () => ({ createWorker: mocks.createWorker }))

beforeEach(() => {
  mocks.recognize.mockReset()
  mocks.terminate.mockReset()
  mocks.createWorker.mockReset()

  mocks.createWorker.mockImplementation(async (...args: unknown[]) => {
    const options = args[2] as
      { logger?: (message: { status: string; progress: number }) => void } | undefined
    options?.logger?.({ status: 'recognizing text', progress: 0.5 })
    return { recognize: mocks.recognize, terminate: mocks.terminate }
  })
})

describe('normalizeOcrText', () => {
  it('removes trailing spaces, extra blank lines and hyphen line breaks', () => {
    expect(normalizeOcrText('Рукописи не го-\nрят.   \n\n\n\nКонец.  ')).toBe(
      'Рукописи не горят.\n\nКонец.',
    )
  })

  it('keeps author punctuation and single line breaks', () => {
    expect(normalizeOcrText('«Привет», — сказал он.\nВторая строка.')).toBe(
      '«Привет», — сказал он.\nВторая строка.',
    )
  })
})

describe('ocrStatusLabel', () => {
  it('translates known tesseract statuses', () => {
    expect(ocrStatusLabel('loading language traineddata')).toBe('Загружаем язык')
    expect(ocrStatusLabel('recognizing text')).toBe('Распознаём текст')
  })

  it('falls back to a generic label', () => {
    expect(ocrStatusLabel('something new')).toBe('Распознаём')
  })
})

describe('recognizeText', () => {
  it('recognizes text through a mocked worker without network', async () => {
    mocks.recognize.mockResolvedValue({ data: { text: '  Цитата со страницы.  ' } })
    mocks.terminate.mockResolvedValue({})
    const onProgress = vi.fn()

    const text = await recognizeText(new Blob(['page']), { onProgress })

    expect(text).toBe('Цитата со страницы.')
    expect(mocks.createWorker).toHaveBeenCalledWith('rus+eng', undefined, expect.any(Object))
    expect(onProgress).toHaveBeenCalledWith({
      status: 'recognizing text',
      label: 'Распознаём текст',
      progress: 0.5,
    })
    expect(mocks.terminate).toHaveBeenCalled()
  })

  it('stops before loading the engine when already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      recognizeText(new Blob(['page']), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(mocks.createWorker).not.toHaveBeenCalled()
  })

  it('terminates the worker after a recognition error', async () => {
    mocks.recognize.mockRejectedValue(new Error('decode failed'))
    mocks.terminate.mockResolvedValue({})

    await expect(recognizeText(new Blob(['page']))).rejects.toThrow('decode failed')
    expect(mocks.terminate).toHaveBeenCalled()
  })
})
