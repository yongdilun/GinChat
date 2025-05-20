'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login?session=logout';
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path: string) => {
    return pathname === path ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600';
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-primary-600">GinChat</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
            <Link href="/" className={`px-3 py-2 text-sm font-medium ${isActive('/')}`}>
              Home
            </Link>
            {!isLoggedIn ? (
              <>
                <Link href="/auth/login" className={`px-3 py-2 text-sm font-medium ${isActive('/auth/login')}`}>
                  Login
                </Link>
                <Link href="/auth/register" className={`px-3 py-2 text-sm font-medium ${isActive('/auth/register')}`}>
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link href="/chat" className={`px-3 py-2 text-sm font-medium ${isActive('/chat')}`}>
                  Chat
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                /* Icon when menu is open */
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/" className={`block px-3 py-2 text-base font-medium ${isActive('/')}`}>
              Home
            </Link>
            {!isLoggedIn ? (
              <>
                <Link href="/auth/login" className={`block px-3 py-2 text-base font-medium ${isActive('/auth/login')}`}>
                  Login
                </Link>
                <Link href="/auth/register" className={`block px-3 py-2 text-base font-medium ${isActive('/auth/register')}`}>
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link href="/chat" className={`block px-3 py-2 text-base font-medium ${isActive('/chat')}`}>
                  Chat
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
