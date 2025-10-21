import { prisma } from "@/lib/db";
import { Status } from "@prisma/client";
import { ShipmentsClient } from "./shipments-client";

export default async function ShipmentsPage() {
  const [branches, shipments, orders] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.shipment.findMany({
      orderBy: { date: "desc" },
      include: {
        fromBranch: true,
        toBranch: true,
        scans: {
          orderBy: { scannedAt: "desc" },
          include: {
            workOrder: true,
          },
        },
      },
    }),
    prisma.workOrder.findMany({
      where: {
        status: {
          in: [Status.CUTTING, Status.SEWING, Status.EMBROIDERY, Status.PRESSING, Status.QC, Status.DISPATCHED],
        },
      },
      select: {
        id: true,
        code: true,
        branch: { select: { name: true } },
        status: true,
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return (
    <ShipmentsClient
      branches={branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        area: branch.area,
      }))}
      orders={orders.map((order) => ({
        id: order.id,
        code: order.code,
        branch: order.branch.name,
        status: order.status,
      }))}
      shipments={shipments.map((shipment) => ({
        id: shipment.id,
        date: shipment.date.toISOString(),
        fromBranch: shipment.fromBranch.name,
        toBranch: shipment.toBranch.name,
        notes: shipment.notes ?? "",
        scans: shipment.scans.map((scan) => ({
          id: scan.id,
          direction: scan.direction,
          workOrderCode: scan.workOrder.code,
          scannedByName: scan.scannedByName,
          scannedAt: scan.scannedAt.toISOString(),
        })),
      }))}
    />
  );
}
