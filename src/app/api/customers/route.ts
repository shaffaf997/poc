import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerFormSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { altPhone: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: { defaultBranch: true },
    take: 50,
  });

  return NextResponse.json(
    customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      altPhone: customer.altPhone,
      preferredLang: customer.preferredLang,
      defaultBranch: customer.defaultBranch?.name ?? null,
    })),
  );
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = customerFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        altPhone: parsed.data.altPhone || null,
        preferredLang: parsed.data.preferredLang || null,
        defaultBranchId: parsed.data.defaultBranchId || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to create customer. Phone might already be registered." },
      { status: 400 },
    );
  }
}
