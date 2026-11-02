// 주소별 페이지와 메뉴를 한 곳에서 관리한다.
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layouts/RootLayout.jsx';
import Home from './pages/Home.jsx';
import Agent from './pages/Agent.jsx';
import Today from './pages/Today.jsx';
import Saved from './pages/Saved.jsx';
import NotFound from './pages/NotFound.jsx';

export const NAV_ITEMS = [
  { to: '/', label: '홈', icon: 'house-heart' },
  { to: '/today', label: '오늘 현황', icon: 'cloud-sun' },
  { to: '/agent', label: '판로 비서', icon: 'chat-dots' },
  { to: '/saved', label: '내 후보', icon: 'bookmark-star' },
];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'today', element: <Today /> },
      { path: 'agent', element: <Agent /> },
      { path: 'saved', element: <Saved /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
