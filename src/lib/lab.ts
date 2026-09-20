export type LabStatus = "ordered" | "sample_sent" | "resulted" | "cancelled"

export const LAB_STATUS_LABELS: Record<LabStatus, string> = {
  ordered: "Ordered",
  sample_sent: "Sample sent",
  resulted: "Resulted",
  cancelled: "Cancelled",
}

export type LabFilter = "open" | "all"

export const LAB_FILTER_LABELS: Record<LabFilter, string> = {
  open: "Awaiting results",
  all: "All tests",
}

export function isLabFilter(value: string | undefined): value is LabFilter {
  return value === "open" || value === "all"
}
