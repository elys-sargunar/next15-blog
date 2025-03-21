import { ReactNode } from "react";
import { redirect } from "next/navigation";
import getAuthUser from "@/lib/getAuthUser";

// Set Node.js runtime for this layout
export const runtime = 'nodejs';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Check if user is authenticated
  const authUser = await getAuthUser();
  
  if (!authUser) {
    // Not authenticated, redirect to login
    redirect("/login");
  }
  
  // User is authenticated, render dashboard content
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {children}
    </div>
  );
} 