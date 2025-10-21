import { addDays, subDays } from "date-fns";
import {
  GarmentType,
  PaymentMethod,
  Prisma,
  PrismaClient,
  Priority,
  ShipmentDirection,
  Stage,
  Status,
} from "@prisma/client";
import { generateOrderCode } from "../src/lib/order";

const prisma = new PrismaClient();

type FitType = "Classic" | "Modern" | "Loose";

function measurementTemplate(fit: FitType) {
  return {
    garment: "THAWB",
    unit: "cm",
    fit,
    fields: {
      neck: 42,
      shoulder: 48,
      chest: 108,
      waist: 102,
      hip: 110,
      arm_len_right: 61,
      arm_len_left: 61,
      wrist: 23,
      front_len: 140,
      back_len: 142,
      yoke: 45,
      placket_depth: 28,
      collar_type: "Omani" as const,
      sleeve_opening: 20,
      side_slit: 30,
    },
    tolerance: { default: 1 },
    notes: "Auto-generated seed data",
  };
}

async function main() {
  await prisma.shipmentScan.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.productionTask.deleteMany();
  await prisma.workOrderItem.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.measurementProfile.deleteMany();
  await prisma.fabric.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.branch.deleteMany();

  const areas = [
    "Doha",
    "Al Rayyan",
    "Al Wakrah",
    "Umm Salal",
    "Al Khor",
    "Al Dayeen",
    "Madīnat ash Shamāl",
    "Mesaieed",
    "Lusail",
    "Al Shahaniya",
  ];

  const branches = await Promise.all(
    Array.from({ length: 30 }).map((_, index) => {
      const name = `Branch-${String(index + 1).padStart(2, "0")}`;
      return prisma.branch.upsert({
        where: { name },
        update: { area: areas[index % areas.length] },
        create: {
          name,
          area: areas[index % areas.length],
        },
      });
    }),
  );

  const fabrics = await Promise.all(
    [
      { sku: "FAB-001", name: "Pearl White", color: "White", composition: "40% Cotton / 60% Polyester", widthCm: 150, stockQty: 120, price: 180.0 },
      { sku: "FAB-002", name: "Desert Sand", color: "Beige", composition: "100% Cotton", widthCm: 145, stockQty: 80, price: 220.0 },
      { sku: "FAB-003", name: "Midnight Black", color: "Black", composition: "70% Cotton / 30% Silk", widthCm: 148, stockQty: 65, price: 275.0 },
      { sku: "FAB-004", name: "Royal Navy", color: "Navy", composition: "50% Cotton / 50% Polyester", widthCm: 150, stockQty: 95, price: 210.0 },
      { sku: "FAB-005", name: "Palm Breeze", color: "Light Green", composition: "Cotton Blend", widthCm: 152, stockQty: 70, price: 195.0 },
    ].map((fabric) =>
      prisma.fabric.create({
        data: {
          ...fabric,
          price: new Prisma.Decimal(fabric.price),
        },
      }),
    ),
  );

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Ahmed Al-Kuwari",
        phone: "+97450010001",
        altPhone: "+97455510001",
        preferredLang: "English",
        branch: { connect: { id: branches[0].id } },
        defaultBranch: { connect: { id: branches[0].id } },
      },
    }),
    prisma.customer.create({
      data: {
        name: "Mohammed Al-Sulaiti",
        phone: "+97450010002",
        preferredLang: "Arabic",
        branch: { connect: { id: branches[5].id } },
        defaultBranch: { connect: { id: branches[5].id } },
      },
    }),
    prisma.customer.create({
      data: {
        name: "Saeed Al-Marri",
        phone: "+97450010003",
        altPhone: "+97455510003",
        branch: { connect: { id: branches[10].id } },
        defaultBranch: { connect: { id: branches[10].id } },
      },
    }),
  ]);

  const measurementProfiles = await Promise.all(
    customers.flatMap((customer, index) => {
      return ["Classic", "Modern"].map((fit, version) =>
        prisma.measurementProfile.create({
          data: {
            customerId: customer.id,
            garmentType: GarmentType.THAWB,
            version: version + 1,
            unit: "cm",
            dataJson: measurementTemplate(fit as FitType),
            takenByName: "Seed User",
            takenAt: subDays(new Date(), index + version),
          },
        }),
      );
    }),
  );

  const workOrderDefinitions = [
    {
      customer: customers[0],
      branch: branches[0],
      fabric: fabrics[0],
      profile: measurementProfiles[0],
      dueInDays: 3,
      status: Status.CUTTING,
      stageHistory: [
        Stage.CUTTING,
        Stage.SEWING,
      ],
      deposit: 200,
      total: 480,
      priority: Priority.HIGH,
    },
    {
      customer: customers[1],
      branch: branches[5],
      fabric: fabrics[2],
      profile: measurementProfiles[2],
      dueInDays: -1,
      status: Status.QC,
      stageHistory: [Stage.CUTTING, Stage.SEWING, Stage.EMBROIDERY, Stage.PRESSING, Stage.QC],
      deposit: 150,
      total: 420,
      priority: Priority.NORMAL,
    },
    {
      customer: customers[2],
      branch: branches[10],
      fabric: fabrics[3],
      profile: measurementProfiles[4],
      dueInDays: 7,
      status: Status.CONFIRMED,
      stageHistory: [Stage.CUTTING],
      deposit: 50,
      total: 390,
      priority: Priority.LOW,
    },
  ] as const;

  const workOrders = [];

  for (const [index, spec] of workOrderDefinitions.entries()) {
    const total = new Prisma.Decimal(spec.total);
    const deposit = new Prisma.Decimal(spec.deposit);
    const balance = total.minus(deposit);

    const created = await prisma.workOrder.create({
      data: {
        code: generateOrderCode(addDays(new Date(), index)),
        customerId: spec.customer.id,
        branchId: spec.branch.id,
        dueDate: addDays(new Date(), spec.dueInDays),
        status: spec.status,
        priority: spec.priority,
        total,
        deposit,
        balance,
        notes: "Seeded work order for demonstration.",
        items: {
          create: [
            {
              garmentType: GarmentType.THAWB,
              measurementProfileId: spec.profile.id,
              fabricId: spec.fabric.id,
              price: total,
              optionsJson: {
                embroidery: spec.stageHistory.includes(Stage.EMBROIDERY),
                collar: "Omani",
              },
              productionTasks: {
                create: spec.stageHistory.map((stage, stageIndex) => ({
                  stage,
                  startedAt: subDays(new Date(), 5 - stageIndex),
                  finishedAt: stageIndex < spec.stageHistory.length - 1 ? subDays(new Date(), 4 - stageIndex) : null,
                })),
              },
            },
          ],
        },
        payments: {
          create: [
            {
              amount: deposit,
              method: PaymentMethod.CARD,
              txnRef: `TXN-${index + 1}-CARD`,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    workOrders.push(created);
  }

  await prisma.shipment.create({
    data: {
      date: new Date(),
      fromBranchId: branches[0].id,
      toBranchId: branches[10].id,
      scans: {
        create: [
          {
            workOrderId: workOrders[0].id,
            direction: ShipmentDirection.OUT,
            scannedByName: "Hassan",
          },
          {
            workOrderId: workOrders[0].id,
            direction: ShipmentDirection.IN,
            scannedByName: "Samir",
            scannedAt: new Date(),
          },
        ],
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
