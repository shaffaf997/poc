import { Stage, Status } from "@prisma/client";

export const productionFlow: Status[] = [
  Status.NEW,
  Status.CONFIRMED,
  Status.CUTTING,
  Status.SEWING,
  Status.EMBROIDERY,
  Status.PRESSING,
  Status.QC,
  Status.DISPATCHED,
  Status.AT_BRANCH,
  Status.FITTING,
  Status.ALTERATION,
  Status.READY_FOR_PICKUP,
  Status.DELIVERED,
  Status.CLOSED,
];

export const stageStatuses: Status[] = [
  Status.CUTTING,
  Status.SEWING,
  Status.EMBROIDERY,
  Status.PRESSING,
  Status.QC,
  Status.DISPATCHED,
];

export const statusToStage: Partial<Record<Status, Stage>> = {
  [Status.CUTTING]: Stage.CUTTING,
  [Status.SEWING]: Stage.SEWING,
  [Status.EMBROIDERY]: Stage.EMBROIDERY,
  [Status.PRESSING]: Stage.PRESSING,
  [Status.QC]: Stage.QC,
  [Status.DISPATCHED]: Stage.DISPATCHED,
  [Status.AT_BRANCH]: Stage.AT_BRANCH,
  [Status.FITTING]: Stage.FITTING,
  [Status.ALTERATION]: Stage.ALTERATION,
};

export const allowedStatusTransitions: Partial<Record<Status, Status[]>> = {
  [Status.NEW]: [Status.CONFIRMED],
  [Status.CONFIRMED]: [Status.CUTTING],
  [Status.CUTTING]: [Status.SEWING],
  [Status.SEWING]: [Status.EMBROIDERY, Status.PRESSING],
  [Status.EMBROIDERY]: [Status.PRESSING],
  [Status.PRESSING]: [Status.QC],
  [Status.QC]: [Status.DISPATCHED, Status.ALTERATION],
  [Status.DISPATCHED]: [Status.AT_BRANCH],
  [Status.AT_BRANCH]: [Status.FITTING, Status.READY_FOR_PICKUP],
  [Status.FITTING]: [Status.ALTERATION, Status.READY_FOR_PICKUP],
  [Status.ALTERATION]: [Status.FITTING, Status.READY_FOR_PICKUP],
  [Status.READY_FOR_PICKUP]: [Status.DELIVERED],
  [Status.DELIVERED]: [Status.CLOSED],
  [Status.CLOSED]: [],
};

export function getNextStatuses(current: Status): Status[] {
  return allowedStatusTransitions[current] ?? [];
}

export function canTransition(current: Status, target: Status): boolean {
  return getNextStatuses(current).includes(target);
}

export function getNextStageStatus(current: Status): Status | null {
  const flow = productionFlow;
  const idx = flow.indexOf(current);
  if (idx === -1 || idx === flow.length - 1) return null;
  return flow[idx + 1];
}

export const terminalStatuses: Status[] = [Status.READY_FOR_PICKUP, Status.DELIVERED, Status.CLOSED];

export function isLateStatus(status: Status) {
  return !terminalStatuses.includes(status);
}
