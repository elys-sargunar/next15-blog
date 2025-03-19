// This is a Server Component by default - no "use client" directive
import { fetchMenuData } from "./menu-data";
import MenuClient from "./menu-client";

export default async function MenuPage() {
  // Fetch data on the server
  const menuData = await fetchMenuData();
  
  // Pass the data to a client component
  return <MenuClient menuData={menuData} />;
}