import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { allowedStatusTransitions, statusToStage } from "@/lib/workflow";
import { Stage, Status } from "@prisma/client";

const moveSchema = z.object({
  workOrderId: z.string().min(1),
  toStage: z.string().min(1),
});

function parseTargetStatus(value: string): Status | null {
  if ((Status as Record<string, string>)[value]) {
    return Status[value as keyof typeof Status];
  }
  if ((Stage as Record<string, string>)[value]) {
    const stage = Stage[value as keyof typeof Stage];
    return Status[stage as keyof typeof Status] ?? null;
  }
  return null;
}

export async function PATCH(request: Request) {
  const json = await request.json();
  const parsed = moveSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const targetStatus = parseTargetStatus(parsed.data.toStage);
  if (!targetStatus) {
    return NextResponse.json({ error: "Invalid target stage" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.workOrder.findUnique({
        where: { id: parsed.data.workOrderId },
        include: {
          items: {
            include: {
              productionTasks: {
                where: { finishedAt: null },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error("NOT_FOUND");
      }

      const nextStatuses = allowedStatusTransitions[order.status] ?? [];
      if (!nextStatuses.includes(targetStatus)) {
        throw new Error("ILLEGAL");
      }

      const currentStage = statusToStage[order.status];
      const nextStage = statusToStage[targetStatus];

      for (const item of order.items) {
        for (const task of item.productionTasks) {
          if (currentStage && task.stage === currentStage && task.finishedAt === null) {
            await tx.productionTask.update({
              where: { id: task.id },
              data: { finishedAt: new Date() },
            });
          }
        }
        if (nextStage) {
          await tx.productionTask.create({
            data: {
              workOrderItemId: item.id,
              stage: nextStage,
              startedAt: new Date(),
            },
          });
        }
      }

      const updated = await tx.workOrder.update({
        where: { id: order.id },
        data: { status: targetStatus },
        include: {
          items: {
            include: { productionTasks: true },
          },
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Work order not found" }, { status: 404 });
      }
      if (error.message === "ILLEGAL") {
        return NextResponse.json({ error: "Illegal status transition" }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Unable to move stage" }, { status: 500 });
  }
}
