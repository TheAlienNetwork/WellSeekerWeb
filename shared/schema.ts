import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Well Seeker Pro API types
export interface WellSeekerAuthRequest {
  userName: string;
  password: string;
  productKey: string;
}

export interface WellSeekerAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface Well {
  id: string;
  jobNum: string;
  actualWell: string;
  rig: string;
  operator: string;
  wellStatus: string;
}

export interface WellDetails {
  wellName: string;
  jobNumber: string;
  operator: string;
  rig: string;
  latitude: string;
  longitude: string;
  depthIn: string;
  depthOut: string;
  totalFootage: string;
  magCorrection: string;
  gridConv: string;
  btotal: string;
  vs: string;
  dec: string;
  dip: string;
}

export interface BHAComponent {
  num: number;
  bha: number;
  description: string;
  nm: string;
  id: string;
  od: string;
  length: string;
  toBit: string;
}

export interface DrillingParameters {
  plugIn: string;
  timeIn: string;
  timeOut: string;
  unplug: string;
  depthIn: string;
  depthOut: string;
  totalFootage: string;
  drillHours: string;
  operHours: string;
  circHrs: string;
  pluggedHrs: string;
  bha: number;
  mwd: number;
  retrievable: number;
  reasonPOOH: string;
}

export interface ToolComponent {
  name: string;
  sn: string;
  snOverride: string;
  lih: string;
  failure: string;
  npt: string;
}
