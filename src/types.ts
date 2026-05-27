// Type definitions for the Rescuer HQ Mobile Architect Dashboard and Simulator

export interface ArchSection {
  id: string;
  title: string;
  icon: string;
  summary: string;
  details: string[];
}

export interface SimEvent {
  id: string;
  type: "status" | "location" | "sos" | "sync" | "chat";
  timestamp: string;
  text: string;
  payload?: string;
  status: "success" | "pending" | "danger" | "info";
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}
