import { type User, type InsertUser, type Well, type WellDetails, type BHAComponent, type DrillingParameters, type ToolComponent, type WellDashboardData } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Well Seeker Pro token cache
  getWellSeekerToken(): Promise<string | undefined>;
  setWellSeekerToken(token: string): Promise<void>;
  clearWellSeekerToken(): Promise<void>;
  
  // Well Dashboard Data
  getWellDashboardData(): Promise<WellDashboardData>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private wellSeekerToken: string | undefined;

  constructor() {
    this.users = new Map();
    this.wellSeekerToken = undefined;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getWellSeekerToken(): Promise<string | undefined> {
    return this.wellSeekerToken;
  }

  async setWellSeekerToken(token: string): Promise<void> {
    this.wellSeekerToken = token;
  }

  async clearWellSeekerToken(): Promise<void> {
    this.wellSeekerToken = undefined;
  }

  async getWellDashboardData(): Promise<WellDashboardData> {
    return {
      operator: "Continental Resources",
      rig: "Nabors 784",
      well: "Limousin 6-3H2",
      jobNumber: "ddmt-140146",
      wellbore: "Limousin 6-3H2 - Wellbore 1",
      mwdNumber: 0,
      bhaNumber: 1,
      section: "INT1",
      county: "Mountrail",
      state: "North Dakota",
      lat: 48.01947606,
      long: -102.5721886,
      northRef: true,
      vs: 267.48,
      gridConv: -1.541985,
      declination: 7.58,
      magField: 56508.292,
      dip: 73.098,
      magModel: "User defined",
      magDate: "2014-03-25",
      plugIn: null,
      unplug: null,
      timeIn: null,
      timeOut: "3/30/14 17:45",
      depthIn: 1887,
      depthOut: 8477,
      circHrs: 2.833332,
      drillingHrs: 72.416641,
      brtHrs: 2562047.788,
      motorFail: false,
      mwdFail: false,
      pooh: "Change BHA",
      mwdComments: "0",
      pw: 0,
      ssq: 0,
      tfsq: 0,
      crossover: 0,
      gcf: 0,
      dao: 0,
      surfaceSystemVersion: 0,
      svyOffset: 0,
      gamOffset: 0,
      stickup: 0,
      retrievable: 0,
      pinToSetScrew: 0,
      probeOrder: 0,
      itemizedBHA: "See BHA tab",
      mwdMake: "",
      mwdModel: "",
      ubhoSN: "65207",
      helixSN: "0",
      helixType: "0",
      pulserSN: "0",
      gammaSN: "0",
      directionalSN: "",
      batterySN: "0",
      batterySN2: "0",
      shockToolSN: "0",
      lih: false,
      stalls: 0,
      npt: 0,
      mwdCoordinator: "",
      directionalCoordinator: "Bart Lantis",
      ddLead: "Dave Stoner",
      mwdLead: "",
      pushTimeStamp: "No Recent Push",
      planName: "",
      mwdDay: "",
      mwdNight: "",
      bhaDescription: "BHA # 1 (Vertical #1)",
      apiNumber: "",
      pulserVersion: 0,
      mwdMinTemp: 0,
      mwdMaxTemp: 0,
      corrShockToolSN: "",
      totalCirculatingHours: 75.25,
      mudType: "",
      mudWeight: "",
      correctingMDG: "",
      battery3: "0",
      babelfishSN: "0",
    };
  }
}

export const storage = new MemStorage();
