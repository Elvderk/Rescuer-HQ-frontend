# Rescuer HQ — Mobile Architecture & System Design Document
**Target Runtime:** Flutter (Android/iOS)  
**Author:** Senior Mobile Architect  
**Architecture Pattern:** Feature-First Layered Clean Architecture (Offline-First / Realtime-First)

---

## 1. Feature-First Folder Structure

We organize the mobile codebase using **Feature-Based Packaging**, placing feature boundaries around core product components rather than purely functional dividers. Common code shared among modules is abstracted into a clean, standalone `core` package.

```text
lib/
├── main.dart                      # Application initialization, Zone, crash and platform error handling
├── app.dart                       # Global MaterialApp builder, Theme configuration & responsive bootstrap
├── core/                          # Cross-cutting platform and enterprise utilities
│   ├── database/                  # Drift SQL Database engine, migration strategies, and schemas
│   │   ├── app_database.dart
│   │   ├── tables/                # Modular DB table definitions
│   │   └── connection/            # Platform-specific native connection setup
│   ├── network/                   # Dio client, certificate pinning, retry loops, and interceptors
│   │   ├── dio_client.dart
│   │   ├── interceptors/          # Auth JWT interceptor, logging interceptor, retry interceptor
│   │   └── models/                # ApiValidationError, BaseResponse schemas
│   ├── navigation/                # GoRouter declarations, access gates and routes
│   │   ├── app_router.dart
│   │   └── route_guards.dart      # Role-Based Access Control (RBAC) gates
│   ├── services/                  # Global platform modules
│   │   ├── location_service.dart  # Geolocation tracker and service wrapper
│   │   ├── websocket_service.dart # Realtime socket driver with dynamic connection retry
│   │   ├── sync_service.dart      # Background synchronization orchestrator
│   │   └── media_service.dart     # Camera, microphone, and compressor services
│   └── theme/                     # High contrast color schemes and font matrices
│
└── features/                      # Modular domains (Isolated functional scopes)
    ├── auth/                      # authentication, registration, token verification, session lifecycle
    │   ├── data/                  # AuthApi, AuthRepository, SecureStorageClient
    │   ├── domain/                # User model, AuthState, Role enums
    │   └── presentation/          # LoginScreen, CodeMfaController, Riverpod AuthNotifier
    ├── searches/                  # Active searches and timelines
    │   ├── data/                  # SearchApi, SearchRepository, local search DAO mappings
    │   ├── domain/                # Search status, Event schemas
    │   └── presentation/          # SearchDashboardScreen, TimelineWidgets
    ├── map/                       # Background GPS track pipelines, routing overlays, and cluster indicators
    │   ├── data/                  # MapBoundsRepository, GridPolygonDAO
    │   ├── domain/                # Zone overlays, Coordinate calculations
    │   └── presentation/          # SearchMapScreen, CompassIndicators, SectorAssignments
    ├── chat/                      # Sockets, text, photo, audio record streams, speech-to-text transcription
    │   ├── data/                  # ChatMockApi, MessageDAO
    │   ├── domain/                # Message model, Transcription state, Attachment metadata
    │   └── presentation/          # ChatRoomScreen, AudioRecorderWidget, TranscriptBubble
    └── sos/                       # Urgent emergency sirens, panic state controllers, flash indicators
        ├── data/                  # EmergencyBeaconRepository
        ├── domain/                # SOS state, Battery and telemetry metrics
        └── presentation/          # SOSPanicScreen, FlashBordersWidget, CountdownOverlay
```

---

## 2. State Management Architecture (Riverpod 2.0)

We leverage **Riverpod 2.0** with strict unidirectional properties. We avoid global variables, using `Notifier` and `StateNotifier` containers to maintain immutable states generated with `Freezed`.

```text
                                [ User Actions / UI Triggers ]
                                              │
                                              ▼
                                   [ Riverpod Providers ]
                             (StateNotifierProvider / Notifier)
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [ Rest API Repositories ]                       [ Realtime WebSocket Streams ]
         (Local database vs. Dio Calls)                    (Broadcast Event Consumers)
                      │                                               │
                      ▼                                               ▼
         [ SQLite Local DB / Drift ]                       [ AppState Mutators ]
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              ▼
                                     [ UI Re-rendering ]
```

### Key Provider Classifications
1. **`authProvider (StateNotifierProvider<AuthNotifier, AuthState>)`**  
   Manages session credentials, secure token validation, and current user identity. Emits `unauthenticated` states that trigger `GoRouter` redirection.
2. **`locationNotifierProvider (StateNotifierProvider<LocationNotifier, LocationState>)`**  
   Drives foreground/background coordinate streams. Emits updates both to the WebSocket stream and inserts them into SQLite tables.
3. **`sosNotifierProvider (StateNotifierProvider<SosNotifier, SosState>)`**  
   Tracks emergency panic counts and activates foreground audio/visual alarms.
4. **`syncServiceProvider (Provider<SyncService>)`**  
   Tracks online/offline changes and coordinates local cache transmissions.
