import { useState } from 'react'
import './index.css'
import { Wallet } from '../Wallet'
import { Link, NavLink } from 'react-router-dom'

const activeItem = ({ isActive } : any) => {
    return isActive ?
        "Menu-Selected"
        :
        "Menu-Item"
}

export const Navbar = () => {
    const [ mobileMenuHidden, setMobileMenuHidden ] = useState(true)
    return (
        <nav className="Navbar">
          <div className="container flex flex-wrap justify-between items-center mx-auto">
          <Link to="/" className="flex items-center">
            <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">Trucazo</span>
          </Link>
          <div className="flex md:order-2">
              <Wallet />
              <button onClick={() => setMobileMenuHidden(!mobileMenuHidden)} type="button" className="inline-flex items-center p-2 text-sm rounded-lg md:hidden focus:outline-none focus:ring-2 text-gray-400 hover:bg-gray-700 focus:ring-gray-600">
                <span className="sr-only">Open main menu</span>
                <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" ></path></svg>
            </button>
          </div>
          <div className={`${mobileMenuHidden ? 'hidden' : ''} justify-between items-center w-full md:flex md:w-auto md:order-1`}>
              <ul className="Menu">
                <li>
                  <NavLink to="/" className={activeItem} end>Home</NavLink>
                </li>
                <li>
                  <NavLink to="/game" className={activeItem}>Game</NavLink>
                </li>
              </ul>
          </div>
          </div>
        </nav>
    )
}
