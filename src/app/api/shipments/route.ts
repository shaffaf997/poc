import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { shipmentFormSchema } from "@/lib/validations";

export async function GET() {
  const shipments = await prisma.shipment.findMany({
    orderBy: { date: "desc" },
    include: {
      fromBranch: true,
      toBranch: true,
      scans: {
        orderBy: { scannedAt: "desc" },
        include: { workOrder: true },
      },
    },
  });

  return NextResponse.json(
    shipments.map((shipment) => ({
      id: shipment.id,
      date: shipment.date,
      fromBranch: shipment.fromBranch.name,
      toBranch: shipment.toBranch.name,
      notes: shipment.notes,
      scans: shipment.scans.map((scan) => ({
        id: scan.id,
        direction: scan.direction,
        workOrderId: scan.workOrderId,
        workOrderCode: scan.workOrder.code,
        scannedByName: scan.scannedByName,
        scannedAt: scan.scannedAt,
      })),
    })),
  );
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = shipmentFormSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const shipment = await prisma.shipment.create({
    data: {
      fromBranchId: parsed.data.fromBranchId,
      toBranchId: parsed.data.toBranchId,
      notes: parsed.data.notes,
    },
  });

  if (parsed.data.orderIds.length) {
    await prisma.shipmentScan.createMany({
      data: parsed.data.orderIds.map((workOrderId) => ({
        shipmentId: shipment.id,
        workOrderId,
        direction: "OUT",
        scannedByName: "System",
      })),
    });
  }

  return NextResponse.json(shipment, { status: 201 });
}
