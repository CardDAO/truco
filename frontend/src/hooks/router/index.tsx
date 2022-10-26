import { Game } from '../../components/Game';
import { Home } from '../../components/Home';
import { Root } from '../../components/Root';
import {
  createBrowserRouter,
} from "react-router-dom";
/**
 * React router
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/game",
        element: <Game />
      }
    ]
  }
]);
