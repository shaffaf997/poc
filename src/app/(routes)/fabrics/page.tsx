import { prisma } from "@/lib/db";
import { FabricsClient } from "./fabrics-client";

export default async function FabricsPage() {
  const fabrics = await prisma.fabric.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <FabricsClient
      fabrics={fabrics.map((fabric) => ({
        id: fabric.id,
        sku: fabric.sku,
        name: fabric.name,
        color: fabric.color,
        composition: fabric.composition,
        widthCm: fabric.widthCm,
        stockQty: fabric.stockQty,
        price: Number(fabric.price),
      }))}
    />
  );
}

