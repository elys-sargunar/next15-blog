import { getCollection } from "@/lib/db";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from "@/components/ui/carousel"



export default async function MenuPage(){
    const menuItems = await getCollection("menuItems")

    const menuCategories = await getCollection("menuCategories")
    const menuCategoryItems = await menuCategories?.find({}).toArray()

    if(!menuItems) return <p>Failed to fetch menuItems data.</p>
    if(!menuCategories) return <p>Failed to fetch menuCategories data.</p>

    console.log(menuCategoryItems)

    return ( 
        <>
            <p>Menu Categories:</p>
            {menuCategoryItems && (
                <>
                    <p>Yes!</p>
                    <Carousel opts={{
                        align: "start",
                        loop: true,
                    }}>
                        <CarouselContent>
                            {menuCategoryItems?.map((menuCategoryItem) => (
                                <CarouselItem key={menuCategoryItem._id.toString()}>{menuCategoryItem.name}</CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                </>
            )}
        </>
    )
}