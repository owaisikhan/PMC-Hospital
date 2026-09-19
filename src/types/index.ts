export type Gender = "male" | "female" | "other"

export type IncomeCategory = "admission" | "pharmacy" | "lab" | "other"

export type ExpenseCategory =
  | "rent"
  | "salaries"
  | "electricity"
  | "pharmacy_purchase"
  | "lab_payout"
  | "other"

export type PatientStatus = "admitted" | "outpatient" | "discharged" | "critical"

export type AppointmentStatus =
  | "scheduled"
  | "checked-in"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show"

export type Priority = "routine" | "urgent" | "emergency"

export interface Patient {
  id: string
  /** Hospital-issued medical record number, e.g. PMC-2026-00184. */
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: Gender
  phone: string
  email?: string
  bloodGroup?: string
  status: PatientStatus
  primaryDoctorId?: string
  wardId?: string
  bedId?: string
  admittedAt?: string
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  department: string
  phone?: string
  email?: string
  avatarUrl?: string
}

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  department: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  priority: Priority
  reason?: string
}

export interface Ward {
  id: string
  name: string
  floor: string
  totalBeds: number
  occupiedBeds: number
}

export interface Bed {
  id: string
  wardId: string
  label: string
  isOccupied: boolean
  patientId?: string
}

export interface Invoice {
  id: string
  number: string
  patientId: string
  issuedAt: string
  dueAt: string
  total: number
  amountPaid: number
  status: "draft" | "unpaid" | "partial" | "paid" | "overdue"
}
