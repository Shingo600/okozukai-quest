"use client";
import type { ParentPin } from "./types";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function digest(salt: Uint8Array, pin: string): Promise<string> {
  const enc = new TextEncoder();
  const pinBytes = enc.encode(pin);
  const buf = new Uint8Array(salt.length + pinBytes.length);
  buf.set(salt, 0);
  buf.set(pinBytes, salt.length);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return toHex(new Uint8Array(h));
}

export async function hashPin(pin: string, saltHex?: string): Promise<ParentPin> {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const hash = await digest(salt, pin);
  return { hash, salt: toHex(salt) };
}

export async function verifyPin(pin: string, stored: ParentPin): Promise<boolean> {
  const candidate = await digest(fromHex(stored.salt), pin);
  return candidate === stored.hash;
}
