import { prisma } from "@/lib/db";
import { MeasurementForm } from "./measurement-form";

export default async function NewMeasurementPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });

  return <MeasurementForm customers={customers} />;
}
