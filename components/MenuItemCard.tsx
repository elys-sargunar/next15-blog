import Link from "next/link";
import { nutritionalInfoSchema, allergiesSchema, supplierSchema } from "@/lib/rules";

  // Define the PostCard type
  type MenuItem = {
    _id: Object;
    name: string;
    price: number;
    description: string;
    nutritionalInfo: typeof nutritionalInfoSchema;
    allergies: typeof allergiesSchema,               // Allergens in the food item
    supplier: typeof supplierSchema,                 // Supplier information
    available: boolean,     // Whether the item is available on the menu
    menuCategory: string
};

export default function MenuItemCard({menuItem} : {menuItem: MenuItem}){
    return (
        <div className="border border-slate-600 border-dashed p-4 rounded-md h-full bg-white">
            <p className="text-slate-400 text-xs">
                {menuItem.menuCategory}
            </p>
            <Link href={`/posts/show/${menuItem._id.toString()}`} className="block text-xl font-semibold mb-4">
                {menuItem.name}
            </Link>
            <p className="text-sm">£{menuItem.price / 100}</p>
        </div>
    )
}