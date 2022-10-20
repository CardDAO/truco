import './App.css'
import {
  RouterProvider,
} from "react-router-dom";
import { router } from './hooks/router'

function App() {
    return (
        <RouterProvider
            router={router}
            fallbackElement={
                <h1 className="text-4xl text-white">Loading</h1>
            }
        />
    );
}

export default App;
