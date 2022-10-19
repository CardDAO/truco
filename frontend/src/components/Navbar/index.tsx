import { useState } from 'react'
import './index.css'

export const Navbar = () => {
    const [ mobileMenuHidden, setMobileMenuHidden ] = useState(true)
    return (
        <nav className="Navbar">
          <div className="container flex flex-wrap justify-between items-center mx-auto">
          <a href="#" className="flex items-center">
              <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">Trucazo</span>
          </a>
          <button type="button" className="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-3 md:mr-0 bg-blue-600 hover:bg-blue-700 focus:ring-blue-800">Connect wallet</button>
          <div className="flex md:order-1">
              <button onClick={() => setMobileMenuHidden(!mobileMenuHidden)} type="button" className="inline-flex items-center p-2 text-sm rounded-lg md:hidden focus:outline-none focus:ring-2 text-gray-400 hover:bg-gray-700 focus:ring-gray-600">
                <span className="sr-only">Open main menu</span>
                <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" ></path></svg>
            </button>
          </div>
          <div className={`${mobileMenuHidden ? 'hidden' : ''} justify-between items-center w-full md:flex md:w-auto md:order-1`}>
              <ul className="Menu">
                <li>
                  <a href="#" className="Menu-Selected">Home</a>
                </li>
                <li>
                  <a href="#" className="Menu-Item">Game</a>
                </li>
              </ul>
          </div>
          </div>
        </nav>
    )
}
