import { prisma } from "@/lib/db";
import { WorkOrderWizard } from "./work-order-wizard";

type NewWorkOrderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewWorkOrderPage({ searchParams }: NewWorkOrderPageProps) {
  const params = await searchParams;

  const [customers, measurementProfiles, fabrics, branches] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    }),
    prisma.measurementProfile.findMany({
      orderBy: { takenAt: "desc" },
      include: { customer: true },
    }),
    prisma.fabric.findMany({ orderBy: { name: "asc" } }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <WorkOrderWizard
      customers={customers}
      measurementProfiles={measurementProfiles.map((profile) => ({
        id: profile.id,
        customerId: profile.customerId,
        customerName: profile.customer.name,
        garmentType: profile.garmentType,
        version: profile.version,
        takenAt: profile.takenAt.toISOString(),
      }))}
      fabrics={fabrics.map((fabric) => ({
        id: fabric.id,
        sku: fabric.sku,
        name: fabric.name,
        color: fabric.color,
        price: Number(fabric.price),
      }))}
      branches={branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        area: branch.area,
      }))}
      defaults={{
        customerId: typeof params.customerId === "string" ? params.customerId : "",
        measurementProfileId: typeof params.measurementId === "string" ? params.measurementId : "",
      }}
    />
  );
}
