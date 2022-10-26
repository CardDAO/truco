import { Navbar } from '../Navbar'
import { Outlet } from "react-router-dom";

export const Root = () => {
    return (
        <div className="App">
            <Navbar />
            <div className="flex items-center justify-center h-[calc(100vh-20vh)]">
                <Outlet />
            </div>
        </div>
    )

}
