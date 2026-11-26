import { Info, Sparkle } from '@phosphor-icons/react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AddBookScreen } from '@/screens/add/AddBookScreen'
import { BackupScreen } from '@/screens/BackupScreen'
import { BookDetailScreen } from '@/screens/book/BookDetailScreen'
import { BookEditScreen } from '@/screens/book/BookEditScreen'
import { CalendarScreen } from '@/screens/calendar/CalendarScreen'
import { DiaryScreen } from '@/screens/diary/DiaryScreen'
import { GoalScreen } from '@/screens/goal/GoalScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { JournalDetailScreen } from '@/screens/journals/JournalDetailScreen'
import { JournalEditorScreen } from '@/screens/journals/JournalEditorScreen'
import { JournalListScreen } from '@/screens/journals/JournalListScreen'
import { NotFoundScreen } from '@/screens/NotFoundScreen'
import { PlaceholderScreen } from '@/screens/PlaceholderScreen'
import { ScanScreen } from '@/screens/scan/ScanScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { ShelfDetailScreen } from '@/screens/shelves/ShelfDetailScreen'
import { ShelvesScreen } from '@/screens/shelves/ShelvesScreen'
import { StatsScreen } from '@/screens/stats/StatsScreen'
import { TimerScreen } from '@/screens/timer/TimerScreen'
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
          element: <ShelvesScreen />,
        },
        {
          path: 'shelves/:shelf',
          element: <ShelfDetailScreen />,
        },
        {
          path: 'add',
          element: <AddBookScreen />,
        },
        {
          path: 'scan',
          element: <ScanScreen />,
        },
        {
          path: 'books/:bookId',
          element: <BookDetailScreen />,
        },
        {
          path: 'books/:bookId/edit',
          element: <BookEditScreen />,
        },
        {
          path: 'books/:bookId/diary',
          element: <DiaryScreen />,
        },
        {
          path: 'timer',
          element: <TimerScreen />,
        },
        {
          path: 'timer/:bookId',
          element: <TimerScreen />,
        },
        {
          path: 'journals',
          element: <JournalListScreen />,
        },
        {
          path: 'journals/new',
          element: <JournalEditorScreen />,
        },
        {
          path: 'journals/:journalId',
          element: <JournalDetailScreen />,
        },
        {
          path: 'journals/:journalId/edit',
          element: <JournalEditorScreen />,
        },
        {
          path: 'calendar',
          element: <CalendarScreen />,
        },
        {
          path: 'stats',
          element: <StatsScreen />,
        },
        {
          path: 'goal',
          element: <GoalScreen />,
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
