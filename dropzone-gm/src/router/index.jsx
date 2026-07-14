import { createBrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';
import CreateSession from '../pages/CreateSession';
import SessionManagement from '../pages/SessionManagement';
import Results from '../pages/Results';

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/create', element: <CreateSession /> },
  { path: '/session/:sessionId', element: <SessionManagement /> },
  { path: '/results/:sessionId', element: <Results /> },
]);
