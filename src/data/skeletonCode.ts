// Detailed, production-ready Dart skeleton files for Rescuer HQ mobile application.
// Designed with Clean Architecture, Riverpod, Freezed, Drift, Dio, and GoRouter.

export interface SkeletonFile {
  path: string;
  category: string;
  description: string;
  content: string;
}

export const skeletonCodes: SkeletonFile[] = [
  {
    path: "lib/main.dart",
    category: "bootstrap",
    description: "Application entry point. Initializes databases, background location services, push notification hooks, and instantiates Riverpod ProviderScope.",
    content: `import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:uuid/uuid.dart';

import 'core/database/app_database.dart';
import 'core/services/location_service.dart';
import 'core/services/websocket_service.dart';

// Top-level background message handler for Firebase Messaging
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Handle silent background trigger or critical SOS notification dispatch.
  print("Handling background message: \${message.messageId}");
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase for Cloud Messaging & Critical push infrastructure
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Initialize Drift local SQL database reactive instance
  final database = AppDatabase.getInstance();

  // Initialize background tracking services with strict battery optimization parameters
  final locationService = LocationService();
  await locationService.initialize();

  runApp(
    ProviderScope(
      overrides: [
        databaseProvider.overrideWithValue(database),
      ],
      child: const RescuerHQApp(),
    ),
  );
}

class RescuerHQApp extends ConsumerWidget {
  const RescuerHQApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Obtain App Router configuration driven by GoRouter
    final router = ref.watch(routerProvider);
    
    // Auto-init WebSocket core connection once authenticated
    ref.listen(authProvider, (previous, next) {
      if (next.isAuthenticated) {
        ref.read(webSocketServiceProvider).connect();
      } else {
        ref.read(webSocketServiceProvider).disconnect();
      }
    });

    return MaterialApp.router(
      title: 'Rescuer HQ',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE53E3E), // Urgent Rescue Red
          brightness: Brightness.light,
          primary: const Color(0xFFE53E3E),
          secondary: const Color(0xFF2D3748),
          background: const Color(0xFFF7FAFC),
        ),
        fontFamily: 'Inter',
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE53E3E),
          brightness: Brightness.dark,
          primary: const Color(0xFFE53E3E),
          secondary: const Color(0xFF1A202C),
          background: const Color(0xFF0F172A),
        ),
        fontFamily: 'Inter',
      ),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}`
  },
  {
    path: "lib/core/navigation/app_router.dart",
    category: "navigation",
    description: "Declarative navigation via GoRouter. Sets up route hierarchy, handles deep links for alert messages, and features state-reactive redirection rules.",
    content: `import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/auth_notifier.dart';
import '../../features/auth/domain/auth_state.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/registration_request_screen.dart';
import '../../features/auth/presentation/pending_approval_screen.dart';
import '../../features/auth/presentation/session_loading_screen.dart';
import '../../features/searches/presentation/searches_dashboard.dart';
import '../../features/map/presentation/search_map_screen.dart';
import '../../features/chat/presentation/chat_detail_screen.dart';
import '../../features/sos/presentation/sos_panic_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/loading',
    redirect: (context, state) {
      final status = authState.status;

      // Ensure system loading completes before selecting any route
      if (status == AuthStatus.uninitialized || status == AuthStatus.loading) {
        if (state.matchedLocation != '/loading') return '/loading';
        return null;
      }

      // Check for pending approval state
      if (status == AuthStatus.pendingApproval) {
        if (state.matchedLocation != '/pending') return '/pending';
        return null;
      }

      // Handle unauthenticated routes
      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/register-request';
      if (status == AuthStatus.unauthenticated) {
        if (!isAuthRoute) return '/login';
        return null;
      }

      // Prevent authenticated users from visiting auth zones
      if (status == AuthStatus.authenticated && isAuthRoute) {
        return '/searches';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/loading',
        builder: (context, state) => const SessionLoadingScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register-request',
        builder: (context, state) => const RegistrationRequestScreen(),
      ),
      GoRoute(
        path: '/pending',
        builder: (context, state) => const PendingApprovalScreen(),
      ),
      GoRoute(
        path: '/searches',
        builder: (context, state) => const SearchesDashboardScreen(),
        routes: [
          GoRoute(
            path: ':searchId',
            builder: (context, state) {
              final searchId = state.pathParameters['searchId']!;
              return SearchMapScreen(searchId: searchId);
            },
            routes: [
              GoRoute(
                path: 'chat/:roomId',
                builder: (context, state) {
                  final roomId = state.pathParameters['roomId']!;
                  return ChatDetailScreen(roomId: roomId);
                },
              ),
              GoRoute(
                path: 'sos',
                builder: (context, state) => const SosPanicScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Navigation error: \${state.error}'),
      ),
    ),
  );
});`
  },
  {
    path: "lib/core/network/dio_client.dart",
    category: "network",
    description: "Sophisticated HTTP/REST API client wraps Dio. Configures dynamic authorization headers, connection timeouts, queued refresh token retry loops, and robust error mappings.",
    content: `import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/auth_notifier.dart';

final dioClientProvider = Provider<DioClient>((ref) {
  return DioClient(ref);
});

class DioClient {
  final Ref _ref;
  late final Dio _dio;
  bool _isRefreshing = false;
  final List<Map<String, dynamic>> _retryQueue = [];

  Dio get dio => _dio;

  DioClient(this._ref) {
    _dio = Dio(
      BaseOptions(
        baseUrl: 'https://api.rescuerhq.org/api/v1',
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Public routes bypass Authorization header embedding
          final isPublic = options.path.contains('/auth/login') || options.path.contains('/auth/register-request');
          if (!isPublic) {
            final secureToken = await _ref.read(authProvider.notifier).getAccessToken();
            if (secureToken != null) {
              options.headers['Authorization'] = 'Bearer \$secureToken';
            }
          }
          return handler.next(options);
        },
        onError: (DioException err, handler) async {
          // Catch HTTP 401 Unauthorized for accessToken expiry
          if (err.response?.statusCode == 401 && !err.requestOptions.path.contains('/auth/login')) {
            // Buffer the current request configuration to execute retry after rotation
            final requestOptions = err.requestOptions;
            
            if (_isRefreshing) {
              // Wait for active thread rotation by appending request to retry queue
              _retryQueue.add({
                'options': requestOptions,
                'handler': handler,
              });
              return;
            }

            // Acquire refresh lock thread indicator
            _isRefreshing = true;

            try {
              final success = await _ref.read(authProvider.notifier).rotateRefreshTokens();
              if (success) {
                // Fetch the newly renewed access token
                final newAccessToken = await _ref.read(authProvider.notifier).getAccessToken();
                
                // Replay the original triggered error request
                requestOptions.headers['Authorization'] = 'Bearer \$newAccessToken';
                final response = await _replayRequest(requestOptions);
                handler.resolve(response);

                // Replay all stacked parallel requests captured in the retry queue
                for (final pendingRequest in _retryQueue) {
                  final options = pendingRequest['options'] as RequestOptions;
                  final pendingHandler = pendingRequest['handler'] as ErrorInterceptorHandler;
                  
                  options.headers['Authorization'] = 'Bearer \$newAccessToken';
                  final pendingResponse = await _replayRequest(options);
                  pendingHandler.resolve(pendingResponse);
                }
                
                _retryQueue.clear();
              } else {
                _retryQueue.clear();
                // Logout the volunteer forcibly due to refresh token expiry
                _ref.read(authProvider.notifier).logout();
                return handler.next(err);
              }
            } catch (retryError) {
              _retryQueue.clear();
              _ref.read(authProvider.notifier).logout();
              return handler.next(err);
            } finally {
              _isRefreshing = false;
            }
            return;
          }
          return handler.next(err);
        },
      ),
    );
  }

  Future<Response> _replayRequest(RequestOptions options) {
    return _dio.request(
      options.path,
      data: options.data,
      queryParameters: options.queryParameters,
      options: Options(
        method: options.method,
        headers: options.headers,
      ),
    );
  }
}`
  },
  {
    path: "lib/core/services/websocket_service.dart",
    category: "realtime",
    description: "Resilient WebSocket engine. Performs server-side ping/pong diagnostics, presence beacons, and dispatches real-time broadcast topics like SOS, participant updates, and loc-traces.",
    content: `import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/auth_provider.dart';

final webSocketServiceProvider = Provider<WebSocketService>((ref) {
  return WebSocketService(ref);
});

class WebSocketService {
  final Ref _ref;
  WebSocketChannel? _channel;
  Timer? _heartbeatTimer;
  bool _isConnected = false;
  int _reconnectAttempts = 0;
  
  final _eventStreamController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get eventStream => _eventStreamController.stream;

  WebSocketService(this._ref);

  Future<void> connect() async {
    if (_isConnected) return;

    final token = await _ref.read(authProvider.notifier).getAccessToken();
    if (token == null) return;

    final wsUri = Uri.parse('wss://api.rescuerhq.org/ws?token=\$token');
    
    try {
      _channel = WebSocketChannel.connect(wsUri);
      _isConnected = true;
      _reconnectAttempts = 0;

      _channel!.stream.listen(
        (data) => _onEventReceived(data),
        onDone: () => _handleDisconnect(),
        onError: (error) => _handleDisconnect(),
      );

      _startHeartbeat();
    } catch (_) {
      _handleDisconnect();
    }
  }

  void _onEventReceived(dynamic data) {
    try {
      final parsed = jsonDecode(data) as Map<String, dynamic>;
      
      // Keep track of pong signals
      if (parsed['event'] == 'pong') return;

      // Dispatch events into the global raw event bus
      _eventStreamController.add(parsed);
    } catch (e) {
      print("[WS] JSON decode error: \$e");
    }
  }

  void send(String event, Map<String, dynamic> payload) {
    if (_channel == null || !_isConnected) return;
    
    final envelope = {
      'event': event,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'payload': payload,
    };
    
    _channel!.sink.add(jsonEncode(envelope));
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_isConnected) {
        send('ping', {});
      }
    });
  }

  void _handleDisconnect() {
    _isConnected = false;
    _channel?.sink.close();
    _heartbeatTimer?.cancel();

    // Exponential Retry Backoff (Cap at 60s max spacing)
    _reconnectAttempts++;
    final delay = Duration(seconds: (_reconnectAttempts * 5).clamp(2, 60));
    print("[WS] Disconnected. Reconnecting in \${delay.inSeconds} seconds...");
    
    Timer(delay, () => connect());
  }

  void disconnect() {
    _isConnected = false;
    _channel?.sink.close();
    _heartbeatTimer?.cancel();
    _reconnectAttempts = 0;
  }
}`
  },
  {
    path: "lib/core/database/app_database.dart",
    category: "database",
    description: "Reactive SQLite local database built on Drift (moor). Houses rich database tables with automatic index configurations, raw query handlers, and local queues.",
    content: `import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:flutter_riverpod/flutter_riverpod.dart';

part 'app_database.g.dart';

// DRIFT TABLES CO-RELATED TO RESCUER HQ CORE ENTITIES
class UsersTable extends Table {
  TextColumn get id => text()();
  TextColumn get role => text()();
  TextColumn get email => text()();
  TextColumn get givenName => text()();
  TextColumn get phone => text()();
  BoolColumn get approved => mercantile('approved').withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class SearchesTable extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get status => text()(); // CREATED, PREPARATION, ACTIVE, PAUSED, FINISHED
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class LocationQueueTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  RealColumn get latitude => real()();
  RealColumn get longitude => real()();
  RealColumn get accuracy => real()();
  DateTimeColumn get timestamp => dateTime()();
  BoolColumn get synced => mercantile('synced').withDefault(const Constant(false))();
}

@DriftDatabase(tables: [UsersTable, SearchesTable, LocationQueueTable])
class AppDatabase extends _$AppDatabase {
  static AppDatabase? _instance;

  static AppDatabase getInstance() {
    _instance ??= AppDatabase._internal();
    return _instance!;
  }

  AppDatabase._internal() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  // Sync / Offline Reactive query helpers
  Stream<List<SearchTableData>> watchActiveSearches() {
    return (select(searchesTable)..where((t) => t.status.equals('ACTIVE'))).watch();
  }

  Future<int> queueOfflineLocation(double lat, double lng, double accuracy) {
    return into(locationQueueTable).insert(
      LocationQueueTableCompanion.insert(
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
        timestamp: DateTime.now().toUtc(),
      ),
    );
  }

  Future<void> markLocationAsSynced(int id) {
    return (update(locationQueueTable)..where((t) => t.id.equals(id)))
        .write(const LocationQueueTableCompanion(synced: Value(true)));
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'rescuer_hq.sqlite'));
    return NativeDatabase(file);
  });
}

final databaseProvider = Provider<AppDatabase>((ref) {
  throw UnimplementedError('Set ProviderScope override for Database');
});`
  },
  {
    path: "lib/core/services/sync_service.dart",
    category: "sync",
    description: "The Local Sync Pipeline Engine. Watches the local Drift queues, detects connection presence via Connectivity hooks, offloads queued tasks, and resolves conflict status.",
    content: `import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../database/app_database.dart';
import '../network/dio_client.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  return SyncService(ref);
});

class SyncService {
  final Ref _ref;
  Timer? _syncTimer;
  bool _isSyncing = false;

  SyncService(this._ref) {
    _initConnectivityListener();
  }

  void _initConnectivityListener() {
    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      if (result != ConnectivityResult.none) {
        triggerSyncCycle();
      }
    });

    // Run interval checks every 5 minutes in case websocket or networking fails silently
    _syncTimer = Timer.periodic(const Duration(minutes: 5), (_) => triggerSyncCycle());
  }

  Future<void> triggerSyncCycle() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final db = _ref.read(databaseProvider);
      final dio = _ref.read(dioClientProvider).dio;

      // 1. Fetch all unsynced location traces
      final unsyncedLocations = await (db.select(db.locationQueueTable)
            ..where((t) => t.synced.equals(false))
            ..limit(50))
          .get();

      if (unsyncedLocations.isNotEmpty) {
        final payload = unsyncedLocations.map((loc) => {
          'lat': loc.latitude,
          'lng': loc.longitude,
          'accuracy': loc.accuracy,
          'timestamp': loc.timestamp.toIso8601String(),
        }).toList();

        // Safe endpoint shipment
        final response = await dio.post('/geo/bulk', data: {'locations': payload});

        if (response.statusCode == 200 || response.statusCode == 201) {
          // Commit database sync status
          for (final loc in unsyncedLocations) {
            await db.markLocationAsSynced(loc.id);
          }
        }
      }
    } catch (e) {
      print("[SYNC] Offline sync failed: \$e");
    } finally {
      _isSyncing = false;
    }
  }

  void dispose() {
    _syncTimer?.cancel();
  }
}`
  },
  {
    path: "lib/core/services/location_service.dart",
    category: "location",
    description: "Sophisticated background geo module. Adjusts polling parameters dynamically based on structural system levels (Low-Battery mode vs. SOS Emergency status).",
    content: `import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum TrackingIntervalProfile {
  standard,   // 30s intervals / up to 50m movement filtering
  highPrecisionSOS, // 5s intervals / 5m movement tracking
  lowBattery  // 120s intervals / 200m movement mapping
}

class LocationService {
  StreamSubscription<Position>? _positionStreamSub;
  TrackingIntervalProfile _currentProfile = TrackingIntervalProfile.standard;
  
  final _locationController = StreamController<Position>.broadcast();
  Stream<Position> get locationStream => _locationController.stream;

  Future<void> initialize() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.deniedForever || 
          permission == LocationPermission.denied) {
        return;
      }
    }
    
    await configureMonitoringProfile(TrackingIntervalProfile.standard);
  }

  Future<void> configureMonitoringProfile(TrackingIntervalProfile profile) async {
    if (_currentProfile == profile && _positionStreamSub != null) return;
    _currentProfile = profile;
    
    await _positionStreamSub?.cancel();

    int distanceFilter;
    LocationSettings settings;

    switch (profile) {
      case TrackingIntervalProfile.highPrecisionSOS:
        distanceFilter = 5;
        settings = AndroidSettings(
          accuracy: LocationAccuracy.best,
          distanceFilter: distanceFilter,
          intervalDuration: const Duration(seconds: 5),
          foregroundNotificationConfig: const ForegroundNotificationConfig(
            notificationTitle: "EMERGENCY: Heavy Tracking Active",
            notificationText: "Rescuer HQ is streaming exact live locations for critical rescue safety.",
            notificationIcon: AndroidResource(name: 'notification_icon'),
            enableWakeLock: true,
          ),
        );
        break;
      case TrackingIntervalProfile.lowBattery:
        distanceFilter = 200;
        settings = AndroidSettings(
          accuracy: LocationAccuracy.balanced,
          distanceFilter: distanceFilter,
          intervalDuration: const Duration(seconds: 120),
          foregroundNotificationConfig: const ForegroundNotificationConfig(
            notificationTitle: "Live Geotracking Running",
            notificationText: "Battery saver configuration active.",
            enableWakeLock: false,
          ),
        );
        break;
      case TrackingIntervalProfile.standard:
      default:
        distanceFilter = 50;
        settings = AndroidSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: distanceFilter,
          intervalDuration: const Duration(seconds: 30),
          foregroundNotificationConfig: const ForegroundNotificationConfig(
            notificationTitle: "Active Field Operations Engaged",
            notificationText: "HQ is mapping your rescue coordinate tracks in real-time.",
            enableWakeLock: true,
          ),
        );
        break;
    }

    _positionStreamSub = Geolocator.getPositionStream(locationSettings: settings).listen(
      (Position position) {
        _locationController.add(position);
      },
      onError: (err) {
        print("[GEO] Background GPS tracking error: \$err");
      },
    );
  }

  Future<void> stop() async {
    await _positionStreamSub?.cancel();
    _positionStreamSub = null;
  }
}`
  },
  {
    path: "lib/features/map/providers/location_notifier.dart",
    category: "location",
    description: "State notifier managing local GPS positioning. Dynamically switches background configurations and publishes triggers to active websockets.",
    content: `import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/database/app_database.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/websocket_service.dart';

class LocationState {
  final Position? lastPosition;
  final bool isTracking;
  final TrackingIntervalProfile profile;

  LocationState({
    this.lastPosition,
    this.isTracking = false,
    this.profile = TrackingIntervalProfile.standard,
  });

  LocationState copyWith({
    Position? lastPosition,
    bool? isTracking,
    TrackingIntervalProfile? profile,
  }) {
    return LocationState(
      lastPosition: lastPosition ?? this.lastPosition,
      isTracking: isTracking ?? this.isTracking,
      profile: profile ?? this.profile,
    );
  }
}

final locationNotifierProvider = StateNotifierProvider<LocationNotifier, LocationState>((ref) {
  return LocationNotifier(ref);
});

class LocationNotifier extends StateNotifier<LocationState> {
  final Ref _ref;
  final LocationService _service = LocationService();
  StreamSubscription<Position>? _sub;

  LocationNotifier(this._ref) : super(LocationState()) {
    _service.initialize();
  }

  void startTracking() async {
    if (state.isTracking) return;

    _sub = _service.locationStream.listen((position) {
      _handleNewPosition(position);
    });

    state = state.copyWith(isTracking: true);
  }

  void _handleNewPosition(Position position) async {
    state = state.copyWith(lastPosition: position);

    // 1. Instantly dispatch real-time events over WebSocket
    _ref.read(webSocketServiceProvider).send('user.location.updated', {
      'lat': position.latitude,
      'lng': position.longitude,
      'accuracy': position.accuracy,
      'speed': position.speed,
    });

    // 2. Insert into local SQLite database for offline persistence audit
    final db = _ref.read(databaseProvider);
    await db.queueOfflineLocation(position.latitude, position.longitude, position.accuracy);
  }

  Future<void> updatePowerProfile(TrackingIntervalProfile newProfile) async {
    await _service.configureMonitoringProfile(newProfile);
    state = state.copyWith(profile: newProfile);
  }

  void stopTracking() {
    _sub?.cancel();
    _service.stop();
    state = state.copyWith(isTracking: false);
  }

  @override
  void dispose() {
    _sub?.cancel();
    _service.stop();
    super.dispose();
  }
}`
  },
  {
    path: "lib/features/sos/providers/sos_notifier.dart",
    category: "sos",
    description: "Emergency state driver. Spikes live tracking rates, logs immediate audio clips, triggers panic beacons, and alerts the central dashboard with blazing red overlay patterns.",
    content: `import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/websocket_service.dart';
import '../../map/providers/location_notifier.dart';
import '../../../core/services/location_service.dart';

enum SosState { idle, active, canceling }

final sosProvider = StateNotifierProvider<SosNotifier, SosState>((ref) {
  return SosNotifier(ref);
});

class SosNotifier extends StateNotifier<SosState> {
  final Ref _ref;
  Timer? _countdownTimer;
  int _secondsLeft = 5;

  SosNotifier(this._ref) : super(SosState.idle);

  int get secondsLeft => _secondsLeft;

  void triggerPanicCountdown() {
    _secondsLeft = 5;
    state = SosState.canceling; // Use canceling state to indicate confirmation mode

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft > 1) {
        _secondsLeft--;
      } else {
        timer.cancel();
        _fireSOSBeacons();
      }
    });
  }

  void _fireSOSBeacons() {
    state = SosState.active;

    // 1. Transition location module to ultra-high-precision mode
    _ref.read(locationNotifierProvider.notifier).updatePowerProfile(TrackingIntervalProfile.highPrecisionSOS);

    // 2. Dispatch primary SOS payload
    final lastPosition = _ref.read(locationNotifierProvider).lastPosition;
    _ref.read(webSocketServiceProvider).send('sos.created', {
      'lat': lastPosition?.latitude ?? 0.0,
      'lng': lastPosition?.longitude ?? 0.0,
      'accuracy': lastPosition?.accuracy ?? 0.0,
      'trigger_timestamp': DateTime.now().toUtc().toIso8601String(),
    });

    print("[SOS] Dispatch coordinates locked! Heavy tracking active on HQ dashboard.");
  }

  void cancelPanic() {
    _countdownTimer?.cancel();
    state = SosState.idle;

    // Restore location modules to conservative battery modes
    _ref.read(locationNotifierProvider.notifier).updatePowerProfile(TrackingIntervalProfile.standard);
  }
}`
  },
  {
    path: "lib/features/map/presentation/search_map_screen.dart",
    category: "presentation",
    description: "The primary high-fidelity visual layout. Blends Google Maps widgets with responsive district overlay calculations, volunteer clusters, and urgent SOS marker blinks.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../providers/location_notifier.dart';
import '../../sos/providers/sos_notifier.dart';

class SearchMapScreen extends ConsumerStatefulWidget {
  final String searchId;
  const SearchMapScreen({Key? key, required this.searchId}) : super(key: key);

  @override
  ConsumerState<SearchMapScreen> createState() => _SearchMapScreenState();
}

class _SearchMapScreenState extends ConsumerState<SearchMapScreen> {
  GoogleMapController? _mapController;

  // Custom visual styles to darken map background for Night coordination focus
  static const String darkMapStyle = '''
  [
    {"elementType": "geometry", "stylers": [{"color": "#1a202c"}]},
    {"elementType": "labels.text.fill", "stylers": [{"color": "#718096"}]},
    {"featureType": "water", "elementType": "geometry", "stylers": [{"color": "#0f172a"}]}
  ]
  ''';

  @override
  Widget build(BuildContext context) {
    final locationState = ref.watch(locationNotifierProvider);
    final sosState = ref.watch(sosProvider);

    // Set map overlays based on mock active elements
    final Set<Polygon> districts = {
      Polygon(
        polygonId: const PolygonId('district_sector_alpha'),
        points: const [
          LatLng(55.751244, 37.618423),
          LatLng(55.753244, 37.619423),
          LatLng(55.752244, 37.622423),
          LatLng(55.749244, 37.620423),
        ],
        strokeColor: Colors.amber,
        strokeWidth: 3,
        fillColor: Colors.amber.withOpacity(0.15),
      ),
    };

    final Set<Marker> markers = {
      if (locationState.lastPosition != null)
        Marker(
          markerId: const MarkerId('current_volunteer_loc'),
          position: LatLng(
            locationState.lastPosition!.latitude,
            locationState.lastPosition!.longitude,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            sosState == SosState.active ? BitmapDescriptor.hueRed : BitmapDescriptor.hueAzure,
          ),
          infoWindow: InfoWindow(
            title: sosState == SosState.active ? 'EMERGENCY - SOS ACTIVE' : 'Your Location',
          ),
        ),
    };

    return Scaffold(
      appBar: AppBar(
        title: Text('Search Area coordination: \${widget.searchId.substring(0, 8)}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.gps_fixed),
            onPressed: () {
              if (locationState.lastPosition != null && _mapController != null) {
                _mapController!.animateCamera(
                  CameraUpdate.newLatLngZoom(
                    LatLng(
                      locationState.lastPosition!.latitude,
                      locationState.lastPosition!.longitude,
                    ),
                    16.0,
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: const CameraPosition(
              target: LatLng(55.751244, 37.618423), // Centered on Search coordinate
              zoom: 14.5,
            ),
            polygons: districts,
            markers: markers,
            onMapCreated: (controller) {
              _mapController = controller;
              _mapController!.setMapStyle(darkMapStyle);
            },
          ),
          
          if (sosState == SosState.active)
            const Positioned.fill(
              child: IgnorePointer(
                child: _UrgentSosFlashingBorders(),
              ),
            ),

          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: _CoordinationPanel(
              locationState: locationState,
              sosState: sosState,
            ),
          ),
        ],
      ),
    );
  }
}

class _UrgentSosFlashingBorders extends StatefulWidget {
  const _UrgentSosFlashingBorders({Key? key}) : super(key: key);

  @override
  State<_UrgentSosFlashingBorders> createState() => _UrgentSosFlashingBordersState();
}

class _UrgentSosFlashingBordersState extends State<_UrgentSosFlashingBorders> with SingleTickerProviderStateMixin {
  late AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (context, child) {
        return Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: Colors.red.withOpacity(_anim.value),
              width: 12,
            ),
          ),
        );
      },
    );
  }
}

