import { PencilSimple, Plus, Trash, Users } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { createCharacter, deleteCharacter, updateCharacter } from '@/db/repositories/characters'
import type { Character, ID } from '@/db/types'
import { DiaryEmpty, SectionHeader } from './SectionChrome'

const fieldClass =
  'mt-1 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] leading-[24px] text-ink placeholder:text-muted/70'

type CharacterListProps = {
  bookId: ID
  characters: Character[]
}

export function CharacterList({ bookId, characters }: CharacterListProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Character | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Character | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function remove() {
    if (!pendingDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteCharacter(pendingDelete.id)
      setPendingDelete(null)
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'Не удалось удалить персонажа')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section>
      <SectionHeader
        title="Персонажи"
        count={characters.length}
        action={
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden />
            Добавить
          </Button>
        }
      />

      {characters.length === 0 ? (
        <DiaryEmpty
          icon={<Users size={24} />}
          title="Пока никого нет"
          description="Запишите героев и их судьбы, чтобы не путаться по ходу чтения."
          actionLabel="Добавить персонажа"
          onAction={() => setAdding(true)}
        />
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={() => setEditing(character)}
              onDelete={() => {
                setDeleteError(null)
                setPendingDelete(character)
              }}
            />
          ))}
        </ul>
      )}

      {adding || editing ? (
        <CharacterSheet
          bookId={bookId}
          character={editing ?? undefined}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
        />
      ) : null}

      <Sheet
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) setPendingDelete(null)
        }}
        title="Удалить персонажа?"
      >
        <p className="text-[15px] leading-[23px] text-muted">
          {pendingDelete ? `«${pendingDelete.name}» исчезнет из дневника.` : ''}
        </p>
        {deleteError ? (
          <p role="alert" className="mt-3 text-[14px] leading-[20px] text-signal">
            {deleteError}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="danger" onClick={remove} disabled={deleting}>
            {deleting ? 'Удаляем…' : 'Удалить'}
          </Button>
          <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
            Отмена
          </Button>
        </div>
      </Sheet>
    </section>
  )
}

type CharacterCardProps = {
  character: Character
  onEdit: () => void
  onDelete: () => void
}

function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  const [revealed, setRevealed] = useState(false)
  const hidden = Boolean(character.spoiler) && character.note.length > 0 && !revealed

  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[18px] leading-[24px] font-medium">{character.name}</p>
          {character.role ? (
            <p className="mt-0.5 text-[13px] leading-[18px] text-muted">{character.role}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Изменить ${character.name}`}
            className="flex size-11 items-center justify-center rounded-full text-ink active:bg-accent-soft"
          >
            <PencilSimple size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Удалить ${character.name}`}
            className="flex size-11 items-center justify-center rounded-full text-signal active:bg-signal-soft"
          >
            <Trash size={18} aria-hidden />
          </button>
        </div>
      </div>

      {character.note ? (
        hidden ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-2 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-paper px-3 text-[13px] leading-[18px] text-muted active:bg-accent-soft"
          >
            Спойлер · показать
          </button>
        ) : (
          <div className="mt-2">
            {character.spoiler ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Спойлер
              </p>
            ) : null}
            <p className="text-[14px] leading-[20px] whitespace-pre-line">{character.note}</p>
          </div>
        )
      ) : null}
    </li>
  )
}

type CharacterSheetProps = {
  bookId: ID
  character?: Character
  onClose: () => void
}

function CharacterSheet({ bookId, character, onClose }: CharacterSheetProps) {
  const [name, setName] = useState(character?.name ?? '')
  const [role, setRole] = useState(character?.role ?? '')
  const [note, setNote] = useState(character?.note ?? '')
  const [spoiler, setSpoiler] = useState(character?.spoiler ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Введите имя персонажа')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const roleValue = role.trim() || undefined
      const noteValue = note.trim()
      const spoilerValue = spoiler || undefined

      if (character) {
        await updateCharacter(character.id, {
          name: trimmed,
          role: roleValue,
          note: noteValue,
          spoiler: spoilerValue,
        })
      } else {
        await createCharacter({
          bookId,
          name: trimmed,
          role: roleValue,
          note: noteValue,
          spoiler: spoilerValue,
        })
      }

      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить персонажа')
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={character ? 'Персонаж' : 'Новый персонаж'}>
      <form onSubmit={handleSubmit} noValidate>
        <label className="block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Имя</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            disabled={busy}
            placeholder="Маргарита"
            autoComplete="off"
            className={`${fieldClass} h-12`}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Роль</span>
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={busy}
            placeholder="Главная героиня"
            autoComplete="off"
            className={`${fieldClass} h-12`}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Кто это</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={busy}
            rows={3}
            placeholder="Что важно помнить и что с ним случилось"
            className={`${fieldClass} min-h-24 resize-y py-3`}
          />
        </label>

        <label className="mt-4 flex min-h-11 items-center justify-between gap-3">
          <span>
            <span className="block text-[15px] leading-[20px]">Спойлер</span>
            <span className="block text-[13px] leading-[18px] text-muted">
              Текст скроется до нажатия.
            </span>
          </span>
          <input
            type="checkbox"
            checked={spoiler}
            onChange={(event) => setSpoiler(event.target.checked)}
            disabled={busy}
            className="size-5 accent-accent"
          />
        </label>

        {error ? (
          <p role="alert" className="mt-3 text-[14px] leading-[20px] text-signal">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
