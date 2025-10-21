import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { allowedStatusTransitions } from "@/lib/workflow";
import { QRCode } from "@/components/QRCode";
import { Barcode } from "@/components/Barcode";
import { StatusPill } from "@/components/StatusPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { AdvanceStage } from "./stage-controls";
import { AddPayment } from "./stage-controls";

type WorkOrderPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkOrderDetailPage({ params }: WorkOrderPageProps) {
  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
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
      shipmentScans: {
        include: {
          shipment: true,
        },
        orderBy: { scannedAt: "desc" },
      },
    },
  });

  if (!workOrder) {
    notFound();
  }

  const nextStatuses = allowedStatusTransitions[workOrder.status] ?? [];
  const stageHistory = workOrder.items
    .flatMap((item) => item.productionTasks)
    .sort((a, b) => {
      const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return dateA - dateB;
    });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold">{workOrder.code}</h1>
            <StatusPill status={workOrder.status} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Customer: {workOrder.customer.name}</span>
            <span>Branch: {workOrder.branch.name}</span>
            <span>Due: {formatDate(workOrder.dueDate)}</span>
            <span>Balance: {formatCurrency(workOrder.balance)}</span>
          </div>
          <AdvanceStage workOrderId={workOrder.id} currentStatus={workOrder.status} options={nextStatuses} />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <QRCode value={workOrder.code} size={120} title="Scan to view order" />
          <Barcode value={workOrder.code} label="Order Ticket" />
        </div>
      </header>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="space-y-4">
          {workOrder.items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>
                    {item.garmentType} · {item.fabric?.name ?? "Fabric TBC"}
                  </span>
                  <Badge variant="secondary">{formatCurrency(item.price)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Measurement profile: v{item.measurementProfile?.version} captured{" "}
                  {item.measurementProfile ? formatDate(item.measurementProfile.takenAt) : "—"}
                </p>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium text-foreground">Fabric SKU:</span> {item.fabric?.sku ?? "—"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Options:</span>{" "}
                    {item.optionsJson ? JSON.stringify(item.optionsJson) : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Production Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {stageHistory.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No production tasks recorded yet.</li>
                ) : (
                  stageHistory.map((task) => (
                    <li key={task.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{task.stage}</span>
                        <span className="text-xs text-muted-foreground">
                          {task.startedAt ? formatDate(task.startedAt) : "Not started"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Finished: {task.finishedAt ? formatDate(task.finishedAt) : "In progress"}
                      </p>
                      {task.notes ? <p className="mt-1 text-xs">{task.notes}</p> : null}
                    </li>
                  ))
                )}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payments</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Recorded payments total {formatCurrency(workOrder.payments.reduce((sum, payment) => sum + Number(payment.amount), 0))}
                </p>
              </div>
              <AddPayment workOrderId={workOrder.id} />
            </CardHeader>
            <CardContent>
              {workOrder.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {workOrder.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(payment.createdAt)}</p>
                      </div>
                      <Badge variant="outline">{payment.method}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notes & Shipments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Internal Notes</p>
                <p>{workOrder.notes ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Shipment Scans</p>
                {workOrder.shipmentScans.length === 0 ? (
                  <p className="text-muted-foreground">No shipment history recorded.</p>
                ) : (
                  <ul className="space-y-2">
                    {workOrder.shipmentScans.map((scan) => (
                      <li key={scan.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span>
                          {scan.direction} · {scan.shipment?.fromBranchId === workOrder.branchId ? "Factory" : "Branch"} ·{" "}
                          {scan.scannedByName}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(scan.scannedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
