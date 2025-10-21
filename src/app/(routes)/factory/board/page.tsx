import { prisma } from "@/lib/db";
import { stageStatuses } from "@/lib/workflow";
import { FactoryBoard } from "./factory-board";

export default async function FactoryBoardPage() {
  const orders = await prisma.workOrder.findMany({
    where: {
      status: {
        in: stageStatuses,
      },
    },
    orderBy: { dueDate: "asc" },
    include: {
      items: {
        take: 1,
        select: {
          garmentType: true,
        },
      },
      branch: true,
      customer: true,
    },
  });

  return (
    <FactoryBoard
      orders={orders.map((order) => ({
        id: order.id,
        code: order.code,
        status: order.status,
        dueDate: order.dueDate.toISOString(),
        branch: order.branch.name,
        garment: order.items[0]?.garmentType ?? "THAWB",
        customer: order.customer.name,
        priority: order.priority,
      }))}
    />
  );
}
