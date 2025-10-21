import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { measurementFormSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  const profiles = await prisma.measurementProfile.findMany({
    where: { customerId },
    orderBy: { takenAt: "desc" },
  });

  return NextResponse.json(
    profiles.map((profile) => ({
      id: profile.id,
      garmentType: profile.garmentType,
      version: profile.version,
      takenAt: profile.takenAt,
      takenByName: profile.takenByName,
    })),
  );
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = measurementFormSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const existingCount = await prisma.measurementProfile.count({
    where: { customerId: data.customerId, garmentType: "THAWB" },
  });

  const profile = await prisma.measurementProfile.create({
    data: {
      customerId: data.customerId,
      garmentType: "THAWB",
      unit: data.data.unit,
      version: existingCount + 1,
      takenByName: data.takenByName,
      takenAt: data.takenAt ?? new Date(),
      dataJson: data.data,
    },
    select: {
      id: true,
      customerId: true,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