5. **`repositoryProviders`**  
   Exposes repository singletons (e.g. `UserRepository`, `SearchRepository`, `ChatRepository`) injected with correct database context.

---

## 3. API Layer Architecture (Dio Client)

The network client is wrapped in a highly-resilient, production-grade `DioClient`. This layer manages HTTP/REST exchanges with strict connection parameters and token rotation interceptors.

```text
       [ App Request ] 
              │
              ▼
   [ Auth Token Present? ] ──► Yes ──► Inject "Authorization: Bearer <Token>"
              │
              ▼
      [ Perform request ] 
              │
              ├──────────────────────────────────────┐
              ▼ (200 SUCCESS)                       ▼ (401 EXPIRED ACCESS TOKEN)
        [ Return Data ]                              │
                                                     ▼
                                        [ Refresh Token Present? ]
                                                     │
                                                     ▼ (Post /auth/refresh)
                                            ┌────────┴────────┐
                                            ▼ (Success)       ▼ (Fail/Expired)
                                     [ Save New Tokens ]   [ Clear Auth State ]
                                            │                 │
                                            ▼                 ▼
                                    [ Replay Requests ]   [ Route to Login ]
```

### Connection and Timeout Profile
- **`connectTimeout`**: 15 seconds. Prevents hanging sockets in poor service ranges.
- **`receiveTimeout`**: 15 seconds.
- **`sendTimeout`**: 15 seconds.

### Token Rotation (Double-Lock Lockout Interceptor)
When a 401 Unauthorized error occurs:
1. The interceptor is locked to prevent nested concurrent token rotation queries.
2. It executes a POST to `/api/v1/auth/refresh` using the stored secure refresh token.
3. If successful, new tokens are stored, the interceptor is unlocked, and any blocked or queued requests are automatically replayed.
4. If token rotation fails, the credentials are wiped from secure storage, and the app triggers redirection to the Login Screen.

---

## 4. WebSocket Layer & Reconnection Strategy

Real-time events are mediated by an event-driven WebSocket service using the robust `web_socket_channel` library.

### Key Capabilities
- **Connection Handshake**: Initiated in secure headers by suffixing `?token=${jwt_token}`.
- **Continuous Heartbeat (Heartbeat Handling)**: Connects a periodic timer that sends a small JSON `{"event": "ping"}` signal every 30 seconds. If the socket does not receive a matching server `{"event": "pong"}` within 10 seconds, the client self-terminates the connection and triggers reconnection logic.
- **Exponential Reconnect Backoff**: When the socket disconnects, the connection attempts are staggered:
  $$\text{Reconnect Delay} = \min(2^{\text{Attempt}} \times 2\text{ seconds}, 60\text{ seconds})$$
- **Stream Event Dispatch Bus**: Deserializes Incoming payloads and routes them to core feature state controllers (e.g., `sos.created`, `chat.message.created`, `user.location.updated`).

---

## 5. Offline-First Architecture

We enforce **Offline-First Resilience**. The application continues working, recording coordinates, caching chats, and updating maps, irrespective of cellular data availability.

```text
                             [ UI Operation Request ]
                                        │
                                        ▼
                           [ Write to Local SQLite ]
                                (First Source)
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                [ Device Online? ]             [ Device Offline? ]
                         │                             │
                         ▼                             ▼
              [ Call Server API Rest ]         [ Cache in Queue DB ]
                         │                             │
                         ▼                             ▼
               [ Success? / Done ]             [ Connection Restored? ]
                         │                             │
                         ▼                             ▼
                [ Update Local Sync ]        [ Sync Engine Flushes Queue ]
```

### Data Synchronization Policies
- **Optimistic Updates**: Elements (such as chat messages or district status changes) are immediately written to local Drift SQLite cache tables with a temporary status (e.g., `sync_state = pending`). The UI renders the state instantly to ensure a smooth, low-latency UI.
- **Persistent Outbox (Retry Queue)**: Actions requiring API shipment (such as sending a chat message or registering a checkpoint) are recorded in the `SyncQueueTable`.
- **Conflict Settlement (Last-Write-Wins and Merge Policies)**:
  - **Location Logs**: Relational timestamps always dominate. There is no conflict since locations are incremental historical log traces.
  - **Districts**: Server values dominate. If a coordinator edits sector boundaries, the local database merges variations using the `updated_at` parameter.
  - **Tasks**: Tasks are merged locally based on state transition stamps. Let the backend act as the single source of truth when overlaps happen.

---

## 6. Local Database Architecture (Drift SQLite)

We choose **Drift (formerly Moor)** as our local relational storage system for robust, fast SQLite-backed transactional mappings.

### Essential Tables
1. **`UsersTable`**: Caches profiles, approval indicators, roles, and contacts.
2. **`SearchesTable`**: Holds coordinates, titles, and active statuses.
3. **`LocationQueueTable`**: Relational queue storing unsynced latitude, longitude, and accuracy tracks while offline.
4. **`ChatQueueTable`**: Stores outgoing offline messages, records, dynamic text strings, and associated target attachments.

