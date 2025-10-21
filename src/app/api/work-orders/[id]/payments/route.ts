import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { paymentFormSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await request.json();
  const parsed = paymentFormSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.workOrder.findUnique({ where: { id } });
      if (!order) {
        throw new Error("NOT_FOUND");
      }
      const amount = new Prisma.Decimal(parsed.data.amount);
      const updatedBalance = Prisma.Decimal.max(new Prisma.Decimal(order.balance).minus(amount), new Prisma.Decimal(0));

      const payment = await tx.payment.create({
        data: {
          workOrderId: id,
          amount,
          method: parsed.data.method,
          txnRef: parsed.data.txnRef || null,
        },
      });

      await tx.workOrder.update({
        where: { id },
        data: {
          balance: updatedBalance,
        },
      });

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to record payment" }, { status: 500 });
  }
}
