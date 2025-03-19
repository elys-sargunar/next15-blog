"use client"

import NavLink from "./NavLink";
import Link from "next/link";
import CartIcon from "./CartIcon";

type ClientNavigationProps = {
  authUser: { userId: string } | null;
};

export default function ClientNavigation({ authUser }: ClientNavigationProps) {
  return (
    <div className="flex items-center space-x-2">
      {authUser ? (
        <>
          <NavLink label="New Post" href="/posts/create"></NavLink>
          <NavLink label="Dashboard" href="/dashboard"></NavLink>
          <CartIcon />
          <form action="/api/logout" method="POST">
            <button className="nav-link">Logout</button>
          </form>
        </>
      ) : (
        <>
          <NavLink label="Register" href="/register"></NavLink>
          <NavLink label="Login" href="/login"></NavLink>
          <CartIcon />
        </>
      )}
    </div>
  );
} 