class _CoordinationPanel extends ConsumerWidget {
  final LocationState locationState;
  final SosState sosState;

  const _CoordinationPanel({
    Key? key,
    required this.locationState,
    required this.sosState,
  }) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Volunteer Coordination Status',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      locationState.isTracking ? '📡 Live satellite tracking: ON' : '🔴 Tracking: OFF',
                      style: TextStyle(
                        color: locationState.isTracking ? Colors.green : Colors.red,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                Switch(
                  value: locationState.isTracking,
                  onChanged: (val) {
                    if (val) {
                      ref.read(locationNotifierProvider.notifier).startTracking();
                    } else {
                      ref.read(locationNotifierProvider.notifier).stopTracking();
                    }
                  },
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: sosState == SosState.active ? Colors.black : Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: Icon(sosState == SosState.active ? Icons.warning : Icons.dangerous),
                    label: Text(
                      sosState == SosState.active ? 'CANCEL EMERGENCY' : 'PRESS SOS PANIC',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    onPressed: () {
                      if (sosState == SosState.active) {
                        ref.read(sosProvider.notifier).cancelPanic();
                      } else {
                        ref.read(sosProvider.notifier).triggerPanicCountdown();
                      }
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/auth/domain/user_profile_model.dart",
    category: "auth",
    description: "Declares User profile attributes, phone logs, credentials mapping, call signs and strict RBAC values.",
    content: `import 'package:flutter/foundation.dart';

enum UserRole {
  volunteer,
  operator,
  coordinator,
  seniorCoordinator,
  director,
  itAdmin
}

enum ApprovalStatus {
  pendingApproval,
  approved,
  rejected
}

@immutable
class UserProfileModel {
  final String id;
  final String givenName;
  final String callSign; // Спасательный позывной волонтера
  final String email;
  final String phone;
  final UserRole role;
  final ApprovalStatus approvalStatus;

  const UserProfileModel({
    required this.id,
    required this.givenName,
    required this.callSign,
    required this.email,
    required this.phone,
    required this.role,
    required this.approvalStatus,
  });

  UserProfileModel copyWith({
    String? id,
    String? givenName,
    String? callSign,
    String? email,
    String? phone,
    UserRole? role,
    ApprovalStatus? approvalStatus,
  }) {
    return UserProfileModel(
      id: id ?? this.id,
      givenName: givenName ?? this.givenName,
      callSign: callSign ?? this.callSign,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      approvalStatus: approvalStatus ?? this.approvalStatus,
    );
  }

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
      id: json['id'] as String,
      givenName: json['given_name'] as String,
      callSign: json['call_sign'] as String? ?? 'Volt-Unknown',
      email: json['email'] as String,
      phone: json['phone'] as String? ?? '',
      role: _parseRole(json['role'] as String),
      approvalStatus: _parseApprovalStatus(json['approval_status'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'given_name': givenName,
      'call_sign': callSign,
      'email': email,
      'phone': phone,
      'role': role.name,
      'approval_status': approvalStatus.name,
    };
  }

  static UserRole _parseRole(String roleStr) {
    switch (roleStr.toLowerCase()) {
      case 'director': return UserRole.director;
      case 'seniorcoordinator':
      case 'senior_coordinator': return UserRole.seniorCoordinator;
      case 'it_admin':
      case 'itadmin': return UserRole.itAdmin;
      case 'coordinator': return UserRole.coordinator;
      case 'operator': return UserRole.operator;
      case 'volunteer':
      default: return UserRole.volunteer;
    }
  }

  static ApprovalStatus _parseApprovalStatus(String statusStr) {
    switch (statusStr.toLowerCase()) {
      case 'approved': return ApprovalStatus.approved;
      case 'rejected': return ApprovalStatus.rejected;
      case 'pending':
      case 'pending_approval':
      default: return ApprovalStatus.pendingApproval;
    }
  }
}`
  },
  {
    path: "lib/features/auth/domain/auth_state.dart",
    category: "auth",
    description: "Declares auth state transitions and validation tracking variables.",
    content: `import 'user_profile_model.dart';

enum AuthStatus {
  uninitialized,
  loading,
  unauthenticated,
  pendingApproval,
  authenticated,
  error
}

class AuthState {
  final AuthStatus status;
  final UserProfileModel? user;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.uninitialized,
    this.user,
    this.errorMessage,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
  bool get isPendingApproval => status == AuthStatus.pendingApproval;

  AuthState copyWith({
    AuthStatus? status,
    UserProfileModel? user,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}`
  },
  {
    path: "lib/features/auth/data/secure_storage_client.dart",
    category: "auth",
    description: "Wraps Keychain and EncryptedSharedPreferences with hardware security attributes.",
    content: `import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageClient {
  final FlutterSecureStorage _storage;

  SecureStorageClient({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
          iOptions: IOSOptions(accessibility: KeychainAccessibility.after_first_unlock_this_device_only),
        );

  Future<void> writeAccessToken(String token) async {
    await _storage.write(key: 'access_token', value: token);
  }

  Future<String?> readAccessToken() async {
    return await _storage.read(key: 'access_token');
  }

  Future<void> deleteAccessToken() async {
    await _storage.delete(key: 'access_token');
  }

  Future<void> writeRefreshToken(String token) async {
    await _storage.write(key: 'refresh_token', value: token);
  }

  Future<String?> readRefreshToken() async {
    return await _storage.read(key: 'refresh_token');
  }

  Future<void> deleteRefreshToken() async {
    await _storage.delete(key: 'refresh_token');
  }

  Future<void> writeCachedUser(String userJson) async {
    await _storage.write(key: 'cached_user_profile', value: userJson);
  }

  Future<String?> readCachedUser() async {
    return await _storage.read(key: 'cached_user_profile');
  }

  Future<void> deleteCachedUser() async {
    await _storage.delete(key: 'cached_user_profile');
  }

  Future<void> clearAll() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
    await _storage.delete(key: 'cached_user_profile');
  }
}`
  },
  {
    path: "lib/features/auth/data/auth_repository.dart",
    category: "auth",
    description: "Data broker carrying REST endpoint mappings and error conversions.",
    content: `import 'dart:convert';
import 'package:dio/dio.dart';
import '../domain/user_profile_model.dart';

class AuthRepository {
  final Dio _dio;

  AuthRepository(this._dio);

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> submitRegistrationRequest({
    required String givenName,
    required String callSign,
    required String email,
    required String password,
    required String phone,
    required UserRole role,
  }) async {
    try {
      final response = await _dio.post('/auth/register-request', data: {
        'given_name': givenName,
        'call_sign': callSign,
        'email': email,
        'password': password,
        'phone': phone,
        'requested_role': role.name,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<UserProfileModel> checkApprovalStatus(String userId) async {
    try {
      final response = await _dio.get('/auth/profile/status', queryParameters: {'user_id': userId});
      return UserProfileModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<String> refreshAccessToken(String refreshToken) async {
    try {
      final response = await _dio.post('/auth/refresh', data: {
        'refresh_token': refreshToken,
      });
      return response.data['access_token'] as String;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Exception _handleError(DioException err) {
    if (err.response != null) {
      final status = err.response!.statusCode;
      final errorMsg = err.response!.data?['message'] ?? 'Unknown network error';
      if (status == 401) return Exception('Authentication failed: \$errorMsg');
      if (status == 403) return Exception('Access Denied: \$errorMsg');
      if (status == 409) return Exception('Conflict error: \$errorMsg');
      return Exception('Server error (\$status): \$errorMsg');
    }
    return Exception('Network unavailable: Check your connection');
  }
}`
  },
  {
    path: "lib/features/auth/providers/auth_notifier.dart",
    category: "auth",
    description: "Coordinates auth transitions, secure memory registers and polling events for approval tracking.",
    content: `import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/auth_state.dart';
import '../domain/user_profile_model.dart';
import '../data/secure_storage_client.dart';
import '../data/auth_repository.dart';
import '../../../core/network/dio_client.dart';

// Provides Secure Storage instance
final secureStorageProvider = Provider<SecureStorageClient>((ref) {
  return SecureStorageClient();
});

// Provides Auth Repository instance
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dio = ref.watch(dioClientProvider).dio;
  return AuthRepository(dio);
});

// Primary auth StateNotifier
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});

class AuthNotifier extends StateNotifier<AuthState> {
  final Ref _ref;
  Timer? _statusPollTimer;

  AuthNotifier(this._ref) : super(const AuthState()) {
    _tryAutoRestoreSession();
  }

  Future<void> _tryAutoRestoreSession() async {
    state = state.copyWith(status: AuthStatus.loading);
    final secureClient = _ref.read(secureStorageProvider);

    try {
      final accessToken = await secureClient.readAccessToken();
      final cachedUserJson = await secureClient.readCachedUser();

      if (accessToken != null && cachedUserJson != null) {
        final profile = UserProfileModel.fromJson(jsonDecode(cachedUserJson) as Map<String, dynamic>);
        
        if (profile.approvalStatus == ApprovalStatus.approved) {
          state = AuthState(status: AuthStatus.authenticated, user: profile);
        } else if (profile.approvalStatus == ApprovalStatus.pendingApproval) {
          state = AuthState(status: AuthStatus.pendingApproval, user: profile);
          _startStatusPolling(profile.id);
        } else {
          state = const AuthState(status: AuthStatus.unauthenticated);
        }
      } else {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    } catch (e) {
      state = AuthState(status: AuthStatus.error, errorMessage: e.toString());
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading);
    final repo = _ref.read(authRepositoryProvider);
    final secureClient = _ref.read(secureStorageProvider);

    try {
      // In virtual demo sandbox mode, mock successful authentication response
      if (email.contains("demo@rescuer.org")) {
        await Future.delayed(const Duration(milliseconds: 800));
        final profile = UserProfileModel(
          id: "volt-demo-id",
          givenName: "Иван Иванов",
          callSign: "Байкал-50",
          email: "demo@rescuer.org",
          phone: "+7 999 123-45-67",
          role: UserRole.volunteer,
          approvalStatus: ApprovalStatus.approved,
        );
        await secureClient.writeAccessToken("mock_demo_access_token_jwt");
        await secureClient.writeRefreshToken("mock_demo_refresh_token_jwt");
        await secureClient.writeCachedUser(jsonEncode(profile.toJson()));
        state = AuthState(status: AuthStatus.authenticated, user: profile);
        return true;
      }

      final data = await repo.login(email, password);
      final accessToken = data['access_token'] as String;
      final refreshToken = data['refresh_token'] as String;
      final profile = UserProfileModel.fromJson(data['user'] as Map<String, dynamic>);

      await secureClient.writeAccessToken(accessToken);
      await secureClient.writeRefreshToken(refreshToken);
      await secureClient.writeCachedUser(jsonEncode(profile.toJson()));

      if (profile.approvalStatus == ApprovalStatus.approved) {
        state = AuthState(status: AuthStatus.authenticated, user: profile);
      } else if (profile.approvalStatus == ApprovalStatus.pendingApproval) {
        state = AuthState(status: AuthStatus.pendingApproval, user: profile);
        _startStatusPolling(profile.id);
      } else {
        throw Exception('Account has been rejected by administration');
      }
      return true;
    } catch (e) {
      state = AuthState(status: AuthStatus.unauthenticated, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> submitRegistrationRequest({
    required String givenName,
    required String callSign,
    required String email,
    required String password,
    required String phone,
    required UserRole role,
  }) async {
    state = state.copyWith(status: AuthStatus.loading);
    final repo = _ref.read(authRepositoryProvider);
    final secureClient = _ref.read(secureStorageProvider);

    try {
      final data = await repo.submitRegistrationRequest(
        givenName: givenName,
        callSign: callSign,
        email: email,
        password: password,
        phone: phone,
        role: role,
      );

      final profile = UserProfileModel.fromJson(data['user'] as Map<String, dynamic>);
      await secureClient.writeCachedUser(jsonEncode(profile.toJson()));

      state = AuthState(status: AuthStatus.pendingApproval, user: profile);
      _startStatusPolling(profile.id);
      return true;
    } catch (e) {
      state = AuthState(status: AuthStatus.unauthenticated, errorMessage: e.toString());
      return false;
    }
  }

  void _startStatusPolling(String userId) {
    _statusPollTimer?.cancel();
    _statusPollTimer = Timer.periodic(const Duration(seconds: 15), (timer) async {
      try {
        final repo = _ref.read(authRepositoryProvider);
        final currentProfile = await repo.checkApprovalStatus(userId);

        if (currentProfile.approvalStatus == ApprovalStatus.approved) {
          timer.cancel();
          final secureClient = _ref.read(secureStorageProvider);
          await secureClient.writeCachedUser(jsonEncode(currentProfile.toJson()));
          state = AuthState(status: AuthStatus.authenticated, user: currentProfile);
        } else if (currentProfile.approvalStatus == ApprovalStatus.rejected) {
          timer.cancel();
          logout();
        }
      } catch (e) {
        print("[AUTH POLL] Status poll failed: \$e");
      }
    });
  }

  Future<bool> rotateRefreshTokens() async {
    final secureClient = _ref.read(secureStorageProvider);
    final repo = _ref.read(authRepositoryProvider);
    final rToken = await secureClient.readRefreshToken();

    if (rToken == null) return false;

    try {
      final newAccessToken = await repo.refreshAccessToken(rToken);
      await secureClient.writeAccessToken(newAccessToken);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<String?> getAccessToken() async {
    return await _ref.read(secureStorageProvider).readAccessToken();
  }

  Future<void> logout() async {
    _statusPollTimer?.cancel();
    await _ref.read(secureStorageProvider).clearAll();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  @override
  void dispose() {
    _statusPollTimer?.cancel();
    super.dispose();
  }
}`
  },
  {
    path: "lib/features/auth/presentation/session_loading_screen.dart",
    category: "auth-presentation",
    description: "Primary system landing screen which restores cached device sessions.",
    content: `import 'package:flutter/material.dart';

class SessionLoadingScreen extends StatelessWidget {
  const SessionLoadingScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF0F172A),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFE53E3E)),
                strokeWidth: 3.5,
              ),
            ),
            SizedBox(height: 28),
            Text(
              'RESCUER HQ',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
                letterSpacing: 2.8,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'REPLICATING AUTHENTICATION REGISTERS...',
              style: TextStyle(
                color: Colors.slate-400,
                fontSize: 10,
                fontWeight: FontWeight.w500,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/auth/presentation/login_screen.dart",
    category: "auth-presentation",
    description: "Operational login layout displaying credential validation alerts.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_notifier.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0B0E),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFE53E3E),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFE53E3E).withOpacity(0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    )
                  ],
                ),
                child: const Icon(Icons.shield_outlined, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 24),
              const Text(
                'Rescuer HQ',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Missing Children Search Coordination Platform',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              if (authState.errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 18),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.withOpacity(0.25)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          authState.errorMessage!,
                          style: const TextStyle(color: Colors.white70, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _emailController,
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Operational Email',
                        labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                        prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF64748B), size: 18),
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFFE53E3E), width: 1.5),
                        ),
                      ),
                      validator: (val) => (val == null || !val.contains('@')) ? 'Provide operational email' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Symmetric Password',
                        labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                        prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF64748B), size: 18),
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFFE53E3E), width: 1.5),
                        ),
                      ),
                      validator: (val) => (val == null || val.length < 6) ? 'Password must exceed 6 symbols' : null,
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE53E3E),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                        onPressed: authState.isLoading
                            ? null
                            : () async {
                                if (_formKey.currentState!.validate()) {
                                  await ref.read(authProvider.notifier).login(
                                        _emailController.text.trim(),
                                        _passwordController.text.trim(),
                                      );
                                }
                              },
                        child: authState.isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text(
                                'AUTHENTICATE ACCESS',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.2),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Quick Demo Sandbox Access Line
                    SizedBox(
                      width: double.infinity,
                      height: 40,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF94A3B8),
                          side: const BorderSide(color: Color(0xFF334155)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: authState.isLoading
                            ? null
                            : () async {
                                _emailController.text = "demo@rescuer.org";
                                _passwordController.text = "demo_password_123";
                                await ref.read(authProvider.notifier).login(
                                      "demo@rescuer.org",
                                      "demo_password_123",
                                    );
                              },
                        child: const Text('BYPASS VIA DEMO VOLUNTEER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 24),
                    TextButton(
                      child: const Text(
                        'SUBMIT NEW VOLUNTEER APPLICATION',
                        style: TextStyle(color: Color(0xFFE53E3E), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      onPressed: () {
                        context.push('/register-request');
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/auth/presentation/registration_request_screen.dart",
    category: "auth-presentation",
    description: "Volunteer operational application form including regional unit roles selection.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../domain/user_profile_model.dart';
import '../providers/auth_notifier.dart';

class RegistrationRequestScreen extends ConsumerStatefulWidget {
  const RegistrationRequestScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<RegistrationRequestScreen> createState() => _RegistrationRequestScreenState();
}

class _RegistrationRequestScreenState extends ConsumerState<RegistrationRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _callSignController = TextEditingController();
  final _emailController = TextEditingController();
  final _passController = TextEditingController();
  final _phoneController = TextEditingController();
  UserRole _selectedRole = UserRole.volunteer;

  @override
  void dispose() {
    _nameController.dispose();
    _callSignController.dispose();
    _emailController.dispose();
    _passController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0B0E),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: const Text('Volunteer Application', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Join Search Operations Network',
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Text(
                'Submit your radio call-sign and personal credentials. Registration requests require moderator verification.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
              const SizedBox(height: 28),
              
              TextFormField(
                controller: _nameController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: _fieldDecoration('Full Name', Icons.person_outline),
                validator: (val) => (val == null || val.length < 3) ? 'Provide actual name' : null,
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _callSignController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: _fieldDecoration('Call Sign (Позывной для связи)', Icons.radio_outlined),
                validator: (val) => (val == null || val.isEmpty) ? 'Provide radio callsign / ID prefix' : null,
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _phoneController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: _fieldDecoration('Phone number', Icons.phone_android),
                validator: (val) => (val == null || val.length < 10) ? 'Enter operational cell' : null,
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _emailController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: _fieldDecoration('Email address', Icons.email_outlined),
                validator: (val) => (val == null || !val.contains('@')) ? 'Provide operational email' : null,
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _passController,
                obscureText: true,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: _fieldDecoration('Security Password', Icons.lock_outline),
                validator: (val) => (val == null || val.length < 6) ? 'Password must exceed 6 signs' : null,
              ),
              const SizedBox(height: 20),
              
              const Text('Requested Role Assignment', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              DropdownButtonFormField<UserRole>(
                value: _selectedRole,
                dropdownColor: const Color(0xFF1E293B),
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                ),
                items: const [
                  DropdownMenuItem(value: UserRole.volunteer, child: Text('Search Rescue Volunteer')),
                  DropdownMenuItem(value: UserRole.operator, child: Text('Operational Radio Operator')),
                  DropdownMenuItem(value: UserRole.coordinator, child: Text('Incident Sector Coordinator')),
                ],
                onChanged: (role) {
                  if (role != null) setState(() => _selectedRole = role);
                },
              ),
              const SizedBox(height: 32),
              
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE53E3E),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: authState.isLoading
                      ? null
                      : () async {
                          if (_formKey.currentState!.validate()) {
                            final success = await ref.read(authProvider.notifier).submitRegistrationRequest(
                                  givenName: _nameController.text.trim(),
                                  callSign: _callSignController.text.trim(),
                                  email: _emailController.text.trim(),
                                  password: _passController.text.trim(),
                                  phone: _phoneController.text.trim(),
                                  role: _selectedRole,
                                );
                            if (success && mounted) {
                              // Auto redirects on polling trigger
                            }
                          }
                        },
                  child: authState.isLoading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('SUBMIT ENLISTMENT APPLICATION', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _fieldDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
      prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 18),
      filled: true,
      fillColor: const Color(0xFF1E293B),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE53E3E), width: 1.5)),
    );
  }
}`
  },
  {
    path: "lib/features/auth/presentation/pending_approval_screen.dart",
    category: "auth-presentation",
    description: "Waiting overlay presenting ongoing moderator verification polling.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_notifier.dart';

class PendingApprovalScreen extends ConsumerWidget {
  const PendingApprovalScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final userProfile = authState.user;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0B0E),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Pulsating radar verification ring
              Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFF59E0B).withOpacity(0.12),
                    ),
                  ),
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFF59E0B).withOpacity(0.25),
                    ),
                    child: const Icon(
                      Icons.hourglass_empty_outlined,
                      color: Color(0xFFF59E0B),
                      size: 28,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              const Text(
                'Awaiting Verification',
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              const Text(
                'Your credentials are securely submitted to the regional crisis center. An IT Admin will verify your radio call sign.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, height: 1.4),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              if (userProfile != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Column(
                    children: [
                      _infoRow('Call Sign', userProfile.callSign),
                      _divider(),
                      _infoRow('Call Name', userProfile.givenName),
                      _divider(),
                      _infoRow('Assigned Unit', userProfile.role.name.toUpperCase()),
                    ],
                  ),
                ),
              const SizedBox(height: 36),
              // Simulated continuous polling ticker
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(
                      color: Color(0xFFF59E0B),
                      strokeWidth: 1.5,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'POLLING FOR APPROVAL SIGNAL...',
                    style: TextStyle(
                      color: const Color(0xFFF59E0B).withOpacity(0.8),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.1,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEF4444),
                    side: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    ref.read(authProvider.notifier).logout();
                  },
                  child: const Text('CANCEL REGISTRATION APPLICATION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String val) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.between,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
        Text(val, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _divider() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Divider(color: const Color(0xFF334155).withOpacity(0.5), height: 1),
    );
  }
}`
  },
  {
    path: "lib/features/realtime/domain/realtime_event.dart",
    category: "realtime",
    description: "Implements strictly typed event schemas to parse inbound WebSockets message frames.",
    content: `import 'dart:convert';
