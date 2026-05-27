# Rescuer HQ — Flutter Mobile Coordination Platform

Production-ready mobile architecture and simulation system for missing children search operations and volunteer coordination. Designed with **Flutter**, **Riverpod**, **Freezed**, **Drift SQLite**, and **GoRouter** according to **Clean Architecture** patterns.

This repository hosts both the complete **highly structured Flutter architecture blueprints** and a fully functional, interactive **Web-based Architect Sandbox Hub** that simulates background geolocation, SOS panic events, cellular offline-first queue replication, and real-time WebSocket messaging.

---

## 🏗️ 1. Flutter Mobile Clean Architecture

The mobile application is designed with a **feature-first, clean-layered architecture**. This guarantees strict isolation of business domains, makes code highly testable, and prevents cross-module leakage:

```text
lib/
├── core/                         # Common cross-cutting infrastructure
│   ├── database/                 # Drift SQFlite reactive database tables & migrations
│   ├── navigation/               # App routing via GoRouter with permission-guarded checkups
│   ├── network/                  # Custom Dio robust HTTP/REST client with interceptors
│   └── services/                 # Global modules (Location, WebSockets, Local Sync)
│
└── features/                     # Distinct horizontal feature modules
    ├── auth/                     # JWT registry, secure storage, & registration
    ├── chat/                     # Real-time search chat, speech-to-text, and media sharing
    ├── map/                      # Google Maps widgets, custom dark vectors & clustering
    ├── searches/                 # Active search dashboards & emergency timelines
    └── sos/                      # Panic button trigger & ultra-precision GPS stream
```

### Core Architecture Layers

#### 🧬 State Management (`Riverpod` & `Freezed`)
- Enforces strict unidirectional state flows.
- State is encapsulated in immutable objects annotated with `@freezed` to guarantee thread safety during background iterations.
- Views depend on reactive Riverpod providers (such as `StateNotifierProvider` and `StreamProvider`), ensuring immediate updates without nested `setState` or leaky handlers.

#### 🗄️ Local Database & Persistence (`Drift`)
- Utilizes the reactive SQL-based Drift library compiled over high-speed native platforms (through native C sqlite bindings).
- Manages strict indexes on critical identifiers (e.g. `user_id`, `search_id`) to accelerate geographical proximity lookups.
- Automatically handles schema migrations and supports soft deletes on local audit registers.

#### 🌐 Robust API Client (`Dio`)
- An augmented `Dio` HTTP/REST wrapper that implements specialized request interceptors.
- Automatically catches HTTP `401 Unauthorized` token expiries. It buffers other pending asynchronous queries, initiates a token rotation (`/auth/refresh`) using the secure Refresh Token, and automatically replays failed queries seamlessly.

#### 📡 Real-time WebSocket Protocol
- A thread-authoritative event client using raw `web_socket_channel` wrappers.
- Operates a synchronous 30-second ping/pong heartbeat validation interval.
- Employs an exponential reconnect backoff mechanism (capped at 60s) to restore connections when rescue forces exit deep dead-zones.

---

## 🛠️ 2. Core Skeleton Files (Built-In Blueprint Library)

This project contains pristine, production-ready Dart templates matching the strict Clean Architecture Guidelines. You can view, explore, and copy these source codes within the interactive sandbox UI:

| Dart File Name | Clean Sub-Layer | Functional Summary / Responsibility |
| :--- | :--- | :--- |
| `lib/main.dart` | **Application Entry** | Bootstraps FCM, initiates reactive databases, starts background hooks, and mounts Riverpod `ProviderScope`. |
| `app_router.dart` | **Global Navigation** | Sets up deep linking, declares route hierarchies, and redirects unauthenticated users automatically. |
| `dio_client.dart` | **REST Network client**| Configures timeouts, headers, and intercepts expired sessions to rotate JWT tokens in real-time. |
| `websocket_service.dart`| **Real-time Engine** | Executes socket streaming, filters ping/pong signals, and broadcasts coordinates and chats. |
| `app_database.dart` | **Reactive Drift DB** | Declares persistent tables (Offline location queues, Searches, Users) with indexing policies. |
| `sync_service.dart` | **Sync Pipeline Engine**| Detects dynamic connectivity fluctuations to pack and upload offline location buffers. |
| `location_service.dart` | **Background Tracker** | Adapts background tracking accuracy and polling rates depending on power level profiles. |
| `location_notifier.dart`| **Location View State** | Publishes location updates to WebSockets and buffers them to local SQLite in background states. |
| `sos_notifier.dart` | **SOS Panic Driver** | Elevates location polling to maximum rate, activates foreground alerts, and sends alarms to HQ. |
| `search_map_screen.dart`| **Topography Map UI** | Overlays Google Maps elements with custom dark night-vision parameters and sector polygons. |
| `auth_provider.dart` | **Secure JWT Wrapper**| Holds security claims, decodes bearer signatures, and stores authorization values securely. |

---

## 💻 3. Interactive Web Sandbox Dashboard

To visualize this enterprise mobile system inside the target container environment, the project features a fully loaded **Architect Dashboard**:

1. **Embedded Android Unit Emulator:** A realistic, fully interactive digital simulation of the Rescuer HQ mobile workspace. Observe map overlays, active polygons, and toggle tracking profiles directly.
2. **Realtime Command Console:**
   - **Send Coordinates:** Triggers simulated GPS satellite updates, publishing structured `user.location.updated` JSON payloads onto the WebSocket bus.
   - **Toggle Signal (Cut Signal / Go Online):** Shuts down network connections to simulate offline and remote conditions. The Drift local database automatically queues unsynced elements.
   - **Flush Sync Queue:** Re-establishes network replication to ship queued coordinate packets as batch packages.
   - **SOS Mode:** Triggers deep rescue indicators, spikes GPS tracking speeds to high accuracy, and initiates blinking warnings.
3. **Telemetry Event Terminal:** A live logging engine that traces raw system events, database caching actions, and JSON payloads.
4. **Senior AI Architect Co-Pilot:** A server-side conversational AI trained specifically in Rescuer HQ mobile specifications to discuss design choices, background scheduling, and Riverpod integration.

---

## 🚀 4. How to Run the App (Sandbox Dev Env)

The developer server is ready out of the box inside your container.

### Start the Application

The environment scripts are fully configured in your template:
```bash
# Starts the fast typescript-runner (tsx) for server.ts on port 3000
npm run dev
```

### Live Preview

Navigate to port `3000` via your container web interface or use the provided Development App URL to access the interactive Hub.

### Production Bundling

For deployment, the server compiles into a bundled standalone CommonJS file:
```bash
npm run build
npm start
```

---

## 🛡️ 5. Offline Recovery & Battery Optimization Rules

### Tracking Interval Profiles

The background location tracker automatically changes parameters based on system events to protect volunteer safety and preserve device battery in wilderness operations:

| Profile Name | Triggering Event | GPS Interval | Movement Filter | Active WakeLock | Foreground Alert Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Standard** | Operational Area Entry | 30 seconds | 50 meters | **Enabled** | Standard background rescue update notification. |
| **SOS High-Precision**| Volunteer triggers SOS button| 5 seconds | 5 meters | **Force Active** | Loud alarm notification with live distress signals. |
| **Low-Battery Saver** | Battery drops below 15% | 120 seconds | 200 meters | *Disabled* | Eco-mode active. Battery saver constraints active. |
