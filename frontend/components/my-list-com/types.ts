// /types/index.ts
export interface OutOfStation {
  isOutOfStation: boolean;
  isOutOfStationPlace?: string;
}

// types.ts
export type Connection = { name: string; relation?: string; phoneNumber?: string };
export type Customer = {
  _id?: string;
  name?: string;
  phoneNumber?: string;
  age?: number;
  chanting?: number;
  outOfStation?: { isOutOfStation?: boolean; isOutOfStationPlace?: string };
  address?: string;
  goodConnectionWith?: Connection[];
  [k: string]: any;
};
export type User = {
  _id?: string;
  name?: string;
  phoneNumber?: string;
  role?: string;
  [k: string]: any;
};
export interface PersistData {
  auth: {
    user: {
      id: string;
      name: string;
      phone: number;
      role: string; // you can expand roles if needed
      userType: string;
    };
    token: string;
    isLoggedIn: boolean;
  }

}


// /lib/axios.ts
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.1.9:8080",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

