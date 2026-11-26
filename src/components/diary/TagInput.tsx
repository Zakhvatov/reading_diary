import { X } from '@phosphor-icons/react'
import { useState, type KeyboardEvent } from 'react'

type TagInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}

function splitTags(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Добавить…',
  ariaLabel = 'Добавить тег',
  disabled = false,
}: TagInputProps) {
  const [draft, setDraft] = useState('')

  const normalized = new Set(value.map((tag) => tag.toLowerCase()))
  const available = suggestions.filter(
    (tag, index) =>
      !normalized.has(tag.toLowerCase()) &&
      suggestions.findIndex((other) => other.toLowerCase() === tag.toLowerCase()) === index,
  )

  function add(raw: string) {
    const tags = splitTags(raw)
    if (tags.length === 0) return

    const next = [...value]
    for (const tag of tags) {
      if (!next.some((item) => item.toLowerCase() === tag.toLowerCase())) next.push(tag)
    }

    onChange(next)
    setDraft('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      event.preventDefault()
      add(draft)
      return
    }

    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div>
      <div className="mt-1 rounded-[var(--radius-control)] border border-line bg-surface px-2 py-2 focus-within:border-accent">
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-pill)] border border-line bg-paper pr-0 pl-3 text-[14px] leading-[20px] text-ink"
            >
              {tag}
              <button
                type="button"
                aria-label={`Убрать тег ${tag}`}
                disabled={disabled}
                onClick={() => onChange(value.filter((item) => item !== tag))}
                className="flex size-11 items-center justify-center rounded-full text-muted active:bg-signal-soft"
              >
                <X size={14} aria-hidden />
              </button>
            </span>
          ))}
          <input
            value={draft}
            disabled={disabled}
            aria-label={ariaLabel}
            placeholder={value.length === 0 ? placeholder : undefined}
            onChange={(event) => {
              const next = event.target.value
              if (/[,;]/.test(next)) {
                add(next)
                return
              }
              setDraft(next)
            }}
            onKeyDown={handleKeyDown}
            className="h-11 min-w-28 flex-1 bg-transparent px-2 text-[16px] leading-[24px] text-ink placeholder:text-muted/70 focus:outline-none"
          />
        </div>
      </div>

      {available.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {available.slice(0, 8).map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => add(tag)}
              className="inline-flex min-h-9 items-center rounded-[var(--radius-pill)] border border-line px-3 text-[13px] leading-[18px] text-muted active:bg-accent-soft"
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
