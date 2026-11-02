// 주소별 페이지와 메뉴를 한 곳에서 관리한다.
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layouts/RootLayout.jsx';
import Home from './pages/Home.jsx';
import Agent from './pages/Agent.jsx';
import Today from './pages/Today.jsx';
import Saved from './pages/Saved.jsx';
import Orders from './pages/Orders.jsx';
import NotFound from './pages/NotFound.jsx';
import { Loading } from './components/Status.jsx';

// 3D 화면은 three.js 가 무거워서 열 때만 불러온다
const Map3D = lazy(() => import('./pages/Map3D.jsx'));
const Harvest = lazy(() => import('./pages/Harvest.jsx'));

export const NAV_ITEMS = [
  { to: '/', label: '홈', icon: 'house-heart' },
  { to: '/today', label: '오늘 현황', icon: 'cloud-sun' },
  { to: '/agent', label: '판로 비서', icon: 'chat-dots' },
  { to: '/map', label: '3D 지도', icon: 'badge-3d' },
  { to: '/harvest', label: '3D 수확', icon: 'basket' },
  { to: '/saved', label: '내 후보', icon: 'bookmark-star' },
  { to: '/orders', label: '주문 현황', icon: 'clipboard-check' },
];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'today', element: <Today /> },
      { path: 'agent', element: <Agent /> },
      { path: 'map', element: <Suspense fallback={<Loading text="3D 화면을 불러오는 중..." />}><Map3D /></Suspense> },
      { path: 'harvest', element: <Suspense fallback={<Loading text="3D 화면을 불러오는 중..." />}><Harvest /></Suspense> },
      { path: 'saved', element: <Saved /> },
      { path: 'orders', element: <Orders /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
