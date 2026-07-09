import { lazy } from 'react';

const Index = lazy(() => import('./pages/Index'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const MemosPage = lazy(() => import('./pages/MemosPage'));
const ReadingPage = lazy(() => import('./pages/ReadingPage'));

export const navItems = [
  { to: '/',          page: <Index /> },
  { to: '/dashboard', page: <DashboardPage /> },
  { to: '/tasks',     page: <TasksPage /> },
  { to: '/memos',     page: <MemosPage /> },
  { to: '/reading',   page: <ReadingPage /> },
];
