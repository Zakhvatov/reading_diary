export type DiaryTemplateId = 'lite' | 'analyst' | 'bookclub'

export type DiarySection = 'overview' | 'quotes' | 'characters' | 'plot' | 'insights' | 'links'

export const DIARY_SECTION_LABELS: Record<DiarySection, string> = {
  overview: 'Обзор',
  quotes: 'Цитаты',
  characters: 'Персонажи',
  plot: 'Сюжет',
  insights: 'Мысли',
  links: 'Связи',
}

const TEMPLATE_SECTIONS: Record<DiaryTemplateId, DiarySection[]> = {
  lite: ['overview', 'quotes'],
  analyst: ['overview', 'quotes', 'characters', 'plot', 'insights'],
  bookclub: ['overview', 'quotes', 'insights', 'links'],
}

export const DIARY_TEMPLATES: { id: DiaryTemplateId; title: string; description: string }[] = [
  {
    id: 'lite',
    title: 'Лайт',
    description: 'Оценка и пара цитат — для тех, кто читает много',
  },
  {
    id: 'analyst',
    title: 'Аналитик',
    description: 'Персонажи, сюжет по главам и мысли',
  },
  {
    id: 'bookclub',
    title: 'Книжный клуб',
    description: 'Цитаты, вопросы и связи с другими книгами',
  },
]

/** Шаблон управляет только видимостью и порядком секций, не данными. */
export function sectionsFor(template: DiaryTemplateId): DiarySection[] {
  return [...TEMPLATE_SECTIONS[template]]
}
