import { z } from "zod";

export const fitOptions = ["Classic", "Modern", "Loose"] as const;
export type FitOption = (typeof fitOptions)[number];

export const collarOptions = ["Omani", "Stand", "None"] as const;
export type CollarOption = (typeof collarOptions)[number];

export const measurementDataSchema = z.object({
  garment: z.literal("THAWB"),
  unit: z.literal("cm"),
  fit: z.enum(fitOptions),
  fields: z.object({
    neck: z.coerce.number().min(20).max(70),
    shoulder: z.coerce.number().min(30).max(70),
    chest: z.coerce.number().min(60).max(160),
    waist: z.coerce.number().min(60).max(160),
    hip: z.coerce.number().min(70).max(170),
    arm_len_right: z.coerce.number().min(40).max(80),
    arm_len_left: z.coerce.number().min(40).max(80),
    wrist: z.coerce.number().min(10).max(40),
    front_len: z.coerce.number().min(80).max(200),
    back_len: z.coerce.number().min(80).max(200),
    yoke: z.coerce.number().min(30).max(70),
    placket_depth: z.coerce.number().min(5).max(50),
    collar_type: z.enum(collarOptions),
    sleeve_opening: z.coerce.number().min(10).max(40),
    side_slit: z.coerce.number().min(0).max(60),
  }),
  tolerance: z.object({
    default: z.coerce.number().min(0).max(5),
  }),
  notes: z.string().max(500).optional(),
});

export const measurementFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  garmentType: z.literal("THAWB"),
  takenByName: z.string().min(2),
  takenAt: z.coerce.date().optional(),
  data: measurementDataSchema,
});

export type MeasurementFormValues = z.infer<typeof measurementFormSchema>;

export const customerFormSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  altPhone: z.string().optional(),
  preferredLang: z.string().optional(),
  defaultBranchId: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const workOrderItemSchema = z.object({
  garmentType: z.enum(["THAWB", "BISHT", "SHIRT", "TROUSER"]),
  measurementProfileId: z.string().min(1, "Select measurements"),
  fabricId: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  optionsJson: z
    .object({
      embroidery: z.boolean().optional(),
      collar: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export const workOrderFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  branchId: z.string().min(1, "Select a branch"),
  dueDate: z.coerce.date(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  deposit: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
  notes: z.string().optional(),
  items: z.array(workOrderItemSchema).min(1),
});

export type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;

export const paymentFormSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "CARD", "TRANSFER"]),
  txnRef: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const shipmentFormSchema = z.object({
  fromBranchId: z.string().min(1),
  toBranchId: z.string().min(1),
  orderIds: z.array(z.string()).min(1),
  notes: z.string().optional(),
});

export type ShipmentFormValues = z.infer<typeof shipmentFormSchema>;

export const shipmentScanSchema = z.object({
  shipmentId: z.string().min(1),
  workOrderId: z.string().min(1),
  direction: z.enum(["OUT", "IN"]),
  scannedByName: z.string().min(2),
});

export type ShipmentScanValues = z.infer<typeof shipmentScanSchema>;

export const fabricFormSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(3),
  name: z.string().min(2),
  color: z.string().min(2),
  composition: z.string().min(3),
  widthCm: z.coerce.number().positive(),
  stockQty: z.coerce.number().int().nonnegative(),
  price: z.coerce.number().nonnegative(),
});

export type FabricFormValues = z.infer<typeof fabricFormSchema>;
