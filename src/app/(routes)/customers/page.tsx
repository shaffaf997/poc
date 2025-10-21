import { CustomersClient } from "./customers-client";
import { prisma } from "@/lib/db";

export default async function CustomersPage() {
  const [customers, branches] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: { defaultBranch: true },
      take: 50,
    }),
    prisma.branch.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <CustomersClient
      initialCustomers={customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        altPhone: customer.altPhone,
        preferredLang: customer.preferredLang ?? "",
        defaultBranch: customer.defaultBranch?.name ?? "",
      }))}
      branches={branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        area: branch.area,
      }))}
    />
  );
}
