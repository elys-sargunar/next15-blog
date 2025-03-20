"use client"

import { useState } from "react";
import NavLink from "./NavLink";
import CartIcon from "./CartIcon";
import { logout } from "@/actions/auth";

type ClientNavigationProps = {
  authUser: { userId: string } | null;
};

export default function ClientNavigation({ authUser }: ClientNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="relative">
      {/* Burger Menu Icon - only visible on mobile/tablet */}
      <button 
        className="md:hidden flex flex-col justify-center items-center w-8 h-8"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span className={`block w-6 h-0.5 bg-white mb-1.5 transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
        <span className={`block w-6 h-0.5 bg-white mb-1.5 transition-opacity ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
        <span className={`block w-6 h-0.5 bg-white transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
      </button>

      {/* Navigation Links */}
      <div className={`
        md:flex items-center space-x-2
        ${isMenuOpen ? 'flex' : 'hidden'} 
        absolute md:relative right-0 top-14 md:top-0
        flex-col md:flex-row
        bg-slate-800 md:bg-transparent
        p-4 md:p-0
        rounded shadow-md md:shadow-none
        space-y-2 md:space-y-0
        min-w-[150px]
        z-10 border-white border-2 border-t-0 md:border-none
      `}>
        
        {/* Authentication specific links */}
        {authUser ? (
          <>
            {/* My Orders link - visible on all device sizes */}
            <NavLink label="My Orders" href="/my-orders"></NavLink>
            <NavLink label="New Post" href="/posts/create"></NavLink>
            {/* <NavLink label="Dashboard" href="/dashboard"></NavLink> */}            
            <form action={logout}>
              <button className="nav-link">Logout</button>
            </form>
            <CartIcon />
          </>
        ) : (
          <>
            
            {/* My Orders link - visible on all device sizes */}
            <NavLink label="My Orders" href="/my-orders"></NavLink>
            <NavLink label="Login" href="/login"></NavLink>
            <NavLink label="Register" href="/register"></NavLink>            
            <CartIcon />
          </>
        )}
      </div>
    </div>
  );
} 