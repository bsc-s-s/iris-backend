"use client";

const DEVICE_ID_KEY = "iris_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceHeaders(): Record<string, string> {
  return { "x-device-id": getDeviceId() };
}
