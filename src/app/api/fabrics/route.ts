
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fabricFormSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET() {
  const fabrics = await prisma.fabric.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    fabrics.map((fabric) => ({
      ...fabric,
      price: Number(fabric.price),
    })),
  );
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = fabricFormSchema.omit({ id: true }).safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const fabric = await prisma.fabric.create({
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        color: parsed.data.color,
        composition: parsed.data.composition,
        widthCm: parsed.data.widthCm,
        stockQty: parsed.data.stockQty,
        price: new Prisma.Decimal(parsed.data.price),
      },
    });

    return NextResponse.json(fabric, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create fabric" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const json = await request.json();
  const parsed = fabricFormSchema.safeParse(json);

  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: parsed.success ? "id is required" : parsed.error.flatten() }, { status: 400 });
  }

  try {
    const fabric = await prisma.fabric.update({
      where: { id: parsed.data.id },
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        color: parsed.data.color,
        composition: parsed.data.composition,
        widthCm: parsed.data.widthCm,
        stockQty: parsed.data.stockQty,
        price: new Prisma.Decimal(parsed.data.price),
      },
    });

    return NextResponse.json(fabric);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update fabric" }, { status: 400 });
  }
}

