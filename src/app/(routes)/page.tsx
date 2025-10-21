import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { stageStatuses } from "@/lib/workflow";
import { Status } from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/StatusPill";

async function getDashboardData() {
  const today = new Date();

  const [stageGroups, lateOrders, recentOrders, metrics] = await Promise.all([
    prisma.workOrder.groupBy({
      by: ["status"],
      _count: true,
      where: {
        status: {
          in: stageStatuses,
        },
      },
    }),
    prisma.workOrder.findMany({
      where: {
        dueDate: { lt: today },
        status: {
          notIn: [Status.CLOSED, Status.DELIVERED, Status.READY_FOR_PICKUP],
        },
      },
      take: 6,
      orderBy: { dueDate: "asc" },
      include: { branch: true, customer: true },
    }),
    prisma.workOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { branch: true, customer: true },
    }),
    (async () => {
      const [totalOrders, activeOrders, dueToday, payments] = await Promise.all([
        prisma.workOrder.count(),
        prisma.workOrder.count({
          where: {
            status: { notIn: [Status.CLOSED, Status.DELIVERED] },
          },
        }),
        prisma.workOrder.count({
          where: {
            dueDate: {
              gte: new Date(today.toDateString()),
              lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
            },
          },
        }),
        prisma.payment.aggregate({ _sum: { amount: true } }),
      ]);

      return {
        totalOrders,
        activeOrders,
        dueToday,
        totalPayments: Number(payments._sum.amount ?? 0),
      };
    })(),
  ]);

  const wip = stageStatuses.map((status) => ({
    status,
    count: stageGroups.find((group) => group.status === status)?._count ?? 0,
  }));

  return {
    wip,
    lateOrders,
    recentOrders: recentOrders.map((order) => ({
      ...order,
      total: Number(order.total),
    })),
    metrics,
  };
}

export default async function DashboardPage() {
  const { wip, lateOrders, recentOrders, metrics } = await getDashboardData();

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Work Orders</CardTitle>
            <p className="text-xs text-muted-foreground">All-time count</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{metrics.totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Orders</CardTitle>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{metrics.activeOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Due Today</CardTitle>
            <p className="text-xs text-muted-foreground">Orders expected today</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{metrics.dueToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Collected Deposits</CardTitle>
            <p className="text-xs text-muted-foreground">All recorded payments</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(metrics.totalPayments)}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <p className="text-xs text-muted-foreground">Latest 10 confirmations</p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link href="/work-orders/new">New Work Order</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/factory/board">Factory Board</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders found.</p>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{order.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.branch.name} - {formatDate(order.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{formatCurrency(order.total)}</span>
                      <StatusPill status={order.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>WIP by Stage</CardTitle>
            <p className="text-xs text-muted-foreground">Factory throughput snapshot</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {wip.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm font-medium">{entry.status.replace(/_/g, " ")}</span>
                <Badge variant="secondary" className="rounded-full px-2 text-xs">
                  {entry.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Late Orders</CardTitle>
            <p className="text-xs text-muted-foreground">Due date passed - not yet closed</p>
          </CardHeader>
          <CardContent>
            {lateOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">All caught up. No overdue orders.</p>
            ) : (
              <div className="space-y-3">
                {lateOrders.map((order) => (
                  <div key={order.id} className="grid gap-3 rounded-lg border px-3 py-3 md:grid-cols-4 md:items-center">
                    <div>
                      <p className="text-sm font-semibold">{order.code}</p>
                      <p className="text-xs text-muted-foreground">{order.customer.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.branch.name}</p>
                    <p className="text-sm text-destructive">{formatDate(order.dueDate)}</p>
                    <StatusPill status={order.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