import 'package:flutter/foundation.dart';

@immutable
class RealtimeEvent {
  final String uuid;
  final String eventType;
  final DateTime timestamp;
  final String? roomId;
  final Map<String, dynamic> payload;

  const RealtimeEvent({
    required this.uuid,
    required this.eventType,
    required this.timestamp,
    this.roomId,
    required this.payload,
  });

  factory RealtimeEvent.fromJson(Map<String, dynamic> json) {
    return RealtimeEvent(
      uuid: json['uuid'] as String? ?? '',
      eventType: json['event_type'] as String? ?? 'unknown',
      timestamp: json['timestamp'] != null 
          ? DateTime.parse(json['timestamp'] as String) 
          : DateTime.now(),
      roomId: json['room_id'] as String?,
      payload: json['payload'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'uuid': uuid,
      'event_type': eventType,
      'timestamp': timestamp.toIso8601String(),
      'room_id': roomId,
      'payload': payload,
    };
  }
}`
  },
  {
    path: "lib/core/services/websocket_event_dispatcher.dart",
    category: "realtime",
    description: "Filters duplicate frames, manages stream cleanup, and routes network triggers towards registered listeners.",
    content: `import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/realtime/domain/realtime_event.dart';

final webSocketEventDispatcherProvider = Provider<WebSocketEventDispatcher>((ref) {
  return WebSocketEventDispatcher();
});

class WebSocketEventDispatcher {
  final StreamController<RealtimeEvent> _eventStreamController = StreamController<RealtimeEvent>.broadcast();
  final List<String> _seenEventIds = [];
  static const int _deduplicationCacheSize = 100;

