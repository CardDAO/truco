import { useState } from 'react'
import './index.css'
import { Wallet } from '../Wallet'
import { Link, NavLink } from 'react-router-dom'
import { MdOutlineMenu } from 'react-icons/md'

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
              <button onClick={() => setMobileMenuHidden(!mobileMenuHidden)} type="button" className="inline-flex items-center p-2 text-sm rounded-lg md:hidden focus:outline-none focus:ring-2 text-gray-400 hover:bg-gray-700 focus:ring-gray-600 mx-4">
                <span className="sr-only">Open main menu</span>
                <MdOutlineMenu className="text-xl" />
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
