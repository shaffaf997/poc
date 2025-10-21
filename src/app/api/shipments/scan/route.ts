import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { shipmentScanSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = shipmentScanSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const scan = await prisma.shipmentScan.create({
      data: {
        shipmentId: parsed.data.shipmentId,
        workOrderId: parsed.data.workOrderId,
        direction: parsed.data.direction,
        scannedByName: parsed.data.scannedByName,
        scannedAt: new Date(),
      },
    });

    return NextResponse.json(scan, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to record shipment scan" }, { status: 400 });
  }
}
