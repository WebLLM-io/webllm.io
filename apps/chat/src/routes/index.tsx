import { createBrowserRouter } from 'react-router';
import { ChatLayout } from './chat-layout';
import { WelcomePage } from './welcome';
import { ConversationPage } from './conversation';

export const router = createBrowserRouter([
  {
    element: <ChatLayout />,
    children: [
      { index: true, element: <WelcomePage /> },
      { path: 'c/:id', element: <ConversationPage /> },
    ],
  },
]);
