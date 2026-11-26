import type { BookStatus } from '@/db/types'

export const STATUS_TONE = {
  reading: {
    chip: 'bg-sage text-sage-ink',
    dot: 'bg-sage-ink',
    caption: 'text-sage-ink',
    tone: 'sage',
  },
  want: {
    chip: 'bg-butter text-butter-ink',
    dot: 'bg-butter-ink',
    caption: 'text-butter-ink',
    tone: 'butter',
  },
  finished: {
    chip: 'bg-sky text-sky-ink',
    dot: 'bg-sky-ink',
    caption: 'text-sky-ink',
    tone: 'sky',
  },
  dnf: {
    chip: 'bg-rose text-rose-ink',
    dot: 'bg-rose-ink',
    caption: 'text-rose-ink',
    tone: 'rose',
  },
  rereading: {
    chip: 'bg-lilac text-lilac-ink',
    dot: 'bg-lilac-ink',
    caption: 'text-lilac-ink',
    tone: 'lilac',
  },
} as const satisfies Record<
  BookStatus,
  {
    chip: string
    dot: string
    caption: string
    tone: 'sage' | 'butter' | 'sky' | 'rose' | 'lilac'
  }
>
