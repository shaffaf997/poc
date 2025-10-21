"use client";

import { ReactNode } from "react";
import { formatDate, formatRelativeDays } from "@/lib/format";
import { Status } from "@prisma/client";
import { StatusPill } from "./StatusPill";
import { Button } from "@/components/ui/button";

type OrderCardProps = {
  order: {
    id: string;
    code: string;
    status: Status;
    branch: string;
    garment: string;
    dueDate: string;
    customer: string;
    priority: string;
  };
  onAdvance?: (id: string) => void;
  footer?: ReactNode;
};

export function OrderCard({ order, onAdvance, footer }: OrderCardProps) {
  const overdue = new Date(order.dueDate) < new Date();

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{order.code}</p>
          <p className="text-xs text-muted-foreground">{order.customer}</p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">{order.garment}</span> - {order.branch}
        </p>
        <p className={overdue ? "text-destructive" : undefined}>
          {formatDate(order.dueDate)} - {formatRelativeDays(order.dueDate)}
        </p>
      </div>
      <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
        <span>{order.priority}</span>
        {footer}
      </div>
      {onAdvance ? (
        <Button onClick={() => onAdvance(order.id)} size="sm" variant="outline">
          Move Forward
        </Button>
      ) : null}
    </div>
  );
}
