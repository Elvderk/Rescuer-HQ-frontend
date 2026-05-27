import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Define architecture data inside the endpoint to decouple it from large frontends
  const architectureDetails = {
    folderStructure: {
      title: "1. Folder Structure (Feature-First Architecture)",
      description: "Our Flutter skeleton organizes code into features containing distinct layers (Presentation, Domain, Data) and helper utilities grouped under core.",
      details: [
        "core/: Common network clients (Dio), persistent SQLite database mappings (Drift), local routing structures, and background geolocation monitors.",
        "features/: Independent modular partitions of the application (auth, map, searches, chat, sos). Supports fast compilation and feature scope isolation.",
        "presentation/: Screens, widgets, layout systems, and Riverpod StateNotifiers driving active UI updates.",
        "domain/: Freezed immutable models, exceptions, and business logic adapters.",
        "data/: Repositories, models, and data persistence clients (API endpoints & SQLite)."
      ]
    },
    layers: [
      {
        id: "folder",
        title: "Folder Structure",
        icon: "FolderGit",
        summary: "Robust feature-based Clean Architecture hierarchy that separates horizontal domains (Chat, SOS, Maps, Auth)."
      },
      {
        id: "state",
        title: "State Management",
        icon: "Cpu",
        summary: "State-reactive unidirectional architecture driven by Riverpod StateNotifier structures and custom stream builders."
      },
      {
        id: "repo",
        title: "Repository Architecture",
        icon: "Server",
        summary: "Repository interface paradigm encapsulating server endpoints, drift engines, and cache lookups from UI components."
      },
      {
        id: "api",
        title: "API Layer",
        icon: "Globe",
        summary: "Dio REST client configured with parallel queue mechanisms, connection thresholds, and immediate 401 jwt renewal steps."
      },
      {
        id: "ws",
        title: "WebSocket Layer",
        icon: "Radio",
        summary: "Thread-authoritative WebSocket streams transmitting broadcast updates: SOS emergency signals, loc-traces, and chat texts."
      },
      {
        id: "sync",
        title: "Offline Sync Engine",
        icon: "DatabaseBackup",
        summary: "Synchronization queues checking active connectivity, sending batched triggers, and settling last-write-wins differences."
      },
      {
        id: "database",
        title: "Local Database",
        icon: "Database",
        summary: "Drift SQLite local engine mapping relational indices, soft deletes, and streaming reactive updates to UI providers."
      },
      {
        id: "navigation",
        title: "Navigation Control",
        icon: "Compass",
        summary: "GoRouter configuration with strict permission-guarded redirection hooks and reactive deep linking mechanics."
      },
      {
        id: "maps",
        title: "Maps & Geolocation",
        icon: "Map",
        summary: "High-level map widgets configured with background tracking managers, battery-conservative scaling, and custom Polygons."
      }
    ]
  };

  // API Endpoints: Architecture Metadata
  app.get("/api/architecture", (req, res) => {
    res.json(architectureDetails);
  });

  // API Endpoints: Visual AI Co-pilot Chat
  app.post("/api/chat", async (req, res) => {
    const { message, chatHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message prompt is required." });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      // Graceful fallback if user has not yet configured their key in AI Studio Secrets panel
      return res.json({
        response: "📋 **[Simulation Mode Active]** Hello! I am the Rescuer HQ Flutter Arch-Copilot. It looks like you haven't configured a valid `GEMINI_API_KEY` inside the AI Studio Secrets panel. Make sure to add one to enjoy live discussions!\n\nHere is a quick architectural hint:\nTo design robust multi-user maps in Flutter, leverage **Riverpod's family provider modifier** (`StateProvider.family`) to feed distinctive camera vectors for different ongoing searches automatically without leaking states!"
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const systemInstruction = 
        "You are an expert Senior Flutter Architect and Mobile Systems Engineer. " +
        "You are guiding developers working on the Rescuer HQ mobile application—a production-ready android coordination platform for search and rescue operations. " +
        "Answer the questions accurately using clean, modern Flutter patterns (Riverpod 2, Freezed, Drift, GoRouter, background services). " +
        "Keep your syntax-highlighted code blocks clean and write informative, professional Dart modules. Limit explanations to concise architecture feedback.";

      // Query Gemini model
      const contents = [
        { role: "user", parts: [{ text: `Let's discuss the Rescuer HQ mobile app. ${message}` }] }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2
        }
      });

      res.json({ response: response.text });
    } catch (err: any) {
      console.error("[GEMINI ERR]:", err);
      res.status(500).json({ error: "Failed to communicate with senior architect model: " + err.message });
    }
  });

  // Vite Client Integration inside Dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Rescuer HQ Arch Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
