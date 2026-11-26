import {
  BookOpen,
  Books,
  CalendarDots,
  ChartBar,
  Info,
  Notebook,
  PencilSimple,
  Scan,
  Sparkle,
  Target,
  Timer,
} from '@phosphor-icons/react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { BackupScreen } from '@/screens/BackupScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { NotFoundScreen } from '@/screens/NotFoundScreen'
import { PlaceholderScreen } from '@/screens/PlaceholderScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { RouteError } from './RouteError'
import { routerBasename } from './basePath'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      errorElement: <RouteError />,
      children: [
        { index: true, element: <Navigate to="/home" replace /> },
        { path: 'home', element: <HomeScreen /> },
        {
          path: 'shelves',
          element: (
            <PlaceholderScreen
              title="Библиотека"
              caption="Полки"
              icon={<Books size={28} />}
              description="Здесь появятся полки: хочу прочитать, читаю, прочитано и не дочитал."
            />
          ),
        },
        {
          path: 'shelves/:shelf',
          element: (
            <PlaceholderScreen
              title="Полка"
              caption="Библиотека"
              back
              icon={<Books size={28} />}
              description="Книги этой полки появятся здесь, как только вы их добавите."
            />
          ),
        },
        {
          path: 'add',
          element: (
            <PlaceholderScreen
              title="Новая книга"
              caption="Библиотека"
              back
              icon={<BookOpen size={28} />}
              description="Форма добавления книги — следующий шаг. Название, автор и страницы."
            />
          ),
        },
        {
          path: 'scan',
          element: (
            <PlaceholderScreen
              title="Сканер ISBN"
              caption="Новая книга"
              back
              icon={<Scan size={28} />}
              description="Сканирование штрихкода появится после ручного добавления книг."
            />
          ),
        },
        {
          path: 'books/:bookId',
          element: (
            <PlaceholderScreen
              title="Книга"
              caption="Библиотека"
              back
              icon={<BookOpen size={28} />}
              description="Карточка книги: обложка, прогресс, сессии и заметки."
            />
          ),
        },
        {
          path: 'books/:bookId/edit',
          element: (
            <PlaceholderScreen
              title="Редактирование"
              caption="Книга"
              back
              icon={<PencilSimple size={28} />}
              description="Правка метаданных книги появится вместе с библиотекой."
            />
          ),
        },
        {
          path: 'timer',
          element: (
            <PlaceholderScreen
              title="Таймер"
              caption="Чтение"
              icon={<Timer size={28} />}
              description="Запуск сессии, пауза и сохранение времени чтения."
            />
          ),
        },
        {
          path: 'journals',
          element: (
            <PlaceholderScreen
              title="Дневник"
              caption="Записи"
              icon={<Notebook size={28} />}
              description="Записи и цитаты по книгам — с датой, цветной полосой и привязкой к книге."
            />
          ),
        },
        {
          path: 'journals/new',
          element: (
            <PlaceholderScreen
              title="Новая запись"
              caption="Дневник"
              back
              icon={<PencilSimple size={28} />}
              description="Редактор записи появится вместе с дневником."
            />
          ),
        },
        {
          path: 'journals/:journalId',
          element: (
            <PlaceholderScreen
              title="Запись"
              caption="Дневник"
              back
              icon={<Notebook size={28} />}
              description="Текст записи, цитаты и связанные книги."
            />
          ),
        },
        {
          path: 'calendar',
          element: (
            <PlaceholderScreen
              title="Календарь"
              caption="Статистика"
              icon={<CalendarDots size={28} />}
              description="Дни чтения, страницы и книги — в календарной сетке."
            />
          ),
        },
        {
          path: 'stats',
          element: (
            <PlaceholderScreen
              title="Статистика"
              caption="Итоги"
              icon={<ChartBar size={28} />}
              description="Время, страницы и серия дней по неделям, месяцам и годам."
            />
          ),
        },
        {
          path: 'goal',
          element: (
            <PlaceholderScreen
              title="Цель"
              caption="Статистика"
              back
              icon={<Target size={28} />}
              description="Годовая цель по книгам и страницам."
            />
          ),
        },
        {
          path: 'settings',
          element: <SettingsScreen />,
        },
        {
          path: 'settings/backup',
          element: <BackupScreen />,
        },
        {
          path: 'about',
          element: (
            <PlaceholderScreen
              title="О приложении"
              caption="Reading Diary"
              back
              icon={<Info size={28} />}
              description="Личный читательский дневник. Данные не покидают браузер."
            />
          ),
        },
        {
          path: 'recommendations',
          element: (
            <PlaceholderScreen
              title="Рекомендации"
              caption="Ещё"
              icon={<Sparkle size={28} />}
              description="Этого раздела в приложении не будет."
            />
          ),
        },
        { path: '*', element: <NotFoundScreen /> },
      ],
    },
  ],
  { basename: routerBasename },
)