### Cache Invalidation Rules
- **Search Metadata**: Re-fetched and updated when pulling details in online mode. Cached entries older than 24 hours are updated dynamically upon entering the dashboard.
- **Live Channels**: Retain up to 200 history logs per room. Excess messages are pruned during startup.

---

## 7. Authentication Flow & Security

Authentication utilizes secure, authenticated, and cryptographically verified **JSON Web Tokens (JWT)**.

```text
1. Startup ──────────► Read Secure Storage ──► Access Token Present?
                                               ├──► Yes ──► Hydrate User State
                                               └──► No ─┬► Redirection Gate
                                                        ▼
2. Login Input ──────► Validate DTO ─────────► POST /api/v1/auth/login
                                                        ├─► 200: Save Tokens ──► Map Route
                                                        └─► Fail: Show validation error
```

### Encryption and Tokens Storage
- Store JWT tokens inside **`FlutterSecureStorage`** (utilizes Keychain on iOS and AES-encrypted SharedPreferences on Android).
- Non-sensitive data (e.g., map user interface configurations and last active search scope ID) are saved inside standard **`SharedPreferences`**.

---

## 8. Maps/GIS Architecture (Google Maps Platform)

Google Maps is customized to run reliably with minimal battery drain.

```text
                      [ Map Screen Initialization ]
                                    │
                                    ▼
                      [ Fetch Local District Polygons ]
                                    │
                                    ├───► Live WebSocket Polygons
                                    │     (Merge and update overlays)
                                    ▼
                      [ Render Base Night Vector Tiles ]
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
          [ Standard Tracking ]               [ SOS Active Alarm ]
           (GPS: high accuracy,                (GPS: best accuracy,
           Interval: 30s)                      Interval: 5s,
                                               Flashing Red Borders,
                                               Blinking Markers)
```

### Core MAP and GIS Capabilities
- **Dynamic Polygons**: Districts and sectors drawn by search coordinators are parsed from standard geoJSON arrays and painted directly on the screen.
- **Marker Clustering**: Solves the performance degradation occurring when rendering hundreds of volunteer coordinate markers simultaneously.
- **SOS Overlay**: Highlights distressed users with glowing red circles and causes their marker positions to blink dynamically.
- **Offline Map Tiles**: Integrates custom device file system tile managers to render baseline maps even in complete radio dead zones.

---

## 9. Media & Speech-to-Text Pipeline (Audio/Video Integration)

To capture and transmit field reports instantly:

1. **Audio Recorder Service**: Encodes raw audio data directly into high-compression `.m4a` or `.ogg` payloads to minimize network bandwidth usage.
2. **Speech-to-Text Integration**: Instantly displays AI translations transcribing the message on the chat screen as soon as the server broadcasts a transcription event over the WebSocket channel.
3. **Background Media Outbox Workers**: High-definition media, search photos, and audio recordings are uploaded using background task managers that resume automatically when communication channels are restored in the field.

---

## 10. Push Notifications (FCM Integration)

Robust system alerts depend on Firebase Cloud Messaging (FCM).

### Alert Classifications
1. **Critical SOS Alerts**: Delivered as prioritized Firebase alerts that bypass system silent/do-not-disturb profiles. They play custom siren sounds and immediately highlight rescue routes.
2. **Silent Background Invalidation**: Informs the local coordination daemon to silently download revised search perimeters or new sector constraints in the background.
3. **Local Action Dispatch**: When a volunteer approaches active hazard sectors or district boundaries, local geofences trigger localized warning messages on the device with zero network dependency.

---

## 11. Navigation Map (GoRouter Declarative Navigation)

We rely on **GoRouter** to enforce strict state-driven route navigation.

```text
/ (App Startup Guards)
 ├── /login (MFA and Entry validation Screen)
 └── /searches (All search operations dashboard)
      ├── /:searchId (Detailed Map View and GPS overlays)
      │    ├── /chat/:roomId (Active Sector & Group chat)
      │    └── /sos (Emergency status dashboard)
```

### Route Protections (RBAC Safeguards)
Routes are guarded dynamically based on authenticated JWT user claims. If a user attempts to access screens restricted to specialized roles (e.g., Coordinator or Director), GoRouter intercepts the route request and redirects them immediately.

---

## 12. Robustness and Reliability Strategy

1. **Global Exception Boundary**: Encapsulates `runApp` within a highly reliable `runZonedGuarded` block. Unhandled framework exceptions are captured, parsed, and logged directly to analytics services.
2. **Dynamic Battery Throttle Controller**:
   - Swaps location monitoring accuracy dynamically based on device battery performance and operational state.
   - If the battery falls below 15%, the system decreases tracking intervals and disables wake locks to preserve utility.
3. **Structured Debug Console Logging**: Replaces standard `print` commands with an internal Logger interface, masking sensitive user data and credentials before logging.

---