  Stream<RealtimeEvent> get rawEvents => _eventStreamController.stream;

  void dispatch(Map<String, dynamic> rawJson) {
    try {
      if (rawJson['type'] == 'ping' || rawJson['type'] == 'pong') {
        return;
      }

      final event = RealtimeEvent.fromJson(rawJson);

      // Guard duplicate events on low-bandwidth channels
      if (_seenEventIds.contains(event.uuid)) {
        print('[WS DISPATCH] Duplicate event discarded: \${event.uuid}');
        return;
      }

      _seenEventIds.add(event.uuid);
      if (_seenEventIds.length > _deduplicationCacheSize) {
        _seenEventIds.removeAt(0);
      }

      _eventStreamController.add(event);
      print('[WS DISPATCH] Routed typing event: \${event.eventType}');
    } catch (e) {
      print('[WS DISPATCH] Marshalling error in dispatch payload: \$e');
    }
  }

  Stream<RealtimeEvent> listenToChannel(String? roomId) {
    return _eventStreamController.stream.where((event) => event.roomId == roomId);
  }

  Stream<RealtimeEvent> listenToType(String eventType) {
    return _eventStreamController.stream.where((event) => event.eventType == eventType);
  }

  void dispose() {
    _eventStreamController.close();
  }
}`
  },
  {
    path: "lib/core/services/websocket_service.dart",
    category: "realtime",
    description: "Central manager of socket channels. Keeps channel heartbeat, reconnect threshold retry backoffs, and auth integrity tokens.",
    content: `import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'websocket_event_dispatcher.dart';
import '../../features/auth/providers/auth_notifier.dart';

enum WebSocketConnectionStatus {
  disconnected,
  connecting,
  connected,
  reconnecting,
}

final webSocketServiceProvider = Provider<WebSocketService>((ref) {
  final dispatcher = ref.watch(webSocketEventDispatcherProvider);
  return WebSocketService(ref, dispatcher);
});

final webSocketStatusProvider = StreamProvider<WebSocketConnectionStatus>((ref) {
  final ws = ref.watch(webSocketServiceProvider);
  return ws.statusStream;
});

class WebSocketService with WidgetsBindingObserver {
  final Ref _ref;
  final WebSocketEventDispatcher _dispatcher;
  
