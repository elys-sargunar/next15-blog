import Link from "next/link";
import { Button } from "./ui/button";
import { foodItemCategory, foodItemSchema } from "@/lib/rules";

export default async function ProductTable({items, schema} : {items: any, schema: any}){

    //console.log({items})
    //console.log({schema})

    return (
        <table>            
            {schema === foodItemSchema ? (
                <>
                    <thead>
                        <tr>
                        <th className="w-4/6">Name</th>
                        <th className="w-1/6">Price</th>
                        <th className="w-1/6 sr-only">Add</th>              
                        </tr>
                    </thead>
                    <tbody>                                        
                        {/*  Content for foodItemSchema will be rendered here */}
                        {items?.map((item: any) => (
                            <tr key={item._id.toString()}>
                                <td className="w-3/6">
                                    <Link href={`/posts/show/${item._id.toString()}`}>{item.name}</Link>
                                </td>
                                <td className="w-1/6 text-blue-500">
                                    <span>£{item.price / 100}</span>
                                </td>
                                <td className="w-1/6 text-red-500">                
                                    <form>
                                        <input type="hidden" name="postId" defaultValue={item._id.toString()}/>
                                        <Button type="submit">Add</Button>
                                    </form>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </>
            ) : schema === foodItemCategory ? (
                <>
                    <thead>
                        <tr>
                            <th className="w-4/6">Name</th>                            
                            <th className="w-1/6">Valid until</th>                                                                
                        </tr>
                    </thead>
                    <tbody>                                        
                        {/*  Content for foodItemCategory will be rendered here */}
                        {items?.map((item: any) => (
                            <tr key={item._id.toString()}>
                                <td className="w-3/6">
                                    <Link href={`/posts/show/${item._id.toString()}`}>{item.name}</Link>
                                </td>                           
                                <td className="w-1/6 text-blue-500">
                                    <span>{item.expiryDate}</span>
                                </td>                                                                                     
                            </tr>
                        ))}
                    </tbody>
                </>
            ) : null
            }            
        </table>
    )
}