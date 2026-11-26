import { CaretDown, Check } from '@phosphor-icons/react'
import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import type { DiaryTemplateId } from '@/db/types'
import { DIARY_SECTION_LABELS, DIARY_TEMPLATES, sectionsFor } from '@/lib/templates'

type TemplatePickerProps = {
  value: DiaryTemplateId
  onChange: (template: DiaryTemplateId) => void
  className?: string
  disabled?: boolean
  showLabel?: boolean
}

export function TemplatePicker({
  value,
  onChange,
  className,
  disabled = false,
  showLabel = true,
}: TemplatePickerProps) {
  const [open, setOpen] = useState(false)
  const current = DIARY_TEMPLATES.find((template) => template.id === value)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
        className={[
          'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface px-4 text-[14px] leading-[20px] font-medium active:bg-accent-soft',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {showLabel ? <span className="text-muted">Шаблон:</span> : null}
        <span className="min-w-0 truncate">{current?.title ?? 'Лайт'}</span>
        <CaretDown size={16} className="shrink-0 text-muted" aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Шаблон дневника">
        <div className="flex flex-col">
          {DIARY_TEMPLATES.map((template) => {
            const selected = template.id === value

            return (
              <button
                key={template.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  onChange(template.id)
                  setOpen(false)
                }}
                className={[
                  'flex min-h-[60px] items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 py-2 text-left',
                  selected ? 'bg-accent-soft' : 'active:bg-accent-soft',
                ].join(' ')}
              >
                <span className="min-w-0">
                  <span className="block text-[16px] leading-[22px] font-medium">
                    {template.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-[18px] text-muted">
                    {template.description}
                  </span>
                  <span className="mt-1 block text-[12px] leading-[16px] text-muted">
                    {sectionsFor(template.id)
                      .map((section) => DIARY_SECTION_LABELS[section])
                      .join(' · ')}
                  </span>
                </span>
                {selected ? <Check size={18} className="shrink-0 text-accent" aria-hidden /> : null}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-[13px] leading-[18px] text-muted">
          Смена шаблона меняет только видимость разделов. Записи не удаляются.
        </p>
      </Sheet>
    </>
  )
}
