"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Status } from "@prisma/client";
import { allowedStatusTransitions, stageStatuses } from "@/lib/workflow";
import { OrderCard } from "@/components/OrderCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FactoryBoardOrder = {
  id: string;
  code: string;
  status: Status;
  dueDate: string;
  branch: string;
  garment: string;
  customer: string;
  priority: string;
};

type FactoryBoardProps = {
  orders: FactoryBoardOrder[];
};

export function FactoryBoard({ orders }: FactoryBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const columns = stageStatuses.map((status) => ({
    status,
    orders: orders.filter((order) => order.status === status),
  }));

  const advance = (order: FactoryBoardOrder) => {
    const nextStatuses = allowedStatusTransitions[order.status] ?? [];
    const next = nextStatuses[0];
    if (!next) return;
    startTransition(async () => {
      await fetch("/api/production/move-stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: order.id,
          toStage: next,
        }),
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Factory Board</h1>
        <p className="text-sm text-muted-foreground">WIP overview across production stages.</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-6 md:grid-cols-3">
        {columns.map((column) => (
          <Card key={column.status} className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="text-base">
                {column.status.replace(/_/g, " ")} ({column.orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {column.orders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No orders.</p>
              ) : (
                column.orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAdvance={() => advance(order)}
                    footer={<span>{order.customer}</span>}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {isPending ? <p className="text-xs text-muted-foreground">Updating...</p> : null}
    </div>
  );
}
