import { ReactNode } from "react";
import { redirect } from "next/navigation";
import getAuthUser from "@/lib/getAuthUser";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

// Set Node.js runtime for this layout
export const runtime = 'nodejs';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Check if user is authenticated and is an admin
  const authUser = await getAuthUser();
  
  if (!authUser) {
    // Not authenticated, redirect to login
    redirect("/login");
  }
  
  // Verify admin status in database
  const usersCollection = await getCollection("users");
  const userData = await usersCollection?.findOne({ 
    _id: ObjectId.createFromHexString(authUser.userId as string) 
  });
  
  if (!userData || !userData.isAdmin) {
    // Not an admin, redirect to dashboard
    redirect("/dashboard");
  }
  
  // User is admin, render admin content
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="bg-slate-800 text-white p-4 mb-6 rounded-md">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-300">Welcome to the administrator panel</p>
      </div>
      {children}
    </div>
  );
} 