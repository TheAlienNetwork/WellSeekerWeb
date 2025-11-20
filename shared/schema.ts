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
  refresh_token?: string;
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

export interface BHARun {
  id: string;
  runNumber: number;
  bhaNumber: number;
  mwdNumber: number;
  wellId: string;
}

export interface WellDashboardData {
  wellId: string;
  runId: string;
  operator: string;
  rig: string;
  well: string;
  jobNumber: string;
  wellbore: string;
  mwdNumber: number;
  bhaNumber: number;
  section: string;
  county: string;
  state: string;
  lat: number;
  long: number;
  northRef: boolean;
  vs: number;
  gridConv: number;
  declination: number;
  magField: number;
  dip: number;
  magModel: string;
  magDate: string;
  plugIn: string | null;
  unplug: string | null;
  timeIn: string | null;
  timeOut: string;
  depthIn: number;
  depthOut: number;
  circHrs: number;
  drillingHrs: number;
  brtHrs: number;
  motorFail: boolean;
  mwdFail: boolean;
  pooh: string;
  mwdComments: string;
  pw: number;
  ssq: number;
  tfsq: number;
  crossover: number;
  gcf: number;
  dao: number;
  surfaceSystemVersion: number;
  svyOffset: number;
  gamOffset: number;
  stickup: number;
  retrievable: number;
  pinToSetScrew: number;
  probeOrder: number;
  itemizedBHA: string;
  mwdMake: string;
  mwdModel: string;
  ubhoSN: string;
  helixSN: string;
  helixType: string;
  pulserSN: string;
  gammaSN: string;
  directionalSN: string;
  batterySN: string;
  batterySN2: string;
  shockToolSN: string;
  lih: boolean;
  stalls: number;
  npt: number;
  mwdCoordinator: string;
  directionalCoordinator: string;
  ddLead: string;
  mwdLead: string;
  pushTimeStamp: string;
  planName: string;
  mwdDay: string;
  mwdNight: string;
  bhaDescription: string;
  apiNumber: string;
  pulserVersion: number;
  mwdMinTemp: number;
  mwdMaxTemp: number;
  corrShockToolSN: string;
  totalCirculatingHours: number;
  mudType: string;
  mudWeight: string;
  correctingMDG: string;
  battery3: string;
  babelfishSN: string;
  muleShoe: string;
  
  // Manual overrides (N/N boxes)
  ubhoSNOverride?: string;
  helixSNOverride?: string;
  pulserSNOverride?: string;
  gammaSNOverride?: string;
  directionalSNOverride?: string;
  batterySNOverride?: string;
  batterySN2Override?: string;
  battery3Override?: string;
  shockToolSNOverride?: string;
  babelfishSNOverride?: string;
  muleShoeOverride?: string;
}

export interface ComponentReportData {
  dateOfActivity: string;
  drivrNumber: string;
  projectJobNum: string;
  runNum: number;
  circulatingHours: number;
  edt: number;
  personUpdatingActivity: string;
  comments: string;
}

export interface ComponentExportRequest {
  componentType: 'ubho' | 'muleshoe' | 'helix' | 'pulser' | 'gamma' | 'sea' | 'battery1' | 'battery2' | 'battery3' | 'shock' | 'babelfish';
  wellId: string;
  runId: string;
  filePath?: string;
}