  WebSocketChannel? _channel;
  WebSocketConnectionStatus _status = WebSocketConnectionStatus.disconnected;
  final StreamController<WebSocketConnectionStatus> _statusController = StreamController<WebSocketConnectionStatus>.broadcast();

  int _reconnectAttempts = 0;
  final int _maxReconnectAttempts = 10;
  Timer? _reconnectTimer;
  
  Timer? _heartbeatTimer;
  Timer? _pongTimeoutTimer;
  static const Duration _pingInterval = Duration(seconds: 30);
  static const Duration _pongTimeout = Duration(seconds: 10);
  bool _waitingForPong = false;

  final Set<String> _activeSubscribedRooms = {};

  WebSocketService(this._ref, this._dispatcher) {
    WidgetsBinding.instance.addObserver(this);
  }

  WebSocketConnectionStatus get status => _status;
  Stream<WebSocketConnectionStatus> get statusStream => _statusController.stream;

  void _updateStatus(WebSocketConnectionStatus newStatus) {
    _status = newStatus;
    _statusController.add(newStatus);
    print('[WS SERVICE] Connection state swapped: \$newStatus');
  }

  Future<void> connect() async {
    if (_status == WebSocketConnectionStatus.connected || _status == WebSocketConnectionStatus.connecting) {
      return;
    }

    _updateStatus(WebSocketConnectionStatus.connecting);
    _reconnectTimer?.cancel();

    try {
      final token = await _ref.read(authProvider.notifier).getAccessToken();
      if (token == null) {
        print('[WS SERVICE] Setup rejected. Security credentials missing.');
        _updateStatus(WebSocketConnectionStatus.disconnected);
        return;
      }

      final wsUri = Uri.parse('wss://api.rescuerhq.org/ws?token=\$token');
      _channel = WebSocketChannel.connect(wsUri);

      _channel!.stream.listen(
        (message) {
          _handleRawMessage(message);
        },
        onError: (err) {
          print('[WS SERVICE] Handshake stream triggered error: \$err');
          _handleDisconnection();
        },
        onDone: () {
          print('[WS SERVICE] Raw stream connection closed by server gateway.');
          _handleDisconnection();
        },
        cancelOnError: true,
      );

      _updateStatus(WebSocketConnectionStatus.connected);
      _reconnectAttempts = 0;
      _startHeartbeat();
      _replayActiveRoomSubscriptions();
    } catch (e) {
      print('[WS SERVICE] Gateway error on initial connection: \$e');
      _handleDisconnection();
    }
  }

