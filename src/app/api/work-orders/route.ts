import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { workOrderFormSchema } from "@/lib/validations";
import { generateOrderCode } from "@/lib/order";
import { Prisma, Stage, Status } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const code = searchParams.get("code");
  if (!id && !code) {
    return NextResponse.json({ error: "id or code is required" }, { status: 400 });
  }

  const order = await prisma.workOrder.findFirst({
    where: id ? { id } : { code: code ?? "" },
    include: {
      customer: true,
      branch: true,
      items: {
        include: {
          fabric: true,
          measurementProfile: true,
          productionTasks: {
            orderBy: { startedAt: "asc" },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = workOrderFormSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const deposit = new Prisma.Decimal(data.deposit);
  const total = new Prisma.Decimal(data.total);
  const balance = total.minus(deposit);
  const status = deposit.gt(0) ? Status.CONFIRMED : Status.NEW;
  const orderCode = generateOrderCode();

  try {
    const workOrder = await prisma.workOrder.create({
      data: {
        code: orderCode,
        customerId: data.customerId,
        branchId: data.branchId,
        dueDate: data.dueDate,
        priority: data.priority,
        notes: data.notes,
        total,
        deposit,
        balance,
        status,
        items: {
          create: data.items.map((item) => ({
            garmentType: item.garmentType,
            measurementProfileId: item.measurementProfileId,
            fabricId: item.fabricId || null,
            price: new Prisma.Decimal(item.price),
            optionsJson: item.optionsJson ?? Prisma.JsonNull,
            productionTasks: {
              create: {
                stage: Stage.CUTTING,
                startedAt: new Date(),
                notes: "Started automatically at order creation.",
              },
            },
          })),
        },
      },
      include: {
        branch: true,
        customer: true,
      },
    });

    return NextResponse.json(
      {
        id: workOrder.id,
        code: workOrder.code,
        dueDate: workOrder.dueDate,
        status: workOrder.status,
        branch: workOrder.branch.name,
        customer: workOrder.customer.name,
        total: Number(workOrder.total),
        deposit: Number(workOrder.deposit),
        balance: Number(workOrder.balance),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create work order" }, { status: 500 });
  }
}
