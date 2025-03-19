import Link from "next/link";
import { FoodItem } from "@/lib/rules";


export default function MenuItemCard({menuItem} : {menuItem: FoodItem}){
    // Format menu category display
    const categoryDisplay = () => {
        if (!menuItem.menuCategory) return "Uncategorized";
        if (Array.isArray(menuItem.menuCategory)) {
            return menuItem.menuCategory.map(cat => cat.name).join(", ");
        }
        return menuItem.menuCategory;
    };

    return (
        <div className="border border-slate-600 border-dashed p-4 rounded-md h-full bg-white">
            <p className="text-slate-400 text-xs">
                {categoryDisplay()}
            </p>
            <Link href={`/posts/show/${menuItem.name}`} className="block text-xl font-semibold mb-4">
                {menuItem.name}
            </Link>
            <p className="text-sm">£{menuItem.price / 100}</p>
        </div>
    )
}   