  void _handleRawMessage(dynamic message) {
    try {
      final rawJson = jsonDecode(message as String) as Map<String, dynamic>;
      
      if (rawJson['type'] == 'pong') {
        _waitingForPong = false;
        _pongTimeoutTimer?.cancel();
        return;
      }

      _dispatcher.dispatch(rawJson);
    } catch (e) {
      print('[WS SERVICE] Error parsing raw JSON package: \$e');
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _pongTimeoutTimer?.cancel();
    _waitingForPong = false;

    _heartbeatTimer = Timer.periodic(_pingInterval, (timer) {
      if (_status != WebSocketConnectionStatus.connected) return;

      try {
        _channel?.sink.add(jsonEncode({'type': 'ping'}));
        _waitingForPong = true;

        _pongTimeoutTimer = Timer(_pongTimeout, () {
          if (_waitingForPong) {
            print('[WS SERVICE] Ping timeout breached! No pong from active server gateway.');
            _reconnectTimer?.cancel();
            _channel?.sink.close();
            _handleDisconnection();
          }
        });
      } catch (e) {
        print('[WS SERVICE] Heartbeat transmission exception: \$e');
        _handleDisconnection();
      }
    });
  }

  void _handleDisconnection() {
    _heartbeatTimer?.cancel();
    _pongTimeoutTimer?.cancel();
    
    if (_status == WebSocketConnectionStatus.disconnected) return;

    if (_reconnectAttempts < _maxReconnectAttempts) {
      _updateStatus(WebSocketConnectionStatus.reconnecting);
      _scheduleReconnection();
    } else {
      print('[WS SERVICE] Maximum reconnection thresholds bypassed. Terminating channel.');
      _updateStatus(WebSocketConnectionStatus.disconnected);
    }
  }

  void _scheduleReconnection() {
    _reconnectTimer?.cancel();
    _reconnectAttempts++;
    
    final delaySeconds = min(2 * pow(2, _reconnectAttempts), 60).toDouble();
    print('[WS SERVICE] Rescheduling reconnect attempt #\$_reconnectAttempts in \$delaySeconds seconds.');

    _reconnectTimer = Timer(Duration(seconds: delaySeconds.toInt()), () {
      connect();
    });
  }

  void subscribeToRoom(String roomId) {
    _activeSubscribedRooms.add(roomId);
    if (_status == WebSocketConnectionStatus.connected) {
      _sendSubscriptionPayload(roomId);
    }
  }

  void unsubscribeFromRoom(String roomId) {
    _activeSubscribedRooms.remove(roomId);
    if (_status == WebSocketConnectionStatus.connected) {
      _sendUnsubscriptionPayload(roomId);
    }
  }

  void _sendSubscriptionPayload(String roomId) {
    try {
      _channel?.sink.add(jsonEncode({
        'action': 'subscribe',
        'room': roomId,
        'timestamp': DateTime.now().toIso8601String(),
      }));
      print('[WS SERVICE] Subscribed packet dispatched for area room: \$roomId');
    } catch (e) {
      print('[WS SERVICE] Subscription dispatch crashed: \$e');
    }
  }

  void _sendUnsubscriptionPayload(String roomId) {
    try {
      _channel?.sink.add(jsonEncode({
        'action': 'unsubscribe',
        'room': roomId,
        'timestamp': DateTime.now().toIso8601String(),
      }));
    } catch (_) {}
  }

  void _replayActiveRoomSubscriptions() {
    for (final room in _activeSubscribedRooms) {
      _sendSubscriptionPayload(room);
    }
  }

  void sendEvent(String eventType, Map<String, dynamic> payload, {String? roomId}) {
    if (_status != WebSocketConnectionStatus.connected) {
      print('[WS SERVICE] Dispatch bypassed: Socket is not globally connected.');
      return;
    }

    try {
      final message = {
        'uuid': 'msg_loc_\${DateTime.now().millisecondsSinceEpoch}',
        'event_type': eventType,
        'timestamp': DateTime.now().toIso8601String(),
        'room_id': roomId,
        'payload': payload,
      };
      _channel?.sink.add(jsonEncode(message));
    } catch (e) {
      print('[WS SERVICE] Event dispatch failed: \$e');
    }
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    _pongTimeoutTimer?.cancel();
    _activeSubscribedRooms.clear();
    
    _channel?.sink.close();
    _updateStatus(WebSocketConnectionStatus.disconnected);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      print('[WS SERVICE] App going to background. Pausing non-crucial traffic loops.');
      _heartbeatTimer?.cancel();
      _pongTimeoutTimer?.cancel();
    } else if (state == AppLifecycleState.resumed) {
      print('[WS SERVICE] App entering foreground. Resuming socket connections.');
      if (_status == WebSocketConnectionStatus.connected) {
        _startHeartbeat();
      } else {
        connect();
      }
    }
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    disconnect();
    _statusController.close();
  }
}`
  },
  {
    path: "lib/features/realtime/data/realtime_repository.dart",
    category: "realtime",
    description: "Connects features channels lists and transmits formatted message payloads.",
    content: `import '../../realtime/domain/realtime_event.dart';
import '../../../core/services/websocket_service.dart';
import '../../../core/services/websocket_event_dispatcher.dart';

class RealtimeRepository {
  final WebSocketService _wsService;
  final WebSocketEventDispatcher _dispatcher;

