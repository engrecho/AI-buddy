// 路由配置(由 App.jsx 的 HashRouter 消费)
// 注意:页面切换的实际"主导航 tab"在 Index.jsx 中由 state 控制,
// 这里只是把每条主导航的路径映射到对应的页面组件,确保直接访问 URL 也能渲染。
import Index from './pages/Index';
import TasksPage from './pages/TasksPage';
import MemosPage from './pages/MemosPage';
import ReadingPage from './pages/ReadingPage';
import DashboardPage from './pages/DashboardPage';

export const navItems = [
  { to: '/',          page: <Index /> },
  { to: '/dashboard', page: <DashboardPage /> },
  { to: '/tasks',     page: <TasksPage /> },
  { to: '/memos',     page: <MemosPage /> },
  { to: '/reading',   page: <ReadingPage /> },
];
