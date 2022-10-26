import { Navbar } from '../Navbar'
import { Outlet } from "react-router-dom";

export const Root = () => {
    return (
        <div className="App">
            <Navbar />
            <Outlet />
        </div>
    )

}
