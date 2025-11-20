import { type User, type InsertUser, type Well, type WellDetails, type BHAComponent, type DrillingParameters, type ToolComponent } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Well Seeker Pro token cache
  getWellSeekerToken(): Promise<string | undefined>;
  setWellSeekerToken(token: string): Promise<void>;
  clearWellSeekerToken(): Promise<void>;
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
}

export const storage = new MemStorage();
