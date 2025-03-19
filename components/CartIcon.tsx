"use client"

import { useCart } from "@/lib/CartContext";
import Link from "next/link";

export default function CartIcon() {
  const { totalItems } = useCart();

  return (
    <Link href="/order" className="flex items-center relative">
      {/* <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="nav-link"
      >
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg> */}
      <span className="text-white">Cart</span>
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </Link>
  );
} 