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
            <Link href={`/menu/${menuItem._id}`} className="block text-xl font-semibold mb-4">
                {menuItem.name}
            </Link>
            <div className="flex justify-between items-center">
                <p className="text-sm">£{menuItem.price / 100}</p>
                {menuItem.points > 0 && (
                    <p className="text-xs font-medium text-amber-600">
                        Earn {menuItem.points} points
                    </p>
                )}
            </div>
        </div>
    )
}   