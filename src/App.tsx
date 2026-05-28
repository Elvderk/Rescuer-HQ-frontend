import React, { useState, useEffect, useRef } from "react";
import { 
  FolderGit, 
  Cpu, 
  Server, 
  Globe, 
  Radio, 
  Database, 
  Compass, 
  Map, 
  Send, 
  Copy, 
  Plus, 
  Check, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Terminal, 
  User, 
  Bell, 
  Zap, 
  RotateCcw, 
  MessageSquare, 
  AlertTriangle,
  Play,
  FileCode,
  Smartphone,
  ChevronRight,
  MapPin,
  Flame,
  BatteryMedium,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sliders,
  DatabaseZap
} from "lucide-react";
import { skeletonCodes, SkeletonFile } from "./data/skeletonCode";
import { ArchSection, SimEvent, ChatMessage } from "./types";

export default function App() {
  // Theme & App variables
  const [activeTab, setActiveTab] = useState<string>("folder");
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  
  // Simulated mobile device state
  const [isWebSocketConnected, setIsWebSocketConnected] = useState<boolean>(true);
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(true);
  const [batteryLevel, setBatteryLevel] = useState<number>(92);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [currentProfile, setCurrentProfile] = useState<"standard" | "highPrecisionSOS" | "lowBattery">("standard");
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [customMsgText, setCustomMsgText] = useState<string>("");
  const [simulatedVolunteerDistance, setSimulatedVolunteerDistance] = useState<number>(240);
  const [driftDatabaseSize, setDriftDatabaseSize] = useState<number>(4.2);

  // Architecture Section Details
  const [architectureItems, setArchitectureItems] = useState<ArchSection[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(true);

  // Telemetry logs
  const [logs, setLogs] = useState<SimEvent[]>([
    {
      id: "log_1",
      type: "status",
      timestamp: "14:10:00",
      text: "Drift local database initialized. Root schema v1 established.",
      status: "success",
      payload: `{"schema_version": 1, "tables": ["users", "searches", "location_queue"]}`
    },
    {
      id: "log_2",
      type: "status",
      timestamp: "14:10:05",
      text: "Background location service initialized & GPS payload bound.",
      status: "info"
    },
    {
      id: "log_3",
      type: "sync",
      timestamp: "14:10:12",
      text: "Local replication snapshot checked — 0 pending sync records.",
      status: "success"
    },
    {
      id: "log_4",
      type: "status",
      timestamp: "14:11:00",
      text: "JWT Access authentication payload authenticated successfully.",
      status: "success"
    },
    {
      id: "log_5",
      type: "chat",
      timestamp: "14:12:10",
      text: "WebSocket subscribed to topic: chat.message.created for Search #24-0912",
      status: "info"
    }
  ]);

  // AI Architect chat state
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: "👋 Привет! Я твой старший архитектор мобильных систем **Rescuer HQ**.\n\nЯ помогу тебе спроектировать и доработать production-ready Flutter-приложение для координации поисково-спасательных отрядов.\n\nЗадай мне любой вопрос о **Riverpod**, реактивном слое **Drift SQLite**, фоновом отслеживании геолокации в условиях отсутствия связи, или о том, как реализовать аварийную передачу **SOS Кнопки** с приоритетными пушами!",
      timestamp: "19:14:09"
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Pre-configured questions for ease of exploration
  const querySuggestions = [
    "Как Drift синхронизирует геоданные при переходе в оффлайн-режим?",
    "Архитектура отслеживания уровня батареи спасателей в фоне",
    "Каковы правила работы WebSocket при дисконнекте в полевых условиях?",
    "Объясни связку Riverpod StateNotifier + Firebase Messaging для SOS"
  ];

  // Fetch metadata details
  useEffect(() => {
    async function loadMetadata() {
      try {
        const response = await fetch("/api/architecture");
        const data = await response.json();
        // Convert array to type matching schema
        if (data && data.layers) {
          const formatted = data.layers.map((l: any) => {
            let detailsList: string[] = [];
            if (l.id === "folder") {
              detailsList = data.folderStructure ? data.folderStructure.details : [
                "lib/core - Shared networking clients, security modules and service containers.",
                "lib/features/auth - Token registries and secure authentication pipelines.",
                "lib/features/map - Core location logic and vector mapping overlay states.",
                "lib/features/sos - High privilege background panic drivers.",
                "lib/features/chat - Local storage and real-time sockets for text, speech-to-text, and media sharing."
              ];
            } else if (l.id === "state") {
              detailsList = [
                "Unidirectional reactive flow driven entirely by StateNotifierProvider from Riverpod v2.",
                "Prevents leaky modules by managing state in immutable objects instantiated with Freezed annotations.",
                "UI automatically redrafts polygons and tracks by watching changes without manual reload triggers."
              ];
            } else if (l.id === "repo") {
              detailsList = [
                "Contracts are declared inside the core domain layer to enforce clean separation guidelines.",
                "Data Layer repositories select transparently between the Dio client backend and SQLite local Drift storage.",
                "Enforces strict offline-first behaviors: operations succeed locally and are committed back automatically."
              ];
            } else if (l.id === "api") {
              detailsList = [
                "Dio dynamic instance injected using Riverpod provider containers.",
                "Configures concurrent Interceptors that catch HTTP 401 token authentication expiries.",
                "Automatically blocks ongoing server streams, queries the refresh token rotate endpoint, and automatically replays pending failures."
              ];
            } else if (l.id === "ws") {
              detailsList = [
                "Failsafe persistent channel wrapper utilizing web_socket_channel.",
                "Injects active JWT authentication token inside standard secure connection queries.",
                "Performs client-directed 30s heartbeat pings and scales back connection retry thresholds on deep forest drops."
              ];
            } else if (l.id === "sync") {
              detailsList = [
                "Background sync task worker continuously monitors device connectivity parameters.",
                "Collects and bundles unsynced drift location events into high-density POST query arrays.",
                "Saves expensive operations and decreases cellular bandwidth requirements in low-coverage ranges."
              ];
            } else if (l.id === "database") {
              detailsList = [
                "Drift (formerly Moor) reactive engine running on native raw C engine overlays.",
                "Declares precise indexing configurations to expedite coordinate proximity searches.",
                "Reactive Stream query bindings allow live updates on chat feeds, statuses, and area vectors."
              ];
            } else if (l.id === "navigation") {
              detailsList = [
                "Declarative configuration driven by package:go_router.",
                "Contains redirection logic based on reactive authentication status guards.",
                "Provides deep-linking mappings to quickly focus and highlight active crisis corridors."
              ];
            } else if (l.id === "maps") {
              detailsList = [
                "Google Maps custom widget implementation optimized to support night-vision overlay layers.",
                "Blends low-consumption rendering with high-frequency user location trackers during search operations.",
                "Dynamically parses sector assignments and paints boundaries automatically on tracking status."
              ];
            }
            return {
              ...l,
              details: detailsList
            };
          });
          setArchitectureItems(formatted);
        }
        setLoadingMetadata(false);
      } catch (e) {
        console.error("Failed to load metadata endpoint", e);
        setLoadingMetadata(false);
      }
    }
    loadMetadata();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Handle file copying
  const copyToClipboard = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(path);
    setTimeout(() => {
      setCopiedFile(null);
    }, 2000);
  };

  // Helper trigger to add custom telemetry simulation events
  const addSimEvent = (text: string, type: SimEvent["type"], status: SimEvent["status"], payload?: string) => {
    const formattedTime = new Date().toLocaleTimeString("ru-RU", { hour12: false });
    const newLog: SimEvent = {
      id: "log_" + Date.now().toString(),
      type,
      text,
      timestamp: formattedTime,
      status,
      payload
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  // Simulation Triggers
  const triggerLocationUpdate = () => {
    const coords = {
      lat: (55.751244 + (Math.random() - 0.5) * 0.015).toFixed(6),
      lng: (37.618423 + (Math.random() - 0.5) * 0.015).toFixed(6),
      accuracy: (10 + Math.random() * 20).toFixed(1),
      speed: (1.2 + Math.random() * 2.8).toFixed(1)
    };

    setSimulatedVolunteerDistance(prev => {
      const delta = Math.floor((Math.random() - 0.5) * 40);
      return Math.max(80, prev + delta);
    });

    addSimEvent(
      `user.location.updated dispatch: Lat ${coords.lat}, Lng ${coords.lng} (${coords.accuracy}m speed: ${coords.speed}m/s)`,
      "location",
      "info",
      JSON.stringify({ event: "user.location.updated", userId: "913f99e4-fa86", ...coords })
    );

    // Increase DB size slightly as location points persistent
    setDriftDatabaseSize(prev => parseFloat((prev + 0.05).toFixed(2)));
  };

  const triggerSOSBeacons = () => {
    const isNextSos = !sosActive;
    setSosActive(isNextSos);
    
    if (isNextSos) {
      setCurrentProfile("highPrecisionSOS");
      addSimEvent(
        "CRITICAL: SOS Trigger Initiated! Transmitted to HQ channels. Heavy tracing sequence activated.",
        "sos",
        "danger",
        JSON.stringify({
          event: "sos.created",
          sos_id: "sos_cf34ccf4_panic",
          lat: 55.751244,
          lng: 37.618423,
          battery: batteryLevel,
          high_precision_enabled: true
        })
      );
    } else {
      setCurrentProfile("standard");
      addSimEvent(
        "SOS emergency deactivated. Restoring standard battery operations.",
        "sos",
        "success"
      );
    }
  };

  const triggerToggleOffline = () => {
    const nextOfflineState = !isOfflineMode;
    setIsOfflineMode(nextOfflineState);
    if (nextOfflineState) {
      setIsWebSocketConnected(false);
      addSimEvent(
        "WARNING: Network connection lost! Socket severed. Drift Local Queue activated.",
        "status",
        "danger"
      );
    } else {
      setIsWebSocketConnected(true);
      addSimEvent(
        "INFO: Cellular connection re-established. Sync pipeline engaged.",
        "status",
        "success"
      );
    }
  };

  const triggerSyncSync = () => {
    if (isOfflineMode) {
      addSimEvent(
        "Sync failed: Connection is offline. Location points buffered in local SQLite (Drift).",
        "sync",
        "danger"
      );
      return;
    }

    addSimEvent(
      `Queue synchronized: Cleared buffer. Bulk locations committed successfully to server.`,
      "sync",
      "success",
      `{"sync_status": "success", "synced_records": 12, "database_action": "MARK_ACCUMULATED_ITEMS_SYNCED"}`
    );
  };

  const handlesSubmitChat = async (e?: React.FormEvent, directMessage?: string) => {
    if (e) e.preventDefault();
    const prompt = directMessage || chatInput;
    if (!prompt.trim()) return;

    const userMsg: ChatMessage = {
      id: "user_" + Date.now().toString(),
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour12: false })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!directMessage) setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          chatHistory: chatMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();
      
      const incomingText = data.response || "Incomplete server replication.";
      const modelMsg: ChatMessage = {
        id: "model_" + Date.now().toString(),
        role: "model",
        content: incomingText,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour12: false })
      };
      
      setChatMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "err_" + Date.now().toString(),
        role: "model",
        content: "🚨 Ошибка сети при соединении с Senior Flutter Architect. Пожалуйста, убедитесь, что выставили GEMINI_API_KEY.",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour12: false })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearDatabaseSim = () => {
    setDriftDatabaseSize(1.1);
    addSimEvent(
      "Drift SQLite database cleared. All persistent sync entries reset.",
      "status",
      "success"
    );
  };

  return (
    <div id="root_container" className="min-h-screen bg-[#0A0B0D] text-slate-200 font-sans flex flex-col antialiased">
      
      {/* HEADER STATUS LAYER */}
      <header id="hub_header" className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0F1115] shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-red-900/30">HQ</div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Rescuer HQ <span className="text-slate-500 font-normal">Flutter Architect Hub</span>
            </h1>
            <p className="text-[11px] text-slate-400">Mobile Coordination Platform Simulation Console</p>
          </div>
          <span className="ml-2 px-2.5 py-0.5 bg-red-500/10 text-red-500 text-[10px] uppercase tracking-wider font-bold border border-red-500/20 rounded">
            Interactive SDK Sandbox
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isWebSocketConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
            <span className={`text-[11px] font-mono uppercase tracking-tighter ${isWebSocketConnected ? "text-emerald-500" : "text-red-500"}`}>
              {isWebSocketConnected ? "WebSocket: Online" : "WebSocket: Disconnected"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 border-l border-slate-800 pl-6 h-6">
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span className="text-[11px] font-mono">Android Target: SDK 34</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 border-l border-slate-800 pl-6 h-6">
            <Wifi className={`w-4 h-4 ${isOfflineMode ? "text-red-500" : "text-emerald-400"}`} />
            <span className="text-[11px] font-mono">
              {isOfflineMode ? "Offline-First Mode Active" : "Operational Network: Active"}
            </span>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE TRIPLE LAYOUT */}
      <div id="main_bento_grid" className="flex-1 flex overflow-hidden min-h-0">
        
        {/* LEFT NAV BAR: ARCHITECTURE TOPICS SELECTOR */}
        <aside id="nav_rail" className="w-80 border-r border-slate-800 bg-[#0F1115] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-800 bg-[#12151B]">
            <p className="text-xs font-bold uppercase tracking-widest text-[#E53E3E] mb-2">SYSTEM SCHEMATIC</p>
            <h3 className="text-sm font-semibold text-white">Flutter clean architecture</h3>
            <p className="text-xs text-slate-400 mt-1">Select vertical layer metrics to explore target details and specifications below.</p>
          </div>

          <div className="p-3 space-y-1.5 dynamic-arch-selector">
            {loadingMetadata ? (
              <div className="flex items-center gap-2 p-4 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading schema files...</span>
              </div>
            ) : (
              architectureItems.map((item) => {
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`layer_btn_${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left p-3 rounded transition-all flex gap-3 border ${
                      isSelected 
                        ? "bg-[#1C1F26] border-slate-700 text-white shadow-md shadow-black/30" 
                        : "bg-transparent border-transparent hover:bg-slate-800/40 text-slate-300"
                    }`}
                  >
                    <div className={`p-2 rounded shrink-0 ${isSelected ? "bg-red-500/10 text-red-500" : "bg-slate-800 text-slate-400"}`}>
                      {item.id === "folder" && <FolderGit className="w-4 h-4" />}
                      {item.id === "state" && <Cpu className="w-4 h-4" />}
                      {item.id === "repo" && <Server className="w-4 h-4" />}
                      {item.id === "api" && <Globe className="w-4 h-4" />}
                      {item.id === "ws" && <Radio className="w-4 h-4" />}
                      {item.id === "sync" && <Zap className="w-4 h-4" />}
                      {item.id === "database" && <Database className="w-4 h-4" />}
                      {item.id === "navigation" && <Compass className="w-4 h-4" />}
                      {item.id === "maps" && <Map className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.summary}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* DETAILED DRILL-DOWN BOX FOR SELECTED LAYER */}
          {activeTab && (
            <div id="layer_detail_pane" className="mt-auto p-4 border-t border-slate-800 bg-[#12151B]">
              {architectureItems.filter(item => item.id === activeTab).map(item => (
                <div key={item.id} className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-red-400 tracking-wider uppercase font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Checked Clean Spec
                  </div>
                  <h4 className="text-xs font-bold text-white">{item.title} rules:</h4>
                  <ul className="space-y-2">
                    {item.details.map((detail, idx) => (
                      <li key={idx} className="text-[11px] text-slate-300 leading-snug flex items-start gap-2 bg-slate-900/40 p-2 rounded border border-slate-850">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* MIDDLE WORK CONSOLE: TWO TAB ARCHITECTURE */}
        {/* TAB 1: CODE EXPLORER, TAB 2: INTERACTIVE LIVE EMULATOR */}
        <main id="editor_and_emulator" className="flex-1 flex flex-col bg-[#0A0B0D] overflow-hidden">
          
          {/* HEADER SELECT ROTATOR */}
          <div id="content_header" className="h-12 border-b border-slate-800 bg-[#0F1115] px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-slate-500 tracking-wider">Active Workspace Viewports</span>
            </div>
            <div className="flex gap-2">
              <button
                id="view_btn_code"
                onClick={() => setCurrentFileIndex(0)}
                className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
                  currentFileIndex < 5 
                    ? "bg-[#1E232E] border-slate-700 text-white" 
                    : "bg-transparent border-transparent hover:bg-slate-800/40 text-slate-400"
                }`}
              >
                Core Dart Library Skeletons
              </button>
              <span className="text-slate-700 self-center">|</span>
              <button
                id="view_btn_simulation"
                className="px-3 py-1 text-xs font-mono rounded border transition-colors text-white bg-red-600/10 border-red-900/30"
              >
                Simulation Command Dashboard
              </button>
            </div>
          </div>

          <div className="flex-1 flex min-h-0">
            
            {/* LEFT INNER COLUMN: INTERACTIVE DEVICE SCREEN AND BEACON PANEL */}
            <div id="interactive_emulator" className="w-[360px] border-r border-slate-800 bg-[#0A0B0D] flex flex-col p-4 overflow-y-auto shrink-0 select-none">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-red-500" /> Simulated Mobile Unit
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono text-sky-400">
                  Android Run
                </span>
              </div>

              {/* HIGH-FIDELITY MOBILE EMBEDDED PHONE VIEW */}
              <div className={`relative w-full h-[450px] bg-[#12151D] rounded-3xl border-4 ${sosActive ? "border-red-600 animate-pulse" : "border-slate-800"} shadow-2xl flex flex-col overflow-hidden`}>
                
                {/* Android Notch / Speaker banner */}
                <div className="absolute top-0 inset-x-0 h-6 bg-black/80 flex items-center justify-between px-4 z-40">
                  <span className="text-[9px] font-mono text-slate-400 tracking-tighter">RescuerHQ v1.1</span>
                  <div className="w-16 h-3 bg-black rounded-b-md mx-auto absolute left-1/2 -translate-x-1/2 top-0"></div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-[9px] font-mono">{batteryLevel}%</span>
                    <BatteryMedium className={`w-3.5 h-3.5 ${batteryLevel < 20 ? "text-red-500 animate-bounce" : "text-emerald-400"}`} />
                  </div>
                </div>

                {/* Simulated Map View Screen */}
                <div className="flex-1 relative bg-[#0F1116] pt-6 overflow-hidden">
                  
                  {/* Dynamic Dark Matrix Grid Pattern simulating a topographic coordinates mesh */}
                  <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(#E53E3E 1px, transparent 1.5px)", backgroundSize: "16px 16px" }}></div>
                  
                  {/* Flashing Emergency Vignette */}
                  {sosActive && (
                    <div className="absolute inset-0 border-4 border-red-500 animate-ping opacity-10 pointer-events-none rounded-2xl z-20"></div>
                  )}

                  {/* Topographic Lines Overlay (mock SVG grid) */}
                  <svg className="absolute inset-0 w-full h-full text-slate-800/20" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="180" cy="200" r="140" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4" />
                    <circle cx="180" cy="200" r="90" fill="none" stroke="currentColor" strokeWidth="1" />
                    <circle cx="180" cy="200" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
                    <line x1="180" y1="0" x2="180" y2="400" stroke="currentColor" strokeWidth="0.5" />
                    <line x1="0" y1="200" x2="360" y2="200" stroke="currentColor" strokeWidth="0.5" />
                    
                    {/* Simulated Polygon: Sector Delta */}
                    <polygon points="60,110 140,80 160,150 90,170" fill="rgba(245, 158, 11, 0.15)" stroke="#F59E0B" strokeWidth="1.5" />
                    
                    {/* Simulated Polygon: Sector Epsilon */}
                    <polygon points="120,220 220,180 260,250 160,290" fill="rgba(59, 130, 246, 0.15)" stroke="#3B82F6" strokeWidth="1.5" />
                  </svg>

                  {/* Marker Points inside Map */}
                  <div className="absolute top-[28%] left-[55%] -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="relative">
                      <div className="w-5 h-5 bg-red-500/20 rounded-full animate-ping absolute -inset-1.5"></div>
                      <div className="w-2 h-2 bg-[#E53E3E] rounded-full ring-2 ring-white"></div>
                    </div>
                    <span className="absolute left-3 bg-black/90 text-[8px] font-mono px-1 py-0.5 rounded text-white border border-red-900 border-dashed shrink-0">
                      Target Area Sofia P.
                    </span>
                  </div>

                  <div className="absolute top-[48%] left-[32%] -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="relative">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-white"></div>
                    </div>
                    <span className="absolute left-3 bg-black/95 text-[8px] font-mono px-1 py-0.5 rounded text-emerald-400 shrink-0">
                      You (240m away)
                    </span>
                  </div>

                  <div className="absolute top-[65%] left-[72%] -translate-x-1/2 -translate-y-1/2 z-10 opacity-60">
                    <div className="relative">
                      <div className="w-2 h-2 bg-slate-500 rounded-full ring-1 ring-white"></div>
                    </div>
                    <span className="absolute left-3 bg-black/95 text-[8px] font-mono px-1 py-0.5 rounded text-slate-400 shrink-0">
                      Team K9-1 (1.2km)
                    </span>
                  </div>

                  {/* Core Device Header Card overlay */}
                  <div className="absolute top-[32px] inset-x-3 bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-lg backdrop-blur-md text-white z-30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-[10px]">
                        S-01
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold tracking-tight">Active Operation Amber</h4>
                        <p className="text-[9px] font-mono text-slate-400">Status: ACTIVE • Dist. Sector Delta</p>
                      </div>
                    </div>
                  </div>

                  {/* Urgent SOS flashing indicator overlay */}
                  {sosActive && (
                    <div className="absolute bottom-[110px] inset-x-3 bg-red-600 border border-red-700 p-2.5 rounded-lg text-white shadow-lg animate-bounce duration-1000 z-30">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 animate-spin text-amber-200" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider">PANIC EVENT SENT TO CLOUD</p>
                          <p className="text-[9px] text-rose-100">Location streamed each 5s (best accuracy GPS)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simulated App Navigation Controls */}
                  <div className="absolute bottom-3 inset-x-3 rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col gap-2 z-30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-300">Live Satellite Monitor</span>
                      <span className={`text-[9px] font-bold ${isTrackingActive ? "text-emerald-400 animate-pulse" : "text-amber-500"}`}>
                        {isTrackingActive ? "📡 Stream Active" : "🔴 Standard Sync"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsTrackingActive(!isTrackingActive)}
                        className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono border transition-colors ${
                          isTrackingActive 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                            : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}
                      >
                        {isTrackingActive ? "Disable Background Tracker" : "Enable Tracker"}
                      </button>
                      <button 
                        onClick={triggerSOSBeacons}
                        className={`px-3 py-1 rounded text-[10px] font-mono border transition-colors font-bold ${
                          sosActive 
                            ? "bg-slate-900 border-slate-700 text-slate-400" 
                            : "bg-[#E53E3E] border-red-700 text-white animate-pulse"
                        }`}
                      >
                        {sosActive ? "Reset SOS" : "Press SOS"}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Bottom Android Home Indicator bar */}
                <div className="h-4 bg-black/90 flex justify-center items-center z-40 shrink-0">
                  <div className="w-24 h-1 bg-slate-600 rounded-full"></div>
                </div>
              </div>

              {/* SIMULATION TUNING PANEL */}
              <div id="sim_tuning_cabinet" className="mt-4 bg-[#0F1115] border border-slate-800 p-3 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-red-500" /> Simulation Controls
                  </h4>
                  <button 
                    onClick={() => {
                      setBatteryLevel(92);
                      setIsTrackingActive(true);
                      setSosActive(false);
                      setCurrentProfile("standard");
                      setIsOfflineMode(false);
                      setIsWebSocketConnected(true);
                      setDriftDatabaseSize(4.2);
                      addSimEvent("Simulation configurations reset to benchmark defaults.", "status", "info");
                    }} 
                    title="Reset simulation parameters" 
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                {/* Slider trigger for battery status */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Power Level:</span>
                    <span className={`font-mono font-bold ${batteryLevel < 20 ? "text-red-400" : "text-slate-300"}`}>{batteryLevel}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    value={batteryLevel} 
                    onChange={(e) => {
                      const l = parseInt(e.target.value);
                      setBatteryLevel(l);
                      if (l < 15) {
                        setCurrentProfile("lowBattery");
                        addSimEvent(`SYSTEM ALERT: Mobile unit reported low battery (${l}%). Swapped monitoring profile automatically.`, "status", "danger");
                      }
                    }} 
                    className="w-full h-1 bg-slate-800 border-none rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                </div>

                {/* Tracking Prof Selector */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Geopositioning Profile:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(["standard", "highPrecisionSOS", "lowBattery"] as const).map((prof) => {
                      const active = currentProfile === prof;
                      return (
                        <button
                          key={prof}
                          onClick={() => {
                            setCurrentProfile(prof);
                            addSimEvent(`Operational positioning profile switched: ${prof}. Parameters recalculated.`, "location", "info");
                          }}
                          className={`py-1 rounded text-[9px] font-mono border transition-colors ${
                            active 
                              ? "bg-red-500/15 border-red-500/30 text-white" 
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {prof === "standard" && "Standard"}
                          {prof === "highPrecisionSOS" && "SOS High"}
                          {prof === "lowBattery" && "Battery Save"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Instant Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={triggerLocationUpdate}
                    className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MapPin className="w-3 h-3 text-red-500" />
                    Send Coordinates
                  </button>
                  <button
                    onClick={triggerToggleOffline}
                    className={`py-1.5 px-2 text-slate-300 rounded text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors border ${
                      isOfflineMode 
                        ? "bg-red-600/10 border-red-500/20 text-red-400" 
                        : "bg-slate-900 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    {isOfflineMode ? <WifiOff className="w-3 h-3 text-red-500" /> : <Wifi className="w-3 h-3 text-emerald-400" />}
                    {isOfflineMode ? "Go Online" : "Cut Signal"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={triggerSyncSync}
                    className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-400" />
                    Flush Sync Queue
                  </button>
                  <button
                    onClick={clearDatabaseSim}
                    className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-slate-400" />
                    Clear Cache DB
                  </button>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Realtime WS Searches Triggers:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: search.created published by Coordinator. Spawning Search #26-012.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "search.created",
                            search_id: "s_cf34_new",
                            missing_person: "Артем К. (7 лет)",
                            last_known_place: "Лесной массив КП Саврасово",
                            coordinator: "Заря-10"
                          })
                        );
                        setDriftDatabaseSize(prev => parseFloat((prev + 0.15).toFixed(2)));
                      }}
                      className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[#E53E3E] rounded text-[10px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      WS Create Search
                    </button>
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: search.status.changed -> COMPLETED for Active Operation. Target found alive!",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "search.status.changed",
                            search_id: "s_sofia_24",
                            status: "completed",
                            sub_status: "foundAlive",
                            closed_by: "coord_999"
                          })
                        );
                      }}
                      className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sky-400 rounded text-[10px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      WS Close Search
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Realtime GIS & SOS Events:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: district.assigned -> Sector A-1 reserved by Заря-4.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "district.assigned",
                            district_id: "dist_a1",
                            assigned_to: "Заря-4 (Иванова)",
                            area_sq_meters: 12000,
                            time: new Date().toISOString()
                          })
                        );
                        setDriftDatabaseSize(prev => parseFloat((prev + 0.08).toFixed(2)));
                      }}
                      className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-emerald-400 rounded text-[10px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      WS Assign Dist
                    </button>
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: volunteer.location.updated. GPS track streamed.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "volunteer.location.updated",
                            volunteer_id: "vol_44",
                            callsign: "Заря-4",
                            coords: [55.7562, 37.6169],
                            battery: "85%"
                          })
                        );
                      }}
                      className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-amber-400 rounded text-[10px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      WS Stream Location
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Realtime Tasks Operations:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: task.created -> 'Опрос родственников пропавшего в СНТ Сосновый Бор'.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "task.created",
                            task_id: "task_101",
                            title: "Опрос родственников",
                            search_id: "search_703",
                            priority: "critical",
                            created_at: new Date().toISOString()
                          })
                        );
                        setDriftDatabaseSize(prev => parseFloat((prev + 0.12).toFixed(2)));
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-purple-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      WS Create Task
                    </button>
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: task.assigned -> Task 'Опрос родственников' allocated to Заря-4.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "task.assigned",
                            task_id: "task_101",
                            assigned_volunteer_id: "vol_44",
                            assigned_callsign: "Заря-4 (Иванова)",
                            assigned_at: new Date().toISOString()
                          })
                        );
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-rose-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                      WS Assign Task
                    </button>
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: task.status.changed -> Task 'Опрос родственников' marked COMPLETED.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "task.status.changed",
                            task_id: "task_101",
                            status: "completed",
                            completed_at: new Date().toISOString()
                          })
                        );
                        setDriftDatabaseSize(prev => parseFloat((prev + 0.04).toFixed(2)));
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-emerald-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                      WS Complete Task
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Realtime Radio & STT:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: chat.typing -> 'Амур-12' starts transmitting radio report.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "chat.typing",
                            room_id: "room_search_24",
                            callsign: "Амур-12 (Кинолог)",
                            is_typing: true
                          })
                        );
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-cyan-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5 animate-pulse" />
                      WS Typing On
                    </button>
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: chat.message.voice.created -> 'Амур-12' voice msg. Whisper STT resolved successfully.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "chat.message.created",
                            room_id: "room_search_24",
                            message_id: "msg_voice_842",
                            sender_callsign: "Амур-12 (Кинолог)",
                            message_type: "voice",
                            media_url: "https://storage.rescuerhq.ru/voice/rec_99.aac",
                            voice_transcription: "Собака взяла след у развилки тропы, движемся в северном направлении.",
                            status: "delivered",
                            created_at: new Date().toISOString()
                          })
                        );
                        setDriftDatabaseSize(prev => parseFloat((prev + 0.18).toFixed(2)));
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-amber-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                      WS Voice STT
                    </button>
                    <button
                      onClick={() => {
                        addSimEvent(
                          "WS BROADCAST: live_location.updated -> 'Заря-4' gps track packet dispatched to GIS.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "live_location.updated",
                            room_id: "room_search_24",
                            message_id: "msg_gps_75",
                            sender_callsign: "Заря-4 (Иванова)",
                            message_type: "liveLocation",
                            latitude: 55.7592,
                            longitude: 37.6190,
                            status: "read",
                            created_at: new Date().toISOString()
                          })
                        );
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-emerald-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                      WS Dispat GPS
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Realtime Emergency SOS:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        addSimEvent(
                          "EMERGENCY BROADCAST: sos.created -> 'Заря-4 (Иванова)' has triggered life-threatening distress alert!",
                          "sos",
                          "danger",
                          JSON.stringify({
                            event: "sos.created",
                            sos_id: "sos_alert_894",
                            volunteer_id: "vol_44",
                            callsign: "Заря-4 (Иванова)",
                            latitude: 55.7562,
                            longitude: 37.6169,
                            battery_level: 82,
                            network_state: "OK",
                            status: "active",
                            triggered_at: new Date().toISOString()
                          })
                        );
                        setDriftDatabaseSize(prev => parseFloat((prev + 0.12).toFixed(2)));
                      }}
                      className="py-1 px-1 bg-red-950/45 hover:bg-red-900/65 border border-red-900/60 hover:border-red-700/80 text-red-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5 animate-pulse" />
                      WS Trigger SOS
                    </button>
                    <button
                      onClick={() => {
                        addSimEvent(
                          "EMERGENCY UPDATE: sos.location.updated -> 'Заря-4' coordinate drift track updated.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "sos.location.updated",
                            sos_id: "sos_alert_894",
                            latitude: 55.7571,
                            longitude: 37.6180,
                            status: "active"
                          })
                        );
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-yellow-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                      WS SOS Drift
                    </button>
                    <button
                      onClick={() => {
                        addSimEvent(
                          "EMERGENCY RECOVERY: sos.status.changed -> SOS status transitioned to RESOLVED. Back to healthy state.",
                          "status",
                          "success",
                          JSON.stringify({
                            event: "sos.status.changed",
                            sos_id: "sos_alert_894",
                            status: "resolved"
                          })
                        );
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sky-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                      WS Resolve SOS
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Diagnostics & Lifecycle:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        addSimEvent(
                          "LIFECYCLE TRIGGER: appState -> BACKGROUND. Shutting down websockets and suspension-unsafe timers.",
                          "status",
                          "info",
                          "LIFECYCLE: State changed to appState.paused. Disconnecting socket..."
                        );
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-yellow-500/90 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                      Pause (Background)
                    </button>
                    <button
                      onClick={() => {
                        addSimEvent(
                          "LIFECYCLE TRIGGER: appState -> FOREGROUND. Resuming websocket connection & delta syncing.",
                          "status",
                          "success",
                          "LIFECYCLE: State changed to appState.resumed. Reconnecting & synchronizing states..."
                        );
                      }}
                      className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-emerald-500 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                      Resume (Foreground)
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT WORK PANE - COMBINED SKELETON SOURCE VIEWER AND SIMULATED TRACE LOGS */}
            <div id="source_and_logs_container" className="flex-1 flex flex-col overflow-hidden min-w-0">
              
              {/* PRIMARY FILE TABS BAR FOR SKELETON DART FILES */}
              <div id="file_tabs" className="h-10 bg-[#0F1115] border-b border-slate-850 px-4 flex items-center gap-1 overflow-x-auto shrink-0 select-none">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mr-2 shrink-0">Source Tree:</span>
                {skeletonCodes.map((file, idx) => {
                  const isCur = currentFileIndex === idx;
                  return (
                    <button
                      key={file.path}
                      id={`file_tab_${idx}`}
                      onClick={() => setCurrentFileIndex(idx)}
                      className={`h-full px-3 text-xs font-mono transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
                        isCur 
                          ? "text-red-400 border-red-500 bg-[#161922]" 
                          : "text-slate-400 border-transparent hover:text-slate-200"
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{file.path.split("/").pop()}</span>
                    </button>
                  );
                })}
              </div>

              {/* CURRENT SELECTED SKELETON FILE METRICS */}
              <div id="code_meta_shelf" className="p-3 bg-[#111317] border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-[11px]">Location path:</span>
                  <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-sky-400 font-bold border border-slate-800/80">
                    {skeletonCodes[currentFileIndex].path}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300 italic text-[11px]">{skeletonCodes[currentFileIndex].description}</span>
                </div>
                <button
                  id="btn_copy_file"
                  onClick={() => copyToClipboard(skeletonCodes[currentFileIndex].content, skeletonCodes[currentFileIndex].path)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedFile === skeletonCodes[currentFileIndex].path ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copy Dart Source</span>
                    </>
                  )}
                </button>
              </div>

              {/* THE CODE VIEWER DISPLAY */}
              <div id="source_code_viewport" className="flex-1 overflow-auto bg-[#08090C] font-mono text-xs p-5 relative leading-relaxed">
                
                {/* Visual grid watermark representing production-ready guidelines */}
                <div className="absolute top-4 right-4 text-[9px] bg-red-650/10 text-slate-500 font-bold tracking-widest px-2.5 py-1 rounded border border-slate-850 select-none">
                  CLEAN LAYER SOURCE
                </div>

                <pre className="text-slate-300 select-all font-mono whitespace-pre">{skeletonCodes[currentFileIndex].content}</pre>
              </div>

              {/* HISTORIC LOG TELEMETRY AND REALTIME WEB EVENT TRACKER */}
              <div id="live_telemetry_terminal" className="h-[220px] bg-[#0A0B0D] border-t border-slate-800 flex flex-col shrink-0 overflow-hidden">
                <div className="h-10 bg-[#0F1115] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#E53E3E]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Incident Event Stream Log (Realtime telemetry)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">Total logs: {logs.length}</span>
                    <span className="text-slate-800">|</span>
                    <button 
                      onClick={() => setLogs([])}
                      className="text-[10px] text-slate-400 hover:text-white hover:underline font-mono"
                    >
                      Clear Log console
                    </button>
                  </div>
                </div>

                {/* TELEMETRY FEED LIST */}
                <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-2 bg-[#090A0D]">
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                      No active telemetry logged. Use the simulator panel levers to trigger events.
                    </div>
                  ) : (
                    logs.map((log) => {
                      let borderCol = "border-slate-850";
                      let bgCol = "bg-slate-900/10";
                      let textCol = "text-slate-300";
                      
                      if (log.status === "success") {
                        borderCol = "border-emerald-900/50";
                        bgCol = "bg-emerald-950/10";
                        textCol = "text-emerald-400";
                      } else if (log.status === "danger") {
                        borderCol = "border-red-900/50";
                        bgCol = "bg-red-950/10";
                        textCol = "text-red-400 font-bold";
                      } else if (log.status === "info") {
                        borderCol = "border-sky-900/50";
                        bgCol = "bg-sky-950/10";
                        textCol = "text-sky-400";
                      }

                      return (
                        <div key={log.id} className={`border-l-2 p-2 rounded-r flex flex-col gap-1 transition-all ${borderCol} ${bgCol}`}>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-semibold uppercase">{log.type} Event</span>
                            <span className="text-slate-500 italic">{log.timestamp} UTC</span>
                          </div>
                          <p className={textCol}>{log.text}</p>
                          {log.payload && (
                            <pre className="mt-1 bg-black/60 p-1.5 rounded text-[10px] text-slate-400 max-w-full overflow-x-auto select-all leading-tight">
                              {log.payload}
                            </pre>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        </main>

        {/* RIGHT PANE: SENIOR DIGITAL ARCHITECT CHAT BOX */}
        <section id="senior_architect_copilot" className="w-96 border-l border-slate-800 bg-[#0F1115] flex flex-col shrink-0 overflow-hidden">
          
          <div className="p-4 border-b border-slate-800 bg-[#12151B]">
            <div className="flex items-center gap-2">
              <div className="p-1 px-2.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold">
                PRO AI
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Flutter senior architect</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ask implementation details about Clean Architecture pattern protocols, Google Maps cluster configurations, or Riverpod providers.
            </p>
          </div>

          {/* CHAT CHRONOLOGY */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0A0B0F]">
            {chatMessages.map((msg) => {
              const isHeroAI = msg.role === "model";
              return (
                <div key={msg.id} className={`flex flex-col ${isHeroAI ? "items-start" : "items-end"}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mb-1">
                    <span>{isHeroAI ? "Senior Architect Model" : "You (Lead Engineer)"}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div className={`p-3 rounded-xl max-w-[88%] text-xs leading-relaxed ${
                    isHeroAI 
                      ? "bg-[#161922] border border-slate-800 text-slate-200 rounded-tl-none" 
                      : "bg-red-600 text-white rounded-tr-none"
                  }`}>
                    {/* Simplified markdown format with scannability */}
                    <div className="space-y-2 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            {isChatLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E53E3E]" />
                <span className="font-mono italic">Architect is drafting design guidelines...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* QUICK PROMPTS CHIPS */}
          <div className="p-3 bg-black/40 border-t border-slate-800 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">QUICK ARCHITECTURE CONSULTATIONS:</span>
            <div className="flex flex-wrap gap-1.5">
              {querySuggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handlesSubmitChat(undefined, q)}
                  className="text-[10.5px] text-left px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 rounded-md transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT FORM FOR CHAT */}
          <form onSubmit={(e) => handlesSubmitChat(e)} className="p-3 bg-[#0F1115] border-t border-slate-800 flex gap-2 shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask senior mobile engineer..."
              className="flex-1 bg-[#161822] border border-slate-800 hover:border-slate-700 focus:border-red-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isChatLoading || !chatInput.trim()}
              className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-800 disabled:text-slate-500 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </section>

      </div>

      {/* CORE OPERATIONAL STATUS FOOTER */}
      <footer id="hub_footer" className="h-12 bg-black border-t border-slate-800 flex items-center justify-between px-6 shrink-0 select-none">
        <div className="flex gap-8 items-center text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase">Local Database Type:</span>
            <span className="text-slate-300">Drift Reactive on SQLite Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase">Cache Memory Size:</span>
            <span className="text-emerald-400 font-bold">{driftDatabaseSize.toFixed(1)} MB Buffered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase">Volunteer Coordinates Gap:</span>
            <span className="text-amber-400 font-bold">{simulatedVolunteerDistance}m away</span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 italic">
          Clean Architecture Model v1.0.4-production | Build OK
        </div>
      </footer>

    </div>
  );
}
