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

/** Подсказка над разделом: шаблон задаёт не только состав, но и тон записей. */
export const TEMPLATE_SECTION_HINTS: Record<
  DiaryTemplateId,
  Partial<Record<DiarySection, string>>
> = {
  lite: {},
  analyst: {
    quotes: 'Цитаты, которые хочется перечитать.',
    characters: 'Кто двигает сюжет и зачем.',
    plot: 'Что происходит по главам — коротко.',
    insights: 'Наблюдения, догадки и то, что зацепило.',
  },
  bookclub: {
    quotes: 'Цитаты, на которых строится обсуждение.',
    insights: 'Вопросы, которые стоит задать группе.',
    links: 'С чем сравнить и что напоминает.',
  },
}