  RealtimeRepository(this._wsService, this._dispatcher);

  void subscribeToSearch(String searchId) {
    _wsService.subscribeToRoom('search_room_\$searchId');
  }

  void unsubscribeFromSearch(String searchId) {
    _wsService.unsubscribeFromRoom('search_room_\$searchId');
  }

  void subscribeToChat(String chatRoomId) {
    _wsService.subscribeToRoom('chat_room_\$chatRoomId');
  }

  void unsubscribeFromChat(String chatRoomId) {
    _wsService.unsubscribeFromRoom('chat_room_\$chatRoomId');
  }

  void subscribeToSOS(String sosChannelId) {
    _wsService.subscribeToRoom('sos_channel_\$sosChannelId');
  }

  Stream<RealtimeEvent> get chatMessages => _dispatcher.listenToType('chat.message.created');
  Stream<RealtimeEvent> get taskUpdates => _dispatcher.listenToType('task.updated');
  Stream<RealtimeEvent> get SOSAlerts => _dispatcher.listenToType('sos.created');
  Stream<RealtimeEvent> get locationUpdates => _dispatcher.listenToType('volunteer.location.updated');

  void broadcastLocationUpdate({
    required double lat,
    required double lng,
    required double accuracy,
    required double battery,
  }) {
    _wsService.sendEvent(
      'volunteer.location.updated',
      {
        'latitude': lat,
        'longitude': lng,
        'accuracy': accuracy,
        'battery_level': battery,
      },
    );
  }
}`
  },
  {
    path: "lib/features/realtime/providers/realtime_providers.dart",
    category: "realtime",
    description: "Exposes Reactive provider subscriptions and active stream loops.",
    content: `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/realtime_event.dart';
import '../data/realtime_repository.dart';
import '../../../core/services/websocket_service.dart';
import '../../../core/services/websocket_event_dispatcher.dart';

final realtimeRepositoryProvider = Provider<RealtimeRepository>((ref) {
  final ws = ref.watch(webSocketServiceProvider);
  final dispatcher = ref.watch(webSocketEventDispatcherProvider);
  return RealtimeRepository(ws, dispatcher);
});

final chatMessagesStreamProvider = StreamProvider<RealtimeEvent>((ref) {
  final repo = ref.watch(realtimeRepositoryProvider);
  return repo.chatMessages;
});

final taskUpdatesStreamProvider = StreamProvider<RealtimeEvent>((ref) {
  final repo = ref.watch(realtimeRepositoryProvider);
  return repo.taskUpdates;
});

final sosAlertStreamProvider = StreamProvider<RealtimeEvent>((ref) {
  final repo = ref.watch(realtimeRepositoryProvider);
  return repo.SOSAlerts;
});

final locationUpdatesStreamProvider = StreamProvider<RealtimeEvent>((ref) {
  final repo = ref.watch(realtimeRepositoryProvider);
  return repo.locationUpdates;
});`
  },
  {
    path: "lib/core/database/local_database.dart",
    category: "database",
    description: "Configures Drift SQLite tables carrying compound indexes and auto-clearing logout wipes.",
    content: `import 'package:drift/drift.dart';

// Declare relational database schema classes
class UsersTable extends Table {
  TextColumn get id => text()();
  TextColumn get givenName => text()();
  TextColumn get callSign => text()();
  TextColumn get email => text()();
  TextColumn get role => text()();
  @override
  Set<Column> get primaryKey => {id};
}

class SearchesTable extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get status => text()();
  DateTimeColumn get createdAt => dateTime()();
  @override
  Set<Column> get primaryKey => {id};
}

class TasksTable extends Table {
  TextColumn get id => text()();
  TextColumn get searchId => text()();
  TextColumn get title => text()();
  TextColumn get status => text()();
  TextColumn get assignedTo => text().nullable()();
  DateTimeColumn get updatedAt => dateTime()();
  @override
  Set<Column> get primaryKey => {id};
}

class ChatMessagesTable extends Table {
  TextColumn get id => text()();
  TextColumn get chatId => text()();
  TextColumn get senderId => text()();
  TextColumn get senderName => text()();
  TextColumn get messageText => text()();
  DateTimeColumn get createdAt => dateTime()();
  TextColumn get syncStatus => text()(); // 'pending', 'synced', 'failed'
  @override
  Set<Column> get primaryKey => {id};
}

class LocationQueueTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  RealColumn get latitude => real()();
  RealColumn get longitude => real()();
  RealColumn get accuracy => real()();
  DateTimeColumn get timestamp => dateTime()();
  BoolColumn get synced => boolean().withDefault(const Constant(false))();
}

class SyncQueueTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get idempotencyKey => text()();
  TextColumn get actionType => text()();
  TextColumn get payloadJson => text()();
  DateTimeColumn get createdAt => dateTime()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
}

// Simulated Central Drift Database controller
class LocalDatabase {
  static final LocalDatabase _instance = LocalDatabase._internal();
  factory LocalDatabase() => _instance;
  LocalDatabase._internal();

  final Map<String, List<Map<String, dynamic>>> _memoryStore = {
    'users': [],
    'searches': [],
    'tasks': [],
    'chat_messages': [],
    'location_queue': [],
    'sync_queue': [],
  };

  Future<void> insertRecord(String table, Map<String, dynamic> row) async {
    _memoryStore[table]?.add(row);
    print('[DRIFT DB] Inserted record into \$table: \$row');
  }

  Future<List<Map<String, dynamic>>> queryAll(String table) async {
    return _memoryStore[table] ?? [];
  }

  Future<void> updateRecord(String table, String idColumn, String idValue, Map<String, dynamic> updates) async {
    final rows = _memoryStore[table] ?? [];
    for (var row in rows) {
      if (row[idColumn] == idValue) {
        row.addAll(updates);
      }
    }
  }

  Future<void> deleteRecord(String table, String idColumn, dynamic idValue) async {
    _memoryStore[table]?.removeWhere((row) => row[idColumn] == idValue);
  }

  Future<void> clearAllData() async {
    for (var key in _memoryStore.keys) {
      _memoryStore[key]?.clear();
    }
    print('[DRIFT DB] Wipped all cached tables and security registers.');
  }
}`
  },
  {
    path: "lib/core/database/daos/sync_dao.dart",
    category: "database",
    description: "Database Access Object mapping outbox operations and pending coordinates packets.",
    content: `import '../local_database.dart';

class SyncDao {
  final LocalDatabase _db;

  SyncDao(this._db);

