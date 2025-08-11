import { pgTable, text, serial, integer, boolean, timestamp, date, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
});

// Prescriptions table
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  doctorName: text("doctor_name").notNull(),
  date: date("date").notNull(),
  status: text("status").notNull(), // 'verified', 'processing', 'active', etc.
  imageUrl: text("image_url"),
  notes: text("notes"),
  metadata: json("metadata"), // Any additional data extracted from the prescription
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).pick({
  userId: true,
  doctorName: true,
  date: true,
  status: true,
  imageUrl: true,
  notes: true,
  metadata: true,
});

// Medications table
export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").notNull(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(), // e.g., 'twice daily', '3 times a day'
  instructions: text("instructions"), // e.g., 'take with food'
  refills: integer("refills").default(0),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  pharmacy: text("pharmacy"),
  active: boolean("active").default(true),
  medicationType: text("medication_type"), // 'tablet', 'capsule', 'liquid', etc.
});

export const insertMedicationSchema = createInsertSchema(medications).pick({
  prescriptionId: true,
  userId: true,
  name: true,
  dosage: true,
  frequency: true,
  instructions: true,
  refills: true,
  startDate: true,
  endDate: true,
  pharmacy: true,
  active: true,
  medicationType: true,
});

// Schedule table for individual medication times
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").notNull(),
  userId: integer("user_id").notNull(),
  time: text("time").notNull(), // e.g., '07:00', '13:00'
  dayOfWeek: text("day_of_week"), // e.g., 'monday,wednesday,friday' or 'daily'
  taken: boolean("taken").default(false),
  takenAt: timestamp("taken_at"),
});

export const insertScheduleSchema = createInsertSchema(schedules).pick({
  medicationId: true,
  userId: true,
  time: true,
  dayOfWeek: true,
  taken: true,
  takenAt: true,
});

// Orders table for medication orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  orderDate: timestamp("order_date").notNull(),
  status: text("status").notNull(), // 'ordered', 'shipped', 'in_transit', 'delivered'
  trackingNumber: text("tracking_number"),
  estimatedDelivery: date("estimated_delivery"),
  actualDelivery: date("actual_delivery"),
  pharmacy: text("pharmacy"),
  totalItems: integer("total_items").notNull(),
});

// Create a base schema first
const baseOrderSchema = createInsertSchema(orders).pick({
  userId: true,
  status: true,
  trackingNumber: true,
  pharmacy: true,
  totalItems: true,
});

// Then extend it with custom date handling
export const insertOrderSchema = baseOrderSchema.extend({
  orderDate: z.string().or(z.date()),
  estimatedDelivery: z.string().or(z.date()).optional(),
  actualDelivery: z.string().or(z.date()).optional(),
});

// Order items table for individual medications in an order
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  medicationId: integer("medication_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price"), // Stored in cents
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  medicationId: true,
  quantity: true,
  price: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