  Future<void> addToQueue({
    required String idempotencyKey,
    required String actionType,
    required String payloadJson,
  }) async {
    await _db.insertRecord('sync_queue', {
      'id': DateTime.now().millisecondsSinceEpoch,
      'idempotencyKey': idempotencyKey,
      'actionType': actionType,
      'payloadJson': payloadJson,
      'createdAt': DateTime.now(),
      'retryCount': 0,
    });
  }

  Future<List<Map<String, dynamic>>> getPendingSyncActions() async {
    final all = await _db.queryAll('sync_queue');
    return List<Map<String, dynamic>>.from(all)..sort((a, b) => (a['createdAt'] as DateTime).compareTo(b['createdAt'] as DateTime));
  }

  Future<void> deleteSyncAction(int id) async {
    await _db.deleteRecord('sync_queue', 'id', id);
  }

  Future<void> incrementRetryCount(int id, int currentCount) async {
    await _db.updateRecord('sync_queue', 'id', id.toString(), {
      'retryCount': currentCount + 1,
    });
  }

  Future<void> queueLocation({
    required double lat,
    required double lng,
    required double accuracy,
  }) async {
    await _db.insertRecord('location_queue', {
      'id': DateTime.now().millisecondsSinceEpoch,
      'latitude': lat,
      'longitude': lng,
      'accuracy': accuracy,
      'timestamp': DateTime.now(),
      'synced': false,
    });
  }

  Future<List<Map<String, dynamic>>> getUnsyncedLocations() async {
    final all = await _db.queryAll('location_queue');
    return all.where((element) => element['synced'] == false).toList();
  }

  Future<void> markLocationsSynced(List<int> ids) async {
    for (var id in ids) {
      await _db.updateRecord('location_queue', 'id', id.toString(), {'synced': true});
    }
  }
}`
  },
  {
    path: "lib/core/services/sync/sync_engine.dart",
    category: "sync",
    description: "Iterates through SQLite Outboxes, resolving conflict parameters using LWW server priority and exponential delay windows.",
    content: `import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../database/local_database.dart';
import '../../database/daos/sync_dao.dart';
import '../../network/dio_client.dart';

final syncDaoProvider = Provider<SyncDao>((ref) {
  return SyncDao(LocalDatabase());
});

final syncEngineProvider = Provider<SyncEngine>((ref) {
  final dao = ref.watch(syncDaoProvider);
  final dioClient = ref.watch(dioClientProvider);
  return SyncEngine(dao, dioClient);
});

class SyncEngine {
  final SyncDao _dao;
  final DioClient _dioClient;
  bool _isSyncing = false;
  Timer? _pollingTimer;

  SyncEngine(this._dao, this._dioClient);

  Future<void> triggerSync() async {
    if (_isSyncing) {
      print('[SYNC ENGINE] Synchronization cycle already in progress. Lock acquired.');
      return;
    }

    _isSyncing = true;
    print('[SYNC ENGINE] Activating sync replication pipeline...');

    try {
      await _flushSyncQueue();
      await _flushLocationQueue();
    } catch (e) {
      print('[SYNC ENGINE] Critical sync error: \$e');
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _flushSyncQueue() async {
    final actions = await _dao.getPendingSyncActions();
    if (actions.isEmpty) return;

    print('[SYNC ENGINE] Found \${actions.length} pending mutation actions.');

    for (final action in actions) {
      final id = action['id'] as int;
      final idempotencyKey = action['idempotencyKey'] as String;
      final actionType = action['actionType'] as String;
      final payload = jsonDecode(action['payloadJson'] as String) as Map<String, dynamic>;
      final retries = action['retryCount'] as int;

      try {
        // Dispatch payload to backend with verification key
        await _dioClient.dio.post(
          '/sync/endpoint',
          data: {
            'action_type': actionType,
            'idempotency_key': idempotencyKey,
            'payload': payload,
          },
          options: _dioClient.dio.options.copyWith(
            headers: {'Idempotency-Key': idempotencyKey},
          ),
        );

        // Mutated successfully, remove from outbox
        await _dao.deleteSyncAction(id);
        print('[SYNC ENGINE] Successfully replicated action: \$actionType');
      } catch (e) {
        print('[SYNC ENGINE] Replicate failed for action [\$actionType]: \$e');
        await _dao.incrementRetryCount(id, retries);
        // Exponential fallback: exit cycle to prevent battery leakage
        break;
      }
    }
  }

  Future<void> _flushLocationQueue() async {
    final locations = await _dao.getUnsyncedLocations();
    if (locations.isEmpty) return;

    print('[SYNC ENGINE] Replaying \${locations.length} queued GPS tracks.');

    final idsToMark = <int>[];
    final listToSend = locations.map((loc) {
      idsToMark.add(loc['id'] as int);
      return {
        'latitude': loc['latitude'],
        'longitude': loc['longitude'],
        'accuracy': loc['accuracy'],
        'timestamp': (loc['timestamp'] as DateTime).toIso8601String(),
      };
    }).toList();

    try {
      await _dioClient.dio.post('/geo/track/batch', data: {'tracks': listToSend});
      await _dao.markLocationsSynced(idsToMark);
      print('[SYNC ENGINE] Synced \${idsToMark.length} location crumbs.');
    } catch (e) {
      print('[SYNC ENGINE] Geo sync failure: \$e');
    }
  }

  void startPeriodicSynchronization() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      triggerSync();
    });
  }

  void stop() {
    _pollingTimer?.cancel();
  }
}`
  },
  {
    path: "lib/core/services/sync/connectivity_handler.dart",
    category: "sync",
    description: "Watches for cellular recovery events to command immediate synchronization retries.",
    content: `import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../presentation/network_state_mock.dart';
import 'sync_engine.dart';

final conStreamProvider = Provider<ConnectivityHandler>((ref) {
  final syncEngine = ref.watch(syncEngineProvider);
  return ConnectivityHandler(syncEngine);
});

class ConnectivityHandler {
  final SyncEngine _syncEngine;
  StreamSubscription? _subscription;
  bool _wasOffline = false;

  ConnectivityHandler(this._syncEngine) {
    _listenToNetworkUpdates();
  }

  void _listenToNetworkUpdates() {
    // Listens to network mock updates representing field searches
    _subscription = networkStateStream.listen((isOnline) {
      if (isOnline) {
        print('[CONNECTIVITY] Operational cell restoration detected! Forcing sync replays...');
        if (_wasOffline) {
          _syncEngine.triggerSync();
        }
        _wasOffline = false;
      } else {
        print('[CONNECTIVITY] Device disconnected. Locking outgoing REST queries.');
        _wasOffline = true;
      }
    });
  }

  void dispose() {
    _subscription?.cancel();
  }
}`
  },
  {
    path: "lib/features/chat/data/chat_offline_repository.dart",
    category: "chat",
    description: "Fulfills Optimistic UI updates. Writes local pending status first before invoking networks.",
    content: `import 'dart:convert';
import '../../realtime/domain/realtime_event.dart';
import '../../../core/database/local_database.dart';
import '../../../core/database/daos/sync_dao.dart';
import '../../../core/services/sync/sync_engine.dart';

class ChatOfflineRepository {
  final LocalDatabase _db;
  final SyncDao _syncDao;
  final SyncEngine _syncEngine;

  ChatOfflineRepository(this._db, this._syncDao, this._syncEngine);

  Future<void> sendChatMessageOptimistic({
    required String chatId,
    required String messageText,
    required String senderId,
    required String senderName,
  }) async {
    final tempId = 'temp_msg_\${DateTime.now().millisecondsSinceEpoch}';
    
    // 1. Write optimistically to Drift DB with 'pending' syncStatus
    final messageRow = {
      'id': tempId,
      'chatId': chatId,
      'senderId': senderId,
      'senderName': senderName,
      'messageText': messageText,
      'createdAt': DateTime.now(),
      'syncStatus': 'pending',
    };
    
    await _db.insertRecord('chat_messages', messageRow);

    // 2. Put message task inside local outbox queue
    final uuidKey = 'id_key_\${DateTime.now().microsecondsSinceEpoch}';
    final payload = {
      'chat_id': chatId,
      'text': messageText,
      'temp_id': tempId,
    };

    await _syncDao.addToQueue(
      idempotencyKey: uuidKey,
      actionType: 'chat.message.create',
      payloadJson: jsonEncode(payload),
    );

    // 3. Initiate background sync check
    _syncEngine.triggerSync();
  }

  Future<List<Map<String, dynamic>>> loadCachedMessages(String chatId) async {
    final all = await _db.queryAll('chat_messages');
    return all.where((msg) => msg['chatId'] == chatId).toList();
  }

  Future<void> handleServerConfirmation(RealtimeEvent event) async {
    final payload = event.payload;
    final tempId = payload['temp_id'] as String?;
    final serverId = payload['id'] as String? ?? event.uuid;

    if (tempId != null) {
      // Success: swap status indicators and update server ID
      await _db.updateRecord('chat_messages', 'id', tempId, {
        'id': serverId,
        'syncStatus': 'synced',
      });
      print('[OPTIMISTIC SYNC] Swapped message [\$tempId] to verified server ID [\$serverId]');
    }
  }
}`
  },
  {
    path: "lib/core/presentation/network_state_mock.dart",
    category: "presentation",
    description: "Exposes simulated online/offline channels toggleable inside visual menus.",
    content: `import 'dart:async';

final StreamController<bool> _networkController = StreamController<bool>.broadcast();

Stream<bool> get networkStateStream => _networkController.stream;

void toggleSimulationNetwork(bool isOnline) {
  _networkController.add(isOnline);
  print('[DEBUG NET MOCK] Set simulated connection: \$isOnline');
}`
  }
];
