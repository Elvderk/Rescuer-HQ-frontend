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
  },
  {
    path: "lib/features/searches/domain/models/search_model.dart",
    category: "searches",
    description: "Strictly-typed model definition representing missing children with multi-role permissions and geographic assembly points.",
    content: `import 'package:flutter/foundation.dart';

enum SearchStatus {
  active,
  inProgress,
  suspended,
  completed,
  foundAlive,
  foundDead,
  archived
}

@immutable
class SearchModel {
  final String id;
  final String missingPersonName;
  final int age;
  final String characteristics;
  final String photoUrl;
  final String lastKnownLocationName;
  final double lastKnownLat;
  final double lastKnownLng;
  final SearchStatus status;
  final DateTime createdAt;
  final String coordinatorId;
  final String coordinatorName;
  final String assemblyPointAddress;
  final double assemblyLat;
  final double assemblyLng;
  final List<String> joinedVolunteerIds;

  const SearchModel({
    required this.id,
    required this.missingPersonName,
    required this.age,
    required this.characteristics,
    required this.photoUrl,
    required this.lastKnownLocationName,
    required this.lastKnownLat,
    required this.lastKnownLng,
    required this.status,
    required this.createdAt,
    required this.coordinatorId,
    required this.coordinatorName,
    required this.assemblyPointAddress,
    required this.assemblyLat,
    required this.assemblyLng,
    required this.joinedVolunteerIds,
  });

  factory SearchModel.fromJson(Map<String, dynamic> json) {
    return SearchModel(
      id: json['id'] as String? ?? '',
      missingPersonName: json['missing_person_name'] as String? ?? 'Неизвестный',
      age: json['age'] as int? ?? 0,
      characteristics: json['characteristics'] as String? ?? '',
      photoUrl: json['photo_url'] as String? ?? '',
      lastKnownLocationName: json['last_known_location_name'] as String? ?? '',
      lastKnownLat: (json['last_known_lat'] as num?)?.toDouble() ?? 0.0,
      lastKnownLng: (json['last_known_lng'] as num?)?.toDouble() ?? 0.0,
      status: SearchStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
        orElse: () => SearchStatus.active,
      ),
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      coordinatorId: json['coordinator_id'] as String? ?? '',
      coordinatorName: json['coordinator_name'] as String? ?? 'Штаб Координации',
      assemblyPointAddress: json['assembly_point_address'] as String? ?? '',
      assemblyLat: (json['assembly_lat'] as num?)?.toDouble() ?? 0.0,
      assemblyLng: (json['assembly_lng'] as num?)?.toDouble() ?? 0.0,
      joinedVolunteerIds: List<String>.from(json['volunteer_ids'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'missing_person_name': missingPersonName,
      'age': age,
      'characteristics': characteristics,
      'photo_url': photoUrl,
      'last_known_location_name': lastKnownLocationName,
      'last_known_lat': lastKnownLat,
      'last_known_lng': lastKnownLng,
      'status': status.toString().split('.').last,
      'created_at': createdAt.toIso8601String(),
      'coordinator_id': coordinatorId,
      'coordinator_name': coordinatorName,
      'assembly_point_address': assemblyPointAddress,
      'assembly_lat': assemblyLat,
      'assembly_lng': assemblyLng,
      'volunteer_ids': joinedVolunteerIds,
    };
  }

  SearchModel copyWith({
    String? id,
    String? missingPersonName,
    int? age,
    String? characteristics,
    String? photoUrl,
    String? lastKnownLocationName,
    double? lastKnownLat,
    double? lastKnownLng,
    SearchStatus? status,
    DateTime? createdAt,
    String? coordinatorId,
    String? coordinatorName,
    String? assemblyPointAddress,
    double? assemblyLat,
    double? assemblyLng,
    List<String>? joinedVolunteerIds,
  }) {
    return SearchModel(
      id: id ?? this.id,
      missingPersonName: missingPersonName ?? this.missingPersonName,
      age: age ?? this.age,
      characteristics: characteristics ?? this.characteristics,
      photoUrl: photoUrl ?? this.photoUrl,
      lastKnownLocationName: lastKnownLocationName ?? this.lastKnownLocationName,
      lastKnownLat: lastKnownLat ?? this.lastKnownLat,
      lastKnownLng: lastKnownLng ?? this.lastKnownLng,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      coordinatorId: coordinatorId ?? this.coordinatorId,
      coordinatorName: coordinatorName ?? this.coordinatorName,
      assemblyPointAddress: assemblyPointAddress ?? this.assemblyPointAddress,
      assemblyLat: assemblyLat ?? this.assemblyLat,
      assemblyLng: assemblyLng ?? this.assemblyLng,
      joinedVolunteerIds: joinedVolunteerIds ?? this.joinedVolunteerIds,
    );
  }
}`
  },
  {
    path: "lib/features/searches/data/searches_repository.dart",
    category: "searches",
    description: "Synchronizes searches across local SQL storage with retry fallback caches.",
    content: `import 'dart:convert';
import '../../../core/database/local_database.dart';
import '../domain/models/search_model.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/database/daos/sync_dao.dart';

class SearchesRepository {
  final LocalDatabase _localDb;
  final SyncDao _syncDao;
  final DioClient _dioClient;

  SearchesRepository(this._localDb, this._syncDao, this._dioClient);

  Future<List<SearchModel>> fetchSearches({bool forceRefresh = false}) async {
    // 1. Read first from cached DB
    final cached = await _localDb.queryAll('searches');
    List<SearchModel> results = cached.map((c) => SearchModel.fromJson(c)).toList();

    if (results.isNotEmpty && !forceRefresh) {
      print('[SEARCH REPO] Loaded \${results.length} searches from local cache.');
      return results;
    }

    try {
      // 2. Refresh from HQ API server
      final response = await _dioClient.dio.get('/api/v1/searches');
      final list = response.data as List;
      final serverSearches = list.map((item) => SearchModel.fromJson(item as Map<String, dynamic>)).toList();

      // 3. Clear and overwrite local cache with updated entities
      for (final search in serverSearches) {
        await _localDb.insertRecord('searches', search.toJson());
      }
      return serverSearches;
    } catch (e) {
      print('[SEARCH REPO] Failed loading from server, staying with cache: \$e');
      return results;
    }
  }

  Future<void> updateSearchStatus(String searchId, SearchStatus status) async {
    // Optimistic Update
    await _localDb.updateRecord('searches', 'id', searchId, {
      'status': status.toString().split('.').last,
    });

    final key = 'status_sync_\${DateTime.now().microsecondsSinceEpoch}';
    final payload = {
      'search_id': searchId,
      'status': status.toString().split('.').last,
    };

    // Queue action for replication engine
    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'search.status.update',
      payloadJson: jsonEncode(payload),
    );
  }

  Future<void> submitNewSearchDraft(SearchModel model) async {
    // Save locally
    await _localDb.insertRecord('searches', model.toJson());

    final key = 'create_search_\${DateTime.now().microsecondsSinceEpoch}';
    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'search.create',
      payloadJson: jsonEncode(model.toJson()),
    );
  }
}`
  },
  {
    path: "lib/features/searches/providers/searches_providers.dart",
    category: "searches",
    description: "Handles paging, dynamic categories sorting, search filtering, and active operations.",
    content: `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/models/search_model.dart';
import '../data/searches_repository.dart';
import '../../../core/database/local_database.dart';
import '../../../core/database/daos/sync_dao.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/services/websocket_event_dispatcher.dart';

final searchesRepositoryProvider = Provider<SearchesRepository>((ref) {
  final localDb = LocalDatabase();
  final syncDao = ref.watch(syncDaoProvider);
  final dioClient = ref.watch(dioClientProvider);
  return SearchesRepository(localDb, syncDao, dioClient);
});

// For selecting and tracking selected operating corridor
final activeSearchIdProvider = StateProvider<String?>((ref) => null);

// Reactive Filters
class SearchFilters {
  final SearchStatus? status;
  final String query;
  final bool mineOnly;

  SearchFilters({this.status, this.query = ' ', this.mineOnly = false});

  SearchFilters copyWith({SearchStatus? status, String? query, bool? mineOnly}) {
    return SearchFilters(
      status: status ?? this.status,
      query: query ?? this.query,
      mineOnly: mineOnly ?? this.mineOnly,
    );
  }
}

final searchFiltersProvider = StateProvider<SearchFilters>((ref) => SearchFilters());

// Fetches Searches dynamically according to filters
final searchesListProvider = FutureProvider<List<SearchModel>>((ref) async {
  final repo = ref.watch(searchesRepositoryProvider);
  final filters = ref.watch(searchFiltersProvider);
  
  final all = await repo.fetchSearches();
  
  return all.where((search) {
    if (filters.status != null && search.status != filters.status) return false;
    if (filters.query.trim().isNotEmpty && 
        !search.missingPersonName.toLowerCase().contains(filters.query.toLowerCase())) return false;
    return true;
  }).toList();
});

// Exposes current search operational room details
final activeSearchDetailsProvider = FutureProvider<SearchModel?>((ref) async {
  final activeId = ref.watch(activeSearchIdProvider);
  if (activeId == null) return null;

  final repo = ref.watch(searchesRepositoryProvider);
  final all = await repo.fetchSearches();
  return all.firstWhere((s) => s.id == activeId);
});

// Listener tracking real-time events for live list edits
final searchesRealtimeListener = Provider<void>((ref) {
  final dispatcher = ref.watch(webSocketEventDispatcherProvider);
  final repo = ref.watch(searchesRepositoryProvider);

  dispatcher.rawEvents.listen((event) async {
    if (event.eventType == 'search.status.changed' || event.eventType == 'search.updated') {
      print('[WS HANDLER] Search operational change received: \${event.uuid}');
      // Trigger a soft refresh across reactive lists
      ref.invalidate(searchesListProvider);
      ref.invalidate(activeSearchDetailsProvider);
    }
  });
});`
  },
  {
    path: "lib/features/searches/presentation/searches_list_screen.dart",
    category: "searches",
    description: "Responsive main panel for search operations. Integrates search bars, badges, and offline modes.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/searches_providers.dart';
import '../domain/models/search_model.dart';
import 'search_details_screen.dart';
import 'create_search_screen.dart';

class SearchesListScreen extends ConsumerWidget {
  const SearchesListScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final searchesAsync = ref.watch(searchesListProvider);
    final filters = ref.watch(searchFiltersProvider);
    
    // Warm up the websocket listener to capture incoming creations
    ref.read(searchesRealtimeListener);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Поисковые Операции', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(searchesListProvider),
          )
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.red[600],
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const CreateSearchScreen()),
          );
        },
        label: const Text('Новый Поиск', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        icon: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          // Filter section
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Поиск по ФИО пропавшего...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Theme.of(context).cardColor,
              ),
              onChanged: (val) {
                ref.read(searchFiltersProvider.notifier).update(
                  (state) => state.copyWith(query: val),
                );
              },
            ),
          ),
          
          // Fast status filters chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Все'),
                  selected: filters.status == null,
                  onSelected: (sel) {
                    ref.read(searchFiltersProvider.notifier).update((state) => state.copyWith(status: null));
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Активные'),
                  selected: filters.status == SearchStatus.active,
                  onSelected: (sel) {
                    ref.read(searchFiltersProvider.notifier).update(
                      (state) => state.copyWith(status: SearchStatus.active),
                    );
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Завершенные'),
                  selected: filters.status == SearchStatus.completed,
                  onSelected: (sel) {
                    ref.read(searchFiltersProvider.notifier).update(
                      (state) => state.copyWith(status: SearchStatus.completed),
                    );
                  },
                ),
              ],
            ),
          ),

          Expanded(
            child: searchesAsync.when(
              data: (searches) {
                if (searches.isEmpty) {
                  return const Center(
                    child: Text('Поисковые операции не найдены', style: TextStyle(color: Colors.grey)),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: searches.length,
                  itemBuilder: (context, index) {
                    final item = searches[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 2,
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(12),
                        leading: CircleAvatar(
                          radius: 28,
                          backgroundColor: Colors.red[100],
                          backgroundImage: NetworkImage(item.photoUrl),
                          child: item.photoUrl.isEmpty ? const Icon(Icons.person, color: Colors.red) : null,
                        ),
                        title: Text(item.missingPersonName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text('Возраст: \${item.age} • \${item.lastKnownLocationName}'),
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, py: 4),
                          decoration: BoxDecoration(
                            color: item.status == SearchStatus.active ? Colors.emerald[100] : Colors.grey[200],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            item.status == SearchStatus.active ? 'АКТИВЕН' : 'ЗАВЕРШЕН',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: item.status == SearchStatus.active ? Colors.emerald[800] : Colors.grey[800],
                            ),
                          ),
                        ),
                        onTap: () {
                          ref.read(activeSearchIdProvider.notifier).state = item.id;
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const SearchDetailsScreen()),
                          );
                        },
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Ошибка загрузки данных: \$err')),
            ),
          ),
        ],
      ),
    );
  }
}`
  },
  {
    path: "lib/features/searches/presentation/search_details_screen.dart",
    category: "searches",
    description: "Multi-layered live operational panel. Blends status bars, coordinators contact sheets, and built-in topographic navigation graphics.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/searches_providers.dart';
import '../domain/models/search_model.dart';
import 'search_participants_screen.dart';

class SearchDetailsScreen extends ConsumerWidget {
  const SearchDetailsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeAsync = ref.watch(activeSearchDetailsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Сведения о Поиске'),
        actions: [
          IconButton(
            icon: const Icon(Icons.map),
            onPressed: () {},
          )
        ],
      ),
      body: activeAsync.when(
        data: (search) {
          if (search == null) {
            return const Center(child: Text('Поиск не выбран'));
          }

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Display Missing Kid Avatar banner
                Container(
                  height: 220,
                  decoration: BoxDecoration(
                    color: Colors.slate[900],
                    image: search.photoUrl.isNotEmpty 
                        ? DecorationImage(image: NetworkImage(search.photoUrl), fit: BoxFit.cover)
                        : null,
                  ),
                  child: search.photoUrl.isEmpty 
                      ? const Center(child: Icon(Icons.person, size: 72, color: Colors.blueGrey))
                      : null,
                ),

                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          Expanded(
                            child: Text(
                              search.missingPersonName,
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, py: 6),
                            decoration: BoxDecoration(
                              color: Colors.red[50],
                              border: Border.all(color: Colors.red[200]!),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '\${search.age} лет',
                              style: TextStyle(color: Colors.red[900], fontWeight: FontWeight.bold),
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Статус: \${search.status.toString().split('.').last.toUpperCase()}',
                        style: TextStyle(color: Colors.red[700], fontWeight: FontWeight.bold),
                      ),
                      const Divider(height: 32),

                      const Text('Особые Приметы & Характеристики', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 8),
                      Text(
                        search.characteristics.isNotEmpty ? search.characteristics : 'Характеристики не заявлены.',
                        style: const TextStyle(height: 1.4, color: Colors.black87),
                      ),
                      const Divider(height: 32),

                      const Text('Место Пропажи & Сбор Отряда', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const CircleAvatar(child: Icon(Icons.location_on)),
                        title: const Text('Сбор в штабе HQ'),
                        subtitle: Text(search.assemblyPointAddress),
                      ),
                      const Divider(height: 32),

                      const Text('Координатор Операции', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          CircleAvatar(child: Text(search.coordinatorName[0])),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(search.coordinatorName, style: const TextStyle(fontWeight: FontWeight.bold)),
                              const Text('Канал вещания: 144.5 МГц', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Navigation routes to see users live list
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(50),
                          backgroundColor: Colors.slate[900],
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.people_outline, color: Colors.white),
                        label: const Text('Участники Операции', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const SearchParticipantsScreen()),
                          );
                        },
                      ),
                    ],
                  ),
                )
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Ошибка загрузки данных: \$err')),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/searches/presentation/create_search_screen.dart",
    category: "searches",
    description: "Safety-validated step wizard used to orchestrate new missing kid files.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../domain/models/search_model.dart';
import '../providers/searches_providers.dart';

class CreateSearchScreen extends ConsumerStatefulWidget {
  const CreateSearchScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<CreateSearchScreen> createState() => _CreateSearchScreenState();
}

class _CreateSearchScreenState extends ConsumerState<CreateSearchScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _ageController = TextEditingController();
  final _characteristicsController = TextEditingController();
  final _addressController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _characteristicsController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _submitDraft() {
    if (!_formKey.currentState!.validate()) return;

    final newSearch = SearchModel(
      id: const Uuid().v4(),
      missingPersonName: _nameController.text,
      age: int.tryParse(_ageController.text) ?? 5,
      characteristics: _characteristicsController.text,
      photoUrl: '', // To be uploaded by high complexity image queue
      lastKnownLocationName: 'Поисковые квадраты',
      lastKnownLat: 55.7558,
      lastKnownLng: 37.6173,
      status: SearchStatus.active,
      createdAt: DateTime.now(),
      coordinatorId: 'coord_999',
      coordinatorName: 'Звезда-10 (Координатор)',
      assemblyPointAddress: _addressController.text.isNotEmpty 
          ? _addressController.text 
          : 'Сектор А-1 (Главный штаб)',
      assemblyLat: 55.75,
      assemblyLng: 37.61,
      joinedVolunteerIds: [],
    );

    ref.read(searchesRepositoryProvider).submitNewSearchDraft(newSearch);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Черновик поиска сохранен локально и поставлен в очередь отправки.')),
    );

    Navigator.pop(context);
    ref.invalidate(searchesListProvider);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Новый Поиск')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'ФИО Пропавшего ребёнка/человека', prefixIcon: Icon(Icons.person)),
                validator: (val) => val == null || val.trim().isEmpty ? 'Заполните ФИО' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _ageController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Возраст', prefixIcon: Icon(Icons.cake)),
                validator: (val) => val == null || int.tryParse(val) == null ? 'Укажите числовой возраст' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _characteristicsController,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Особые приметы (одежда, шрамы, состояние здоровья)',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Карточке спасателя нужны важные приметы' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _addressController,
                decoration: const InputDecoration(labelText: 'Штаб / Точка сбора волонтеров', prefixIcon: Icon(Icons.map)),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  backgroundColor: Colors.red[600],
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _submitDraft,
                child: const Text('Запустить Поисковую Операцию', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
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
    path: "lib/features/searches/presentation/search_participants_screen.dart",
    category: "searches",
    description: "Grid view displaying real-time distance proximity and radio details of joined volunteers.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SearchParticipantsScreen extends ConsumerWidget {
  const SearchParticipantsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Hardcoded high-fidelity volunteers list demonstrating active grid view
    final volunteers = [
      {'name': 'Соколов Дмитрий (Амур-12)', 'role': 'Группа поиска K9', 'dist': '240м', 'battery': '92%', 'online': true},
      {'name': 'Иванова Анна (Заря-4)', 'role': 'Следопыт-навигатор', 'dist': '850м', 'battery': '75%', 'online': true},
      {'name': 'Петров Сергей (Байкал-50)', 'role': 'Связист штаба', 'dist': '1.2км', 'battery': '64%', 'online': true},
      {'name': 'Михеев Егор (Рассвет-2)', 'role': 'Внедорожный экипаж', 'dist': '3.4км', 'battery': '44%', 'online': false},
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Участники поиска на карте')),
      body: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: volunteers.length,
        itemBuilder: (context, index) {
          final vol = volunteers[index];
          final isOnline = vol['online'] as bool;

          return Card(
            elevation: 1,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(12),
              leading: Badge(
                alignment: Alignment.bottomRight,
                backgroundColor: isOnline ? Colors.emerald : Colors.grey,
                child: CircleAvatar(
                  backgroundColor: Colors.red[50],
                  child: Text((vol['name'] as String)[0]),
                ),
              ),
              title: Text(vol['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text('\${vol['role']} • Расстояние: \${vol['dist']}'),
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(vol['battery'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
                  const SizedBox(height: 2),
                  const Text('Заряд АКБ', style: TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}`
  },
  {
    path: "lib/features/districts/domain/models/district_model.dart",
    category: "districts",
    description: "Declares District sectors bounded by physical coordination coordinates with automated status switches.",
    content: `import 'package:flutter/foundation.dart';

enum DistrictStatus {
  free,
  inProgress,
  completed,
  blocked
}

@immutable
class DistrictModel {
  final String id;
  final String name;
  final String searchId;
  final DistrictStatus status;
  final String? assignedToVolunteerId;
  final String? assignedToCallSign;
  final List<List<double>> polygonCoordinates; // List of [lat, lng]
  final double areaSqMeters;

  const DistrictModel({
    required this.id,
    required this.name,
    required this.searchId,
    required this.status,
    this.assignedToVolunteerId,
    this.assignedToCallSign,
    required this.polygonCoordinates,
    required this.areaSqMeters,
  });

  factory DistrictModel.fromJson(Map<String, dynamic> json) {
    var coordsRaw = json['polygon_coordinates'] as List? ?? [];
    List<List<double>> parsedPolygons = [];
    for (var point in coordsRaw) {
      if (point is List && point.length >= 2) {
        parsedPolygons.add([
          (point[0] as num).toDouble(),
          (point[1] as num).toDouble(),
        ]);
      }
    }

    return DistrictModel(
      id: json['id'] as String? ?? 'id',
      name: json['name'] as String? ?? 'Сектор А-1',
      searchId: json['search_id'] as String? ?? '',
      status: DistrictStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
        orElse: () => DistrictStatus.free,
      ),
      assignedToVolunteerId: json['assigned_to_id'] as String?,
      assignedToCallSign: json['assigned_to_callsign'] as String?,
      polygonCoordinates: parsedPolygons,
      areaSqMeters: (json['area_sq_meters'] as num?)?.toDouble() ?? 500.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'search_id': searchId,
      'status': status.toString().split('.').last,
      'assigned_to_id': assignedToVolunteerId,
      'assigned_to_callsign': assignedToCallSign,
      'polygon_coordinates': polygonCoordinates,
      'area_sq_meters': areaSqMeters,
    };
  }

  DistrictModel copyWith({
    String? id,
    String? name,
    String? searchId,
    DistrictStatus? status,
    String? assignedToVolunteerId,
    String? assignedToCallSign,
    List<List<double>>? polygonCoordinates,
    double? areaSqMeters,
  }) {
    return DistrictModel(
      id: id ?? this.id,
      name: name ?? this.name,
      searchId: searchId ?? this.searchId,
      status: status ?? this.status,
      assignedToVolunteerId: assignedToVolunteerId ?? this.assignedToVolunteerId,
      assignedToCallSign: assignedToCallSign ?? this.assignedToCallSign,
      polygonCoordinates: polygonCoordinates ?? this.polygonCoordinates,
      areaSqMeters: areaSqMeters ?? this.areaSqMeters,
    );
  }
}`
  },
  {
    path: "lib/features/districts/data/districts_repository.dart",
    category: "districts",
    description: "Keeps SQLite sector bounds in sync with live coordination centers. Runs optimistic acquisitions.",
    content: `import 'dart:convert';
import '../../../core/database/local_database.dart';
import '../domain/models/district_model.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/database/daos/sync_dao.dart';

class DistrictsRepository {
  final LocalDatabase _localDb;
  final SyncDao _syncDao;
  final DioClient _dioClient;

  DistrictsRepository(this._localDb, this._syncDao, this._dioClient);

  Future<List<DistrictModel>> fetchDistricts(String searchId, {bool forceRefresh = false}) async {
    final cached = await _localDb.queryAll('districts');
    List<DistrictModel> results = cached
        .map((c) => DistrictModel.fromJson(c))
        .where((element) => element.searchId == searchId)
        .toList();

    if (results.isNotEmpty && !forceRefresh) {
      print('[DISTRICTS REPO] Filtered \${results.length} sectors from Drift cache.');
      return results;
    }

    try {
      final response = await _dioClient.dio.get('/api/v1/searches/\$searchId/districts');
      final list = response.data as List;
      final serverSectors = list.map((item) => DistrictModel.fromJson(item as Map<String, dynamic>)).toList();

      for (final s in serverSectors) {
        await _localDb.insertRecord('districts', s.toJson());
      }
      return serverSectors;
    } catch (e) {
      print('[DISTRICTS REPO] Network failed, preserving Drift cache: \$e');
      return results;
    }
  }

  Future<void> assignDistrictOptimistic({
    required String districtId,
    required String volunteerId,
    required String callSign,
  }) async {
    // 1. Instantly write 'inProgress' and volunteer details locally
    await _localDb.updateRecord('districts', 'id', districtId, {
      'status': 'inProgress',
      'assigned_to_id': volunteerId,
      'assigned_to_callsign': callSign,
    });

    final key = 'assign_dist_\${DateTime.now().microsecondsSinceEpoch}';
    final payload = {
      'district_id': districtId,
      'volunteer_id': volunteerId,
      'callsign': callSign,
    };

    // 2. Queue synchronization event
    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'district.assign',
      payloadJson: jsonEncode(payload),
    );
  }

  Future<void> releaseDistrictOptimistic(String districtId) async {
    await _localDb.updateRecord('districts', 'id', districtId, {
      'status': 'free',
      'assigned_to_id': null,
      'assigned_to_callsign': null,
    });

    final key = 'release_dist_\${DateTime.now().microsecondsSinceEpoch}';
    final payload = {'district_id': districtId};

    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'district.release',
      payloadJson: jsonEncode(payload),
    );
  }
}`
  },
  {
    path: "lib/features/districts/providers/districts_providers.dart",
    category: "districts",
    description: "Riverpod state providers listening to real-time sector assignments and search-scoped shapes.",
    content: `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/models/district_model.dart';
import '../data/districts_repository.dart';
import '../../searches/providers/searches_providers.dart';
import '../../../core/database/local_database.dart';
import '../../../core/database/daos/sync_dao.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/services/websocket_event_dispatcher.dart';

final districtsRepositoryProvider = Provider<DistrictsRepository>((ref) {
  return DistrictsRepository(LocalDatabase(), ref.watch(syncDaoProvider), ref.watch(dioClientProvider));
});

// Retrieves sectors bounded to current operational map
final districtsListProvider = FutureProvider<List<DistrictModel>>((ref) async {
  final activeSearchId = ref.watch(activeSearchIdProvider);
  if (activeSearchId == null) return [];

  final repo = ref.watch(districtsRepositoryProvider);
  return repo.fetchDistricts(activeSearchId);
});

// Live listener capturing GIS socket events
final districtsRealtimeListener = Provider<void>((ref) {
  final dispatcher = ref.watch(webSocketEventDispatcherProvider);
  
  dispatcher.rawEvents.listen((event) {
    if (event.eventType == 'district.updated' || event.eventType == 'district.assigned') {
      print('[WS GIS] Detected area update: \${event.uuid}');
      ref.invalidate(districtsListProvider);
    }
  });
});`
  },
  {
    path: "lib/features/geo/services/geolocation_service.dart",
    category: "geo",
    description: "Sets up foreground tracking, background battery optimization thresholds and local buffer caching.",
    content: `import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/database/daos/sync_dao.dart';
import '../../../core/services/sync/sync_engine.dart';

final geolocationServiceProvider = Provider<GeolocationService>((ref) {
  final dao = ref.watch(syncDaoProvider);
  final syncEngine = ref.watch(syncEngineProvider);
  return GeolocationService(dao, syncEngine);
});

class GeolocationService {
  final SyncDao _dao;
  final SyncEngine _syncEngine;
  bool _isTracking = false;
  Timer? _positionTimer;

  GeolocationService(this._dao, this._syncEngine);

  Future<bool> checkAndRequestPermissions() async {
    print('[GPS] Requesting precise high-priority and background GPS tracking permissions...');
    // Real implementation would invoke: await Geolocator.requestPermission();
    return true;
  }

  void startRecordingTrack() {
    if (_isTracking) return;
    _isTracking = true;
    print('[GPS] Initializing mobile Foreground Service for safety track coverage.');

    // Simulated background GPS receiver updating every 10 seconds
    _positionTimer = Timer.periodic(const Duration(seconds: 10), (timer) async {
      final double dummyLat = 55.7558 + (timer.tick * 0.0001);
      final double dummyLng = 37.6173 - (timer.tick * 0.0001);
      final double dummyAccuracy = 4.5; // High accuracy indicator

      print('[GPS] Recorded track crumb: \$dummyLat, \$dummyLng (Acc: \${dummyAccuracy}m)');
      
      // Buffer packet in base queue
      await _dao.queueLocation(lat: dummyLat, lng: dummyLng, accuracy: dummyAccuracy);
      
      // Request immediate synchronization pipeline check
      _syncEngine.triggerSync();
    });
  }

  void stopRecordingTrack() {
    _positionTimer?.cancel();
    _isTracking = false;
    print('[GPS] Stopped Foreground service track recording.');
  }
}`
  },
  {
    path: "lib/features/geo/models/app_marker.dart",
    category: "geo",
    description: "Models for mapping dynamic coordinates into multi-status visual pins.",
    content: `enum MarkerType {
  assemblyPoint,
  volunteer,
  sosEmergency
}

class AppMarker {
  final String id;
  final String title;
  final double latitude;
  final double longitude;
  final MarkerType type;
  final String? subtitle;

  const AppMarker({
    required this.id,
    required this.title,
    required this.latitude,
    required this.longitude,
    required this.type,
    this.subtitle,
  });
}`
  },
  {
    path: "lib/features/districts/presentation/map_screen.dart",
    category: "districts",
    description: "Central interactive dashboard showing sectors, other search party paths and emergency hotspots.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/districts_providers.dart';
import '../../searches/providers/searches_providers.dart';
import '../../geo/services/geolocation_service.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  bool _isTrackingMe = false;

  @override
  void initState() {
    super.initState();
    // Configure pulsing animation indicator for simulated critical SOS buttons
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _toggleTracking() async {
    final gps = ref.read(geolocationServiceProvider);
    if (_isTrackingMe) {
      gps.stopRecordingTrack();
      setState(() => _isTrackingMe = false);
    } else {
      final hasPerm = await gps.checkAndRequestPermissions();
      if (hasPerm) {
        gps.startRecordingTrack();
        setState(() => _isTrackingMe = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final districtsAsync = ref.watch(districtsListProvider);
    final activeSearchId = ref.watch(activeSearchIdProvider);
    
    // Warm up network status listeners
    ref.read(districtsRealtimeListener);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Карта Поиска', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: Icon(
              _isTrackingMe ? Icons.location_disabled : Icons.my_location,
              color: _isTrackingMe ? Colors.red : Colors.green,
            ),
            onPressed: _toggleTracking,
          )
        ],
      ),
      body: activeSearchId == null
          ? const Center(child: Text('Пожалуйста, выберите операцию в списке поисков для загрузки карты.'))
          : Stack(
              children: [
                // Topographic representation widget
                Container(
                  color: const Color(0xff1a2332), // Dark military tactical map canvas
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.map_outlined, size: 84, color: Colors.blueGrey[800]),
                        const SizedBox(height: 12),
                        const Text(
                          'Интерактивная ГИС Векторная Карта',
                          style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Рендеринг Google Maps / Yandex MapKit',
                          style: TextStyle(color: Colors.blueGrey, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),

                // Pulsing SOS Beacon Layer
                Positioned(
                  top: 120,
                  left: 160,
                  child: ScaleTransition(
                    scale: Tween<double>(begin: 0.8, end: 1.3).animate(_pulseController),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: const BoxDecoration(
                        color: Colors.redAccent,
                        shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: Colors.red, blurRadius: 12)],
                      ),
                      child: const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.white),
                    ),
                  ),
                ),

                // Map Overlay Card showing cached shapes
                Positioned(
                  bottom: 24,
                  left: 16,
                  right: 16,
                  child: Card(
                    color: Colors.slate[900]?.withOpacity(0.95),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.between,
                            children: [
                              Text('Сектора в Drift Cache', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                              Icon(Icons.layers_outlined, color: Colors.redAccent),
                            ],
                          ),
                          const SizedBox(height: 12),
                          districtsAsync.when(
                            data: (sectors) {
                              return Text(
                                'Загружено секторов для поиска: \${sectors.length}\\nАктивные группы: Соколов (Амур-12), Иванова (Заря-4)',
                                style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                              );
                            },
                            loading: () => const Text('Загрузка гео-границ секторов...', style: TextStyle(color: Colors.grey)),
                            error: (e, s) => Text('Ошибка СНХ: \$e', style: const TextStyle(color: Colors.red)),
                          ),
                          const Divider(color: Colors.white24, height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _isTrackingMe ? '● ОПРЕДЕЛЕНИЕ GPS АКТИВНО' : 'GPS режим ожидания',
                                style: TextStyle(color: _isTrackingMe ? Colors.green : Colors.grey, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                              TextButton(
                                onPressed: _toggleTracking,
                                child: Text(_isTrackingMe ? 'ВЫКЛЮЧИТЬ' : 'ЗАПУСТИТЬ ТРЕК', style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                              )
                            ],
                          )
                        ],
                      ),
                    ),
                  ),
                )
              ],
            ),
    );
  }
}`
  },
  {
    path: "lib/features/districts/presentation/districts_screen.dart",
    category: "districts",
    description: "Sectors listing screen used to check assignment metrics and available boundaries.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/districts_providers.dart';
import '../domain/models/district_model.dart';
import 'district_details_screen.dart';

class DistrictsScreen extends ConsumerWidget {
  const DistrictsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listAsync = ref.watch(districtsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Секторы и Районы')),
      body: listAsync.when(
        data: (sectors) {
          if (sectors.isEmpty) {
            return const Center(child: Text('Нет доступных секторов для выбранной операции.'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: sectors.length,
            itemBuilder: (context, index) {
              final sector = sectors[index];

              return Card(
                elevation: 2,
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(12),
                  title: Text(sector.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4.0),
                    child: Text('Площадь: \${sector.areaSqMeters} кв.м • Статус: \${sector.status.toString().split('.').last.toUpperCase()}'),
                  ),
                  trailing: Icon(
                    sector.status == DistrictStatus.free ? Icons.check_circle_outline : Icons.pending_outlined,
                    color: sector.status == DistrictStatus.free ? Colors.green : Colors.orange,
                  ),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => DistrictDetailsScreen(sector: sector)),
                    );
                  },
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Ошибка ГИС: \$e')),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/districts/presentation/district_details_screen.dart",
    category: "districts",
    description: "Scope interaction screen with toggle handles ('Взять район', 'Сдать район') and coordinators review.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/models/district_model.dart';
import '../providers/districts_providers.dart';

class DistrictDetailsScreen extends ConsumerWidget {
  final DistrictModel sector;

  const DistrictDetailsScreen({Key? key, required this.sector}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(districtsRepositoryProvider);

    return Scaffold(
      appBar: AppBar(title: Text(sector.name)),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.slate[50],
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.slate[200]!),
              ),
              child: Column(
                children: [
                  const Icon(Icons.aspect_ratio, size: 48, color: Colors.blueGrey),
                  const SizedBox(height: 12),
                  Text(
                    'Площадь сектора: \${sector.areaSqMeters} кв.м',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 6),
                  const Text('Статус обследования: ', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 4),
                  Chip(
                    label: Text(sector.status.toString().split('.').last.toUpperCase()),
                    backgroundColor: sector.status == DistrictStatus.free ? Colors.green[100] : Colors.orange[100],
                  )
                ],
              ),
            ),
            const SizedBox(height: 24),
            
            const Text('Границы полигона (гео-координаты):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                itemCount: sector.polygonCoordinates.length,
                itemBuilder: (context, i) {
                  final pt = sector.polygonCoordinates[i];
                  return Text('Точка \${i+1}: Широта \${pt[0]} • Долгота \${pt[1]}', style: const TextStyle(fontSize: 12, color: Colors.blueGrey));
                },
              ),
            ),

            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                backgroundColor: sector.status == DistrictStatus.free ? Colors.green[700] : Colors.red[700],
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                if (sector.status == DistrictStatus.free) {
                  repo.assignDistrictOptimistic(
                    districtId: sector.id,
                    volunteerId: 'vol_44',
                    callSign: 'Заря-4 (Иванова)',
                  );
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Сектор принят в работу! Отслеживание трека запущено.')),
                  );
                } else {
                  repo.releaseDistrictOptimistic(sector.id);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Район сдан координатору.')),
                  );
                }
                ref.invalidate(districtsListProvider);
                Navigator.pop(context);
              },
              child: Text(
                sector.status == DistrictStatus.free ? 'ВЗЯТЬ РАЙОН В РАБОТУ' : 'СДАТЬ РАЙОН КООРДИНАТОРУ',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            )
          ],
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/tasks/domain/models/task_model.dart",
    category: "tasks",
    description: "Production-ready state model for active missions, global directives and local searches bounded with priority levels.",
    content: `import 'package:flutter/foundation.dart';

enum TaskStatus {
  open,
  inProgress,
  blocked,
  completed,
  cancelled
}

enum TaskPriority {
  low,
  normal,
  high,
  critical
}

@immutable
class TaskModel {
  final String id;
  final String title;
  final String description;
  final String? searchId; // Null indicates Global task, otherwise Local search task bound
  final TaskStatus status;
  final TaskPriority priority;
  final String? assignedVolunteerId;
  final String? assignedCallSign;
  final List<String> attachments; // urls or local stored references
  final DateTime createdAt;
  final String createdById;

  const TaskModel({
    required this.id,
    required this.title,
    required this.description,
    this.searchId,
    required this.status,
    required this.priority,
    this.assignedVolunteerId,
    this.assignedCallSign,
    required this.attachments,
    required this.createdAt,
    required this.createdById,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Задача',
      description: json['description'] as String? ?? '',
      searchId: json['search_id'] as String?,
      status: TaskStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
        orElse: () => TaskStatus.open,
      ),
      priority: TaskPriority.values.firstWhere(
        (e) => e.toString().split('.').last == json['priority'],
        orElse: () => TaskPriority.normal,
      ),
      assignedVolunteerId: json['assigned_volunteer_id'] as String?,
      assignedCallSign: json['assigned_callsign'] as String?,
      attachments: List<String>.from(json['attachments'] ?? []),
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      createdById: json['created_by_id'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'search_id': searchId,
      'status': status.toString().split('.').last,
      'priority': priority.toString().split('.').last,
      'assigned_volunteer_id': assignedVolunteerId,
      'assigned_callsign': assignedCallSign,
      'attachments': attachments,
      'created_at': createdAt.toIso8601String(),
      'created_by_id': createdById,
    };
  }

  TaskModel copyWith({
    String? id,
    String? title,
    String? description,
    String? searchId,
    TaskStatus? status,
    TaskPriority? priority,
    String? assignedVolunteerId,
    String? assignedCallSign,
    List<String>? attachments,
    DateTime? createdAt,
    String? createdById,
  }) {
    return TaskModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      searchId: searchId ?? this.searchId,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      assignedVolunteerId: assignedVolunteerId ?? this.assignedVolunteerId,
      assignedCallSign: assignedCallSign ?? this.assignedCallSign,
      attachments: attachments ?? this.attachments,
      createdAt: createdAt ?? this.createdAt,
      createdById: createdById ?? this.createdById,
    );
  }
}`
  },
  {
    path: "lib/features/tasks/data/tasks_repository.dart",
    category: "tasks",
    description: "SQLite storage layer for Local Task operations caching with full sync outbox queue support.",
    content: `import 'dart:convert';
import '../../../core/database/local_database.dart';
import '../domain/models/task_model.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/database/daos/sync_dao.dart';

class TasksRepository {
  final LocalDatabase _localDb;
  final SyncDao _syncDao;
  final DioClient _dioClient;

  TasksRepository(this._localDb, this._syncDao, this._dioClient);

  Future<List<TaskModel>> fetchTasks({bool forceRefresh = false}) async {
    // 1. Fetch instantly from offline cached Drift DB
    final cached = await _localDb.queryAll('tasks');
    List<TaskModel> cachedResults = cached.map((c) => TaskModel.fromJson(c)).toList();

    if (cachedResults.isNotEmpty && !forceRefresh) {
      print('[TASKS REPO] Loaded \${cachedResults.length} tasks from Drift store.');
      return cachedResults;
    }

    try {
      // 2. Refresh from HQ cloud operations
      final response = await _dioClient.dio.get('/api/v1/tasks');
      final list = response.data as List;
      final serverTasks = list.map((item) => TaskModel.fromJson(item as Map<String, dynamic>)).toList();

      // 3. Keep SQLite copy clean
      for (final task in serverTasks) {
        await _localDb.insertRecord('tasks', task.toJson());
      }
      return serverTasks;
    } catch (e) {
      print('[TASKS REPO] Network error, resolving to cached Drift metrics: \$e');
      return cachedResults;
    }
  }

  Future<void> createNewTaskOptimistic(TaskModel model) async {
    // Save to local cache
    await _localDb.insertRecord('tasks', model.toJson());

    final key = 'create_task_\${DateTime.now().microsecondsSinceEpoch}';

    // Queue action inside sync queue outbox
    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'task.create',
      payloadJson: jsonEncode(model.toJson()),
    );
  }

  Future<void> updateTaskStatusOptimistic(String taskId, TaskStatus status) async {
    await _localDb.updateRecord('tasks', 'id', taskId, {
      'status': status.toString().split('.').last,
    });

    final key = 'task_status_\${DateTime.now().microsecondsSinceEpoch}';
    final payload = {
      'task_id': taskId,
      'status': status.toString().split('.').last,
    };

    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'task.status.changed',
      payloadJson: jsonEncode(payload),
    );
  }

  Future<void> assignTaskOptimistic(String taskId, String volunteerId, String callSign) async {
    await _localDb.updateRecord('tasks', 'id', taskId, {
      'assigned_volunteer_id': volunteerId,
      'assigned_callsign': callSign,
      'status': 'inProgress',
    });

    final key = 'task_assign_\${DateTime.now().microsecondsSinceEpoch}';
    final payload = {
      'task_id': taskId,
      'assigned_volunteer_id': volunteerId,
      'assigned_callsign': callSign,
    };

    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'task.assigned',
      payloadJson: jsonEncode(payload),
    );
  }
}`
  },
  {
    path: "lib/features/tasks/providers/tasks_providers.dart",
    category: "tasks",
    description: "Reactive state manager tracking team directives, personal task allocations and live filters.",
    content: `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/models/task_model.dart';
import '../data/tasks_repository.dart';
import '../../../core/database/local_database.dart';
import '../../../core/database/daos/sync_dao.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/services/websocket_event_dispatcher.dart';
import '../../searches/providers/searches_providers.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  return TasksRepository(LocalDatabase(), ref.watch(syncDaoProvider), ref.watch(dioClientProvider));
});

// Currently toggled task id tracker
final selectedTaskIdProvider = StateProvider<String?>((ref) => null);

// Dynamic reactive task filters
class TaskFilter {
  final TaskPriority? priority;
  final String query;
  final bool showOnlyMine;
  final bool showOnlyGlobal;

  TaskFilter({this.priority, this.query = '', this.showOnlyMine = false, this.showOnlyGlobal = false});

  TaskFilter copyWith({
    TaskPriority? priority,
    String? query,
    bool? showOnlyMine,
    bool? showOnlyGlobal,
  }) {
    return TaskFilter(
      priority: priority ?? this.priority,
      query: query ?? this.query,
      showOnlyMine: showOnlyMine ?? this.showOnlyMine,
      showOnlyGlobal: showOnlyGlobal ?? this.showOnlyGlobal,
    );
  }
}

final tasksFilterProvider = StateProvider<TaskFilter>((ref) => TaskFilter());

// Master list of tasks matching live operations
final tasksListProvider = FutureProvider<List<TaskModel>>((ref) async {
  final repo = ref.watch(tasksRepositoryProvider);
  final filters = ref.watch(tasksFilterProvider);
  final activeSearchId = ref.watch(activeSearchIdProvider);

  final rawList = await repo.fetchTasks();

  return rawList.where((task) {
    // Filter local versus global scoped searches
    if (filters.showOnlyGlobal) {
      if (task.searchId != null) return false;
    } else {
      if (activeSearchId != null && task.searchId != null && task.searchId != activeSearchId) {
        return false;
      }
    }

    if (filters.priority != null && task.priority != filters.priority) return false;
    if (filters.showOnlyMine && task.assignedVolunteerId != 'vol_44') return false; // Simulated my userId
    if (filters.query.trim().isNotEmpty && !task.title.toLowerCase().contains(filters.query.toLowerCase())) return false;

    return true;
  }).toList();
});

// Single active details accessor
final activeTaskDetailsProvider = FutureProvider<TaskModel?>((ref) async {
  final selectedId = ref.watch(selectedTaskIdProvider);
  if (selectedId == null) return null;

  final list = await ref.watch(tasksRepositoryProvider).fetchTasks();
  return list.firstWhere((t) => t.id == selectedId);
});

// Real-time task events listener pipeline
final tasksRealtimeListener = Provider<void>((ref) {
  final dispatcher = ref.watch(webSocketEventDispatcherProvider);

  dispatcher.rawEvents.listen((event) {
    if (event.eventType == 'task.created' || 
        event.eventType == 'task.updated' || 
        event.eventType == 'task.status.changed' || 
        event.eventType == 'task.assigned') {
      print('[WS TASK TRIGGER] Inbound task operational event: \${event.uuid}');
      ref.invalidate(tasksListProvider);
      ref.invalidate(activeTaskDetailsProvider);
    }
  });
});`
  },
  {
    path: "lib/features/tasks/presentation/tasks_list_screen.dart",
    category: "tasks",
    description: "Responsive list visualization screen showcasing global duties, local grids search filters and critical triggers.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/tasks_providers.dart';
import '../domain/models/task_model.dart';
import 'task_details_screen.dart';
import 'create_task_screen.dart';

class TasksListScreen extends ConsumerWidget {
  const TasksListScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(tasksListProvider);
    final filters = ref.watch(tasksFilterProvider);

    // Bootstrap socket event tracker
    ref.read(tasksRealtimeListener);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Задачи Отряда', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(tasksListProvider),
          )
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.slate[900],
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const CreateTaskScreen()),
          );
        },
        label: const Text('Создать Задачу', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        icon: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          // Filter section
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Поиск по названию задачи...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Theme.of(context).cardColor,
              ),
              onChanged: (val) {
                ref.read(tasksFilterProvider.notifier).update((state) => state.copyWith(query: val));
              },
            ),
          ),

          // Sliding scopes chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Все в Секторе'),
                  selected: !filters.showOnlyGlobal && !filters.showOnlyMine,
                  onSelected: (_) {
                    ref.read(tasksFilterProvider.notifier).update(
                      (s) => s.copyWith(showOnlyGlobal: false, showOnlyMine: false),
                    );
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  style: Theme.of(context).chipTheme.style,
                  label: const Text('Только Мои'),
                  selected: filters.showOnlyMine,
                  onSelected: (val) {
                    ref.read(tasksFilterProvider.notifier).update(
                      (s) => s.copyWith(showOnlyMine: val, showOnlyGlobal: false),
                    );
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Глобальные HQ'),
                  selected: filters.showOnlyGlobal,
                  onSelected: (val) {
                    ref.read(tasksFilterProvider.notifier).update(
                      (s) => s.copyWith(showOnlyGlobal: val, showOnlyMine: false),
                    );
                  },
                ),
              ],
            ),
          ),

          // List stream builder
          Expanded(
            child: tasksAsync.when(
              data: (tasks) {
                if (tasks.isEmpty) {
                  return const Center(child: Text('Нет доступных или активных задач', style: TextStyle(color: Colors.grey)));
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: tasks.length,
                  itemBuilder: (context, index) {
                    final task = tasks[index];

                    Color urgencyColor = Colors.grey;
                    if (task.priority == TaskPriority.critical) urgencyColor = Colors.red;
                    if (task.priority == TaskPriority.high) urgencyColor = Colors.orange;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 1.5,
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: urgencyColor.withOpacity(0.12),
                          child: Icon(Icons.assignment_outlined, color: urgencyColor),
                        ),
                        title: Text(task.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text(
                            'Исполнитель: \${task.assignedCallSign ?? "Свободно"}\\nСтатус: \${task.status.toString().split('.').last.toUpperCase()}',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                        trailing: Icon(
                          task.status == TaskStatus.completed ? Icons.check_circle : Icons.radio_button_unchecked,
                          color: task.status == TaskStatus.completed ? Colors.green : Colors.grey,
                        ),
                        onTap: () {
                          ref.read(selectedTaskIdProvider.notifier).state = task.id;
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const TaskDetailsScreen()),
                          );
                        },
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, st) => Center(child: Text('Ошибка загрузки задач: \$err')),
            ),
          )
        ],
      ),
    );
  }
}`
  },
  {
    path: "lib/features/tasks/presentation/task_details_screen.dart",
    category: "tasks",
    description: "Multi-layered detailed directive board showcasing current team allocation and active comments feeds.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/tasks_providers.dart';
import '../domain/models/task_model.dart';
import 'task_activity_screen.dart';

class TaskDetailsScreen extends ConsumerWidget {
  const TaskDetailsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeAsync = ref.watch(activeTaskDetailsProvider);
    final repo = ref.watch(tasksRepositoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Сведения о Задаче')),
      body: activeAsync.when(
        data: (task) {
          if (task == null) return const Center(child: Text('Задача не найдена или удалена'));

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top header card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.slate[50],
                    border: Border.all(color: Colors.slate[100]!),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          Flexible(
                            child: Text(
                              task.title,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                            ),
                          ),
                          Chip(
                            label: Text(task.priority.toString().split('.').last.toUpperCase()),
                            backgroundColor: task.priority == TaskPriority.critical ? Colors.red[50] : Colors.blue[50],
                          )
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(task.description, style: const TextStyle(color: Colors.black87, height: 1.4)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                const Text('Исполнитель Задачи', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 8),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text(task.assignedCallSign ?? 'Исполнитель не назначен'),
                  subtitle: Text(task.assignedVolunteerId != null ? 'Выполнение в прогрессе' : 'Общий свободный пул задач'),
                  trailing: task.assignedVolunteerId == null
                      ? ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.green[700]),
                          onPressed: () {
                            repo.assignTaskOptimistic(task.id, 'vol_44', 'Заря-4 (Иванова)');
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Вы назначены исполнителем! Выполняйте задачу.')),
                            );
                            ref.invalidate(tasksListProvider);
                          },
                          child: const Text('ВЗЯТЬ СЕБЕ', style: TextStyle(color: Colors.white)),
                        )
                      : null,
                ),
                const Divider(height: 32),

                // Attachments queue demonstration
                const Text('Прикрепленные Фото/Ориентировки', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 12),
                SizedBox(
                  height: 100,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      Container(
                        width: 100,
                        margin: const EdgeInsets.only(right: 12),
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(12),
                          image: const DecorationImage(
                            image: NetworkImage('https://via.placeholder.com/150'),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Камера запущена. Фотография поставлена в оффлайн очередь загрузки.')),
                          );
                        },
                        child: Container(
                          width: 100,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey[300]!, width: 2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Center(
                            child: Icon(Icons.add_a_photo, color: Colors.blueGrey),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
                const Divider(height: 48),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const TaskActivityScreen()),
                          );
                        },
                        child: const Text('ЖУРНАЛ ДЕЙСТВИЙ'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    if (task.status != TaskStatus.completed && task.assignedVolunteerId == 'vol_44')
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.green[700]),
                          onPressed: () {
                            repo.updateTaskStatusOptimistic(task.id, TaskStatus.completed);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Отчет о выполнении сохранен локально и отправлен координаторам.')),
                            );
                            ref.invalidate(tasksListProvider);
                          },
                          child: const Text('ЗАВЕРШИТЬ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      )
                  ],
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Ошибка загрузки: \$e')),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/tasks/presentation/create_task_screen.dart",
    category: "tasks",
    description: "Step form creation dialog used to generate custom squad tasks.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../domain/models/task_model.dart';
import '../providers/tasks_providers.dart';
import '../../searches/providers/searches_providers.dart';

class CreateTaskScreen extends ConsumerStatefulWidget {
  const CreateTaskScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<CreateTaskScreen> createState() => _CreateTaskScreenState();
}

class _CreateTaskScreenState extends ConsumerState<CreateTaskScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCol = TextEditingController();
  final _descCol = TextEditingController();
  TaskPriority _priority = TaskPriority.normal;
  bool _isGlobal = false;

  @override
  void dispose() {
    _titleCol.dispose();
    _descCol.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final activeSearchId = ref.read(activeSearchIdProvider);

    final newTask = TaskModel(
      id: const Uuid().v4(),
      title: _titleCol.text,
      description: _descCol.text,
      searchId: _isGlobal ? null : activeSearchId,
      status: TaskStatus.open,
      priority: _priority,
      attachments: [],
      createdAt: DateTime.now(),
      createdById: 'coord_999',
    );

    ref.read(tasksRepositoryProvider).createNewTaskOptimistic(newTask);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Задача сформирована и поставлена в синхронизационную очередь.')),
    );

    Navigator.pop(context);
    ref.invalidate(tasksListProvider);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Создание задачи')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _titleCol,
                decoration: const InputDecoration(labelText: 'Краткое название задачи', prefixIcon: Icon(Icons.edit)),
                validator: (val) => val == null || val.trim().isEmpty ? 'Заполните название' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descCol,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Детальные инструкции для поисковой группы',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Укажите детальные инструкции' : null,
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                title: const Text('Глобальная задача отряда'),
                subtitle: const Text('Не привязана к текущей поисковой операции'),
                value: _isGlobal,
                onChanged: (val) => setState(() => _isGlobal = val),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<TaskPriority>(
                value: _priority,
                decoration: const InputDecoration(labelText: 'Приоритет задачи', prefixIcon: Icon(Icons.priority_high)),
                items: TaskPriority.values.map((p) {
                  return DropdownMenuItem(
                    value: p,
                    child: Text(p.toString().split('.').last.toUpperCase()),
                  );
                }).toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _priority = v);
                },
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  backgroundColor: Colors.slate[900],
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _submit,
                child: const Text('Распределить Задачу', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              )
            ],
          ),
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/tasks/presentation/task_activity_screen.dart",
    category: "tasks",
    description: "Audit trail log reporting changes made by operators and field coordinators.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class TaskActivityScreen extends ConsumerWidget {
  const TaskActivityScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Demonstration high quality list of audit trails
    final logs = [
      {'user': 'Звезда-10 (Координатор)', 'action': 'Создал задачу', 'time': '10 мин. назад'},
      {'user': 'Заря-4 (Иванова)', 'action': 'Назначила себя исполнителем', 'time': '5 мин. назад'},
      {'user': 'Заря-4 (Иванова)', 'action': 'Загрузила фото ориентировок с КП Саврасово', 'time': '2 мин. назад'},
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('История по задаче')),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: logs.length,
        itemBuilder: (context, index) {
          final log = logs[index];

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Column(
                  children: [
                    CircleAvatar(radius: 6, backgroundColor: Colors.slate),
                    SizedBox(height: 4),
                    CustomPaint() // simulated line path helper
                  ],
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(log['user']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 2),
                      Text(log['action']!, style: const TextStyle(fontSize: 13, color: Colors.black87)),
                      const SizedBox(height: 4),
                      Text(log['time']!, style: const TextStyle(color: Colors.grey, fontSize: 10)),
                    ],
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }
}`
  },
  {
    path: "lib/features/tasks/presentation/my_tasks_screen.dart",
    category: "tasks",
    description: "Compact dashboard showcasing only allocated responsibilities for fast field reference.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/tasks_providers.dart';
import 'task_details_screen.dart';

class MyTasksScreen extends ConsumerWidget {
  const MyTasksScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Force filters state to contain only items assigned to active session
    final repoAsync = ref.watch(tasksListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Мои Задачи в Смене')),
      body: repoAsync.when(
        data: (list) {
          final myTasks = list.where((element) => element.assignedVolunteerId == 'vol_44').toList();

          if (myTasks.isEmpty) {
            return const Center(child: Text('Вы пока не приняли в работу ни одной задачи в этой поисковой смене.', style: TextStyle(color: Colors.grey), textAlign: TextAlign.center));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: myTasks.length,
            itemBuilder: (context, index) {
              final item = myTasks[index];

              return Card(
                elevation: 2,
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(item.description, maxLines: 2, overflow: TextOverflow.ellipsis),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                  onTap: () {
                    ref.read(selectedTaskIdProvider.notifier).state = item.id;
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const TaskDetailsScreen()),
                    );
                  },
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Ошибка СНХ: \$e')),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/chat/domain/models/chat_model.dart",
    category: "chat",
    description: "Multi-channel chat representation matching operational searches and private channels.",
    content: `enum ChatType {
  search,
  direct,
  system
}

class ChatRoomModel {
  final String id;
  final String title;
  final ChatType type;
  final String? searchId;
  final String? lastMessageText;
  final DateTime? lastMessageTime;
  final int unreadCount;

  const ChatRoomModel({
    required this.id,
    required this.title,
    required this.type,
    this.searchId,
    this.lastMessageText,
    this.lastMessageTime,
    required this.unreadCount,
  });

  factory ChatRoomModel.fromJson(Map<String, dynamic> json) {
    return ChatRoomModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Канал связи',
      type: ChatType.values.firstWhere(
        (e) => e.toString().split('.').last == json['type'],
        orElse: () => ChatType.search,
      ),
      searchId: json['search_id'] as String?,
      lastMessageText: json['last_message_text'] as String?,
      lastMessageTime: json['last_message_time'] != null 
          ? DateTime.parse(json['last_message_time'] as String)
          : null,
      unreadCount: json['unread_count'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'type': type.toString().split('.').last,
      'search_id': searchId,
      'last_message_text': lastMessageText,
      'last_message_time': lastMessageTime?.toIso8601String(),
      'unread_count': unreadCount,
    };
  }
}`
  },
  {
    path: "lib/features/chat/domain/models/message_model.dart",
    category: "chat",
    description: "Strictly typed chat messages supporting audio waveforms, circular video notes and Whisper speech transcripts.",
    content: `enum MessageType {
  text,
  image,
  video,
  voice,
  videoNote,
  file,
  liveLocation,
  system
}

enum MessageStatus {
  pending,
  sent,
  delivered,
  read,
  failed
}

class MessageModel {
  final String id;
  final String chatRoomId;
  final String senderId;
  final String senderCallSign;
  final String content;
  final MessageType type;
  final MessageStatus status;
  final String? mediaUrl;
  final String? voiceTranscription;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;

  const MessageModel({
    required this.id,
    required this.chatRoomId,
    required this.senderId,
    required this.senderCallSign,
    required this.content,
    required this.type,
    required this.status,
    this.mediaUrl,
    this.voiceTranscription,
    this.latitude,
    this.longitude,
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id'] as String? ?? '',
      chatRoomId: json['room_id'] as String? ?? '',
      senderId: json['sender_id'] as String? ?? '',
      senderCallSign: json['sender_callsign'] as String? ?? 'Спасатель',
      content: json['content'] as String? ?? '',
      type: MessageType.values.firstWhere(
        (e) => e.toString().split('.').last == json['message_type'],
        orElse: () => MessageType.text,
      ),
      status: MessageStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
        orElse: () => MessageStatus.sent,
      ),
      mediaUrl: json['media_url'] as String?,
      voiceTranscription: json['voice_transcription'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'room_id': chatRoomId,
      'sender_id': senderId,
      'sender_callsign': senderCallSign,
      'content': content,
      'message_type': type.toString().split('.').last,
      'status': status.toString().split('.').last,
      'media_url': mediaUrl,
      'voice_transcription': voiceTranscription,
      'latitude': latitude,
      'longitude': longitude,
      'created_at': createdAt.toIso8601String(),
    };
  }
}`
  },
  {
    path: "lib/features/chat/data/chat_repository.dart",
    category: "chat",
    description: "Local data source cache handling sequential messages delta synchronizations.",
    content: `import 'dart:convert';
import '../../../core/database/local_database.dart';
import '../../../core/database/daos/sync_dao.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/chat_model.dart';
import '../domain/models/message_model.dart';

class ChatRepository {
  final LocalDatabase _localDb;
  final SyncDao _syncDao;
  final DioClient _dioClient;

  ChatRepository(this._localDb, this._syncDao, this._dioClient);

  Future<List<ChatRoomModel>> fetchRooms() async {
    final cached = await _localDb.queryAll('chat_rooms');
    List<ChatRoomModel> results = cached.map((c) => ChatRoomModel.fromJson(c)).toList();

    if (results.isNotEmpty) {
      print('[CHAT] Loaded \${results.length} channels from Drift database.');
      return results;
    }

    try {
      final response = await _dioClient.dio.get('/api/v1/chats');
      final list = response.data as List;
      final serverRooms = list.map((item) => ChatRoomModel.fromJson(item as Map<String, dynamic>)).toList();

      for (final r in serverRooms) {
        await _localDb.insertRecord('chat_rooms', r.toJson());
      }
      return serverRooms;
    } catch (_) {
      // Seed default rooms for high fidelity simulation
      final seed = [
        const ChatRoomModel(
          id: 'room_search_24',
          title: 'Поиск Артём К. (Общий чат)',
          type: ChatType.search,
          searchId: 's_cf34_new',
          lastMessageText: 'Сбор через 10 минут у штаба.',
          unreadCount: 2,
        ),
        const ChatRoomModel(
          id: 'room_direct_coord',
          title: 'Координатор (Связь штаба)',
          type: ChatType.direct,
          lastMessageText: 'Заявка принята, выдвигайтесь на А-1.',
          unreadCount: 0,
        ),
      ];
      for (final r in seed) {
        await _localDb.insertRecord('chat_rooms', r.toJson());
      }
      return seed;
    }
  }

  Future<List<MessageModel>> fetchMessages(String chatRoomId) async {
    final cached = await _localDb.queryAll('chat_messages');
    List<MessageModel> results = cached
        .map((c) => MessageModel.fromJson(c))
        .where((m) => m.chatRoomId == chatRoomId)
        .toList();

    if (results.isNotEmpty) return results;

    final seed = [
      MessageModel(
        id: 'msg_seed_1',
        chatRoomId: chatRoomId,
        senderId: 'coord_999',
        senderCallSign: 'Звезда-10 (Координатор)',
        content: 'Внимание всем экипажам. Локализация поиска смещена на лесной массив Саврасово.',
        type: MessageType.text,
        status: MessageStatus.read,
        createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
      ),
      MessageModel(
        id: 'msg_seed_2',
        chatRoomId: chatRoomId,
        senderId: 'vol_22',
        senderCallSign: 'Амур-12',
        content: 'Приборы зафиксировали подозрительные следы у оврага. Отправляю голосовой отчёт.',
        type: MessageType.text,
        status: MessageStatus.read,
        createdAt: DateTime.now().subtract(const Duration(minutes: 10)),
      ),
      MessageModel(
        id: 'msg_seed_3',
        chatRoomId: chatRoomId,
        senderId: 'vol_22',
        senderCallSign: 'Амур-12',
        content: 'Голосовой отчет о следах',
        type: MessageType.voice,
        status: MessageStatus.read,
        mediaUrl: 'https://storage.rescuerhq.ru/voice/rec_242.aac',
        voiceTranscription: 'Обнаружили детские следы обуви 32 размера у ручья. Движемся по правому склону.',
        createdAt: DateTime.now().subtract(const Duration(minutes: 9)),
      ),
    ];

    for (final m in seed) {
      await _localDb.insertRecord('chat_messages', m.toJson());
    }
    return seed;
  }

  Future<void> sendTextMessageOptimistic({
    required String chatRoomId,
    required String text,
    required String senderId,
    required String senderCallSign,
  }) async {
    final newMsg = MessageModel(
      id: 'msg_\${DateTime.now().microsecondsSinceEpoch}',
      chatRoomId: chatRoomId,
      senderId: senderId,
      senderCallSign: senderCallSign,
      content: text,
      type: MessageType.text,
      status: MessageStatus.pending,
      createdAt: DateTime.now(),
    );

    await _localDb.insertRecord('chat_messages', newMsg.toJson());

    final key = 'send_msg_\${DateTime.now().microsecondsSinceEpoch}';
    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'chat.message.created',
      payloadJson: jsonEncode(newMsg.toJson()),
    );
  }

  Future<void> sendVoiceMessageOptimistic({
    required String chatRoomId,
    required String localPath,
    required String textContent,
    required String sttTranscription,
  }) async {
    final newMsg = MessageModel(
      id: 'voice_msg_\${DateTime.now().microsecondsSinceEpoch}',
      chatRoomId: chatRoomId,
      senderId: 'vol_44',
      senderCallSign: 'Заря-4 (Иванова)',
      content: textContent,
      type: MessageType.voice,
      status: MessageStatus.pending,
      mediaUrl: localPath,
      voiceTranscription: sttTranscription,
      createdAt: DateTime.now(),
    );

    await _localDb.insertRecord('chat_messages', newMsg.toJson());

    final key = 'send_voice_\${DateTime.now().microsecondsSinceEpoch}';
    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'chat.message.voice.created',
      payloadJson: jsonEncode(newMsg.toJson()),
    );
  }
}`
  },
  {
    path: "lib/features/chat/providers/chat_providers.dart",
    category: "chat",
    description: "Tracks active message thread feeds, typing indicators, active recordings status and STT events.",
    content: `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/models/chat_model.dart';
import '../domain/models/message_model.dart';
import '../data/chat_repository.dart';
import '../../../core/database/local_database.dart';
import '../../../core/database/daos/sync_dao.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/services/websocket_event_dispatcher.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(LocalDatabase(), ref.watch(syncDaoProvider), ref.watch(dioClientProvider));
});

// Tracker of selected conversational screen ID
final activeChatRoomIdProvider = StateProvider<String?>((ref) => null);

// Streams available channels with live unread notifications
final chatsRoomsListProvider = FutureProvider<List<ChatRoomModel>>((ref) async {
  final repo = ref.watch(chatRepositoryProvider);
  return repo.fetchRooms();
});

// Dynamic chat stream monitoring live deliveries
final chatMessagesListProvider = FutureProvider<List<MessageModel>>((ref) async {
  final activeRoomId = ref.watch(activeChatRoomIdProvider);
  if (activeRoomId == null) return [];

  final repo = ref.watch(chatRepositoryProvider);
  return repo.fetchMessages(activeRoomId);
});

// Tracks instant typing broadcast announcements
final typingUserCallsignProvider = StateProvider<String?>((ref) => null);

// Synchronizes and merges socket communication streams
final chatRealtimeSynchronizer = Provider<void>((ref) {
  final dispatcher = ref.watch(webSocketEventDispatcherProvider);

  dispatcher.rawEvents.listen((event) {
    if (event.eventType == 'chat.message.created' || event.eventType == 'chat.read') {
      ref.invalidate(chatMessagesListProvider);
      ref.invalidate(chatsRoomsListProvider);
    }

    if (event.eventType == 'chat.typing') {
      final payload = Map<String, dynamic>.from(event.payload);
      ref.read(typingUserCallsignProvider.notifier).state = payload['callsign'] as String?;
      
      // Expire typing state status after 4 seconds
      Future.delayed(const Duration(seconds: 4), () {
        ref.read(typingUserCallsignProvider.notifier).state = null;
      });
    }
  });
});`
  },
  {
    path: "lib/features/chat/presentation/chats_list_screen.dart",
    category: "chat",
    description: "Unified communication panel sorting organizational, group tactical and direct channels.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
    import '../providers/chat_providers.dart';
import 'chat_screen.dart';

class ChatsListScreen extends ConsumerWidget {
  const ChatsListScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomsAsync = ref.watch(chatsRoomsListProvider);

    // Turn on instant real-time websocket listener
    ref.read(chatRealtimeSynchronizer);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Связь отряда и Чат', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () => ref.invalidate(chatsRoomsListProvider),
          )
        ],
      ),
      body: roomsAsync.when(
        data: (rooms) {
          if (rooms.isEmpty) {
            return const Center(child: Text('Нет активных каналов связи', style: TextStyle(color: Colors.grey)));
          }

          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: rooms.length,
            itemBuilder: (context, index) {
              final room = rooms[index];

              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: room.unreadCount > 0 ? Colors.red[50] : Colors.blueGrey[50],
                  child: Icon(
                    room.type == ChatType.search ? Icons.military_tech_outlined : Icons.forum_outlined,
                    color: room.unreadCount > 0 ? Colors.red : Colors.blueGrey,
                  ),
                ),
                title: Text(room.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(
                  room.lastMessageText ?? 'Сообщений пока нет',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: room.unreadCount > 0
                    ? Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        child: Text(
                          room.unreadCount.toString(),
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      )
                    : const Icon(Icons.arrow_forward_ios, size: 12),
                onTap: () {
                  ref.read(activeChatRoomIdProvider.notifier).state = room.id;
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const ChatScreen()),
                  );
                },
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, st) => Center(child: Text('Ошибка СНХ: \$err')),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/chat/presentation/chat_screen.dart",
    category: "chat",
    description: "Highly interactive conversation client featuring STT captions, bubbles and visual indicators.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/chat_providers.dart';
import '../domain/models/message_model.dart';
import 'widgets/voice_recorder_widget.dart';
import 'widgets/live_location_widget.dart';
import 'media_viewer_screen.dart';
import 'chat_details_screen.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;

    final roomId = ref.read(activeChatRoomIdProvider);
    if (roomId == null) return;

    ref.read(chatRepositoryProvider).sendTextMessageOptimistic(
      chatRoomId: roomId,
      text: text,
      senderId: 'vol_44',
      senderCallSign: 'Заря-4 (Иванова)',
    );

    _inputController.clear();
    ref.invalidate(chatMessagesListProvider);
    
    // Smooth scroll downwards
    Future.delayed(const Duration(milliseconds: 200), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(chatMessagesListProvider);
    final typingUser = ref.watch(typingUserCallsignProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Сводный Радиообмен'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ChatDetailsScreen()),
              );
            },
          )
        ],
      ),
      body: Column(
        children: [
          // Speech typing indication alert
          if (typingUser != null)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
              color: Colors.blueGrey[50],
              width: double.infinity,
              child: Text(
                '👤 \$typingUser вводит радиационный рапорт...',
                style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.blueGrey),
              ),
            ),

          Expanded(
            child: messagesAsync.when(
              data: (messages) {
                if (messages.isEmpty) {
                  return const Center(child: Text('Сообщения отсутствуют. Начните рапорт.'));
                }

                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(12),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index];
                    final isMe = msg.senderId == 'vol_44';

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.all(12),
                        maxWidth: MediaQuery.of(context).size.width * 0.75,
                        decoration: BoxDecoration(
                          color: isMe ? Colors.slate[950] : Colors.blueGrey[50],
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: isMe ? const Radius.circular(16) : Radius.zero,
                            bottomRight: isMe ? Radius.zero : const Radius.circular(16),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              msg.senderCallSign,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                                color: isMe ? Colors.redAccent : Colors.slate[800],
                              ),
                            ),
                            const SizedBox(height: 4),
                            
                            // Audio / Voice component with Speech-To-Text captions
                            if (msg.type == MessageType.voice) ...[
                              Row(
                                children: [
                                  Icon(Icons.play_circle_fill, color: isMe ? Colors.white : Colors.black87),
                                  const SizedBox(width: 8),
                                  const Expanded(child: LinearProgressIndicator(value: 0.35, color: Colors.red)),
                                ],
                              ),
                              if (msg.voiceTranscription != null) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: isMe ? Colors.white10 : Colors.white70,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'STT расшифровка Whisper:\\n"\${msg.voiceTranscription}"',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontStyle: FontStyle.italic,
                                      color: isMe ? Colors.white70 : Colors.black87,
                                    ),
                                  ),
                                ),
                              ],
                            ] else if (msg.type == MessageType.liveLocation) ...[
                              LiveLocationWidget(lat: msg.latitude ?? 55.75, lng: msg.longitude ?? 37.61)
                            ] else ...[
                              Text(
                                msg.content,
                                style: TextStyle(color: isMe ? Colors.white : Colors.black87),
                              ),
                            ],
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '\${msg.createdAt.hour}:\${msg.createdAt.minute.toString().padLeft(2, "0")}',
                                  style: TextStyle(fontSize: 9, color: isMe ? Colors.white38 : Colors.grey),
                                ),
                                const SizedBox(width: 4),
                                Icon(
                                  msg.status == MessageStatus.pending ? Icons.access_time : Icons.done_all,
                                  size: 11,
                                  color: isMe ? Colors.white54 : Colors.grey,
                                )
                              ],
                            )
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, s) => Center(child: Text('Ошибка ГИС: \$e')),
            ),
          ),

          // Action input bar
          SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                border: const Border(top: BorderSide(color: Colors.black12)),
              ),
              child: Row(
                children: [
                  VoiceRecorderWidget(
                    onRecorded: (path, durationText, whisperDetails) {
                      ref.read(chatRepositoryProvider).sendVoiceMessageOptimistic(
                        chatRoomId: ref.read(activeChatRoomIdProvider)!,
                        localPath: path,
                        textContent: durationText,
                        sttTranscription: whisperDetails,
                      );
                      ref.invalidate(chatMessagesListProvider);
                    },
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _inputController,
                      decoration: const InputDecoration(
                        hintText: 'Радиосообщение...',
                        border: InputBorder.none,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send, color: Colors.blueAccent),
                    onPressed: _sendMessage,
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}`
  },
  {
    path: "lib/features/chat/presentation/widgets/voice_recorder_widget.dart",
    category: "chat",
    description: "Compact bottom sheets capturing voice messages and simulating immediate Whisper completions.",
    content: `import 'package:flutter/material.dart';

class VoiceRecorderWidget extends StatefulWidget {
  final Function(String path, String durationText, String WhisperSTT) onRecorded;

  const VoiceRecorderWidget({Key? key, required this.onRecorded}) : super(key: key);

  @override
  State<VoiceRecorderWidget> createState() => _VoiceRecorderWidgetState();
}

class _VoiceRecorderWidgetState extends State<VoiceRecorderWidget> {
  bool _isRecording = false;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        if (_isRecording) {
          setState(() => _isRecording = false);
          // Simulate voice completion and immediate Whisper transcript resolution
          widget.onRecorded(
            '/data/cache/voc_902.aac',
            'Голосовое сообщение (0:08)',
            'Прочесали квадрат Б-1. Никаких следов не обнаружено, запрашиваем перегруппировку.',
          );
        } else {
          setState(() => _isRecording = true);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Внимание! Запись рации запущена.'), duration: Duration(seconds: 1)),
          );
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: _isRecording ? Colors.redAccent : Colors.grey[200],
          shape: BoxShape.circle,
        ),
        child: Icon(
          _isRecording ? Icons.stop : Icons.mic,
          color: _isRecording ? Colors.white : Colors.slate[800],
          size: 20,
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/chat/presentation/widgets/live_location_widget.dart",
    category: "chat",
    description: "Geopositional rendering preview embedding coordinate shapes into tactical message boxes.",
    content: `import 'package:flutter/material.dart';

class LiveLocationWidget extends StatelessWidget {
  final double lat;
  final double lng;

  const LiveLocationWidget({Key? key, required this.lat, required this.lng}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 200,
      height: 100,
      decoration: BoxDecoration(
        color: Colors.slate[900],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.share_location, color: Colors.greenAccent, size: 28),
            const SizedBox(height: 6),
            const Text('Трансляция геопозиции', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            Text('Коорд: \$lat • \$lng', style: const TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/chat/presentation/media_viewer_screen.dart",
    category: "chat",
    description: "Deep zoom viewer optimizing raw search evidences layout scales.",
    content: `import 'package:flutter/material.dart';

class MediaViewerScreen extends StatelessWidget {
  final String path;

  const MediaViewerScreen({Key? key, required this.path}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, iconTheme: const IconThemeData(color: Colors.white)),
      body: Center(
        child: InteractiveViewer(
          child: path.startsWith('http')
              ? Image.network(path)
              : const Center(child: Icon(Icons.broken_image, size: 60, color: Colors.white12)),
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/chat/presentation/chat_details_screen.dart",
    category: "chat",
    description: "Detailed description of talk group with members listing and parameters catalog.",
    content: `import 'package:flutter/material.dart';

class ChatDetailsScreen extends StatelessWidget {
  const ChatDetailsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final participants = [
      {'callsign': 'Звезда-10 (Координатор)', 'role': 'Руководитель смены'},
      {'callsign': 'Заря-4 (Иванова)', 'role': 'Поисковый волонтер'},
      {'callsign': 'Амур-12 (Соколов)', 'role': 'Расчет К9 кинолог'},
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Сведения о радиоканале')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Канал вещания чата', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 6),
          const Text('Частотная сетка: 144.500 МГц (субтон 77.0)', style: TextStyle(color: Colors.blueGrey)),
          const Divider(height: 32),
          
          const Text('Участники радиосети:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          ...participants.map((p) => ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(child: Text(p['callsign']![0])),
            title: Text(p['callsign']!, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text(p['role']!),
          )).toList(),
        ],
      ),
    );
  }
 }`
  },
  {
    path: "lib/features/sos/domain/models/sos_alert_model.dart",
    category: "sos",
    description: "Production-ready rescue distressed session details, GPS metrics and status bindings.",
    content: `enum SOSStatus {
  active,
  acknowledged,
  resolving,
  resolved,
  falseAlarm
}

class SOSAlertModel {
  final String id;
  final String volunteerId;
  final String callSign;
  final double latitude;
  final double longitude;
  final int batteryLevel;
  final String networkState;
  final SOSStatus status;
  final String? acousticClipUrl; // voice feedback attachment url
  final DateTime triggeredAt;
  final String? acknowledgedByCallSign;

  const SOSAlertModel({
    required this.id,
    required this.volunteerId,
    required this.callSign,
    required this.latitude,
    required this.longitude,
    required this.batteryLevel,
    required this.networkState,
    required this.status,
    this.acousticClipUrl,
    required this.triggeredAt,
    this.acknowledgedByCallSign,
  });

  factory SOSAlertModel.fromJson(Map<String, dynamic> json) {
    return SOSAlertModel(
      id: json['id'] as String? ?? '',
      volunteerId: json['volunteer_id'] as String? ?? '',
      callSign: json['callsign'] as String? ?? 'Спасатель',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 55.75,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 37.61,
      batteryLevel: json['battery_level'] as int? ?? 100,
      networkState: json['network_state'] as String? ?? 'OK',
      status: SOSStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
        orElse: () => SOSStatus.active,
      ),
      acousticClipUrl: json['acoustic_clip_url'] as String?,
      triggeredAt: json['triggered_at'] != null 
          ? DateTime.parse(json['triggered_at'] as String)
          : DateTime.now(),
      acknowledgedByCallSign: json['acknowledged_by_callsign'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'volunteer_id': volunteerId,
      'callsign': callSign,
      'latitude': latitude,
      'longitude': longitude,
      'battery_level': batteryLevel,
      'network_state': networkState,
      'status': status.toString().split('.').last,
      'acoustic_clip_url': acousticClipUrl,
      'triggered_at': triggeredAt.toIso8601String(),
      'acknowledged_by_callsign': acknowledgedByCallSign,
    };
  }

  SOSAlertModel copyWith({
    String? id,
    String? volunteerId,
    String? callSign,
    double? latitude,
    double? longitude,
    int? batteryLevel,
    String? networkState,
    SOSStatus? status,
    String? acousticClipUrl,
    DateTime? triggeredAt,
    String? acknowledgedByCallSign,
  }) {
    return SOSAlertModel(
      id: id ?? this.id,
      volunteerId: volunteerId ?? this.volunteerId,
      callSign: callSign ?? this.callSign,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      batteryLevel: batteryLevel ?? this.batteryLevel,
      networkState: networkState ?? this.networkState,
      status: status ?? this.status,
      acousticClipUrl: acousticClipUrl ?? this.acousticClipUrl,
      triggeredAt: triggeredAt ?? this.triggeredAt,
      acknowledgedByCallSign: acknowledgedByCallSign ?? this.acknowledgedByCallSign,
    );
  }
}`
  },
  {
    path: "lib/features/sos/data/sos_repository.dart",
    category: "sos",
    description: "Emergency SQLite repository backing up safety alert dispatch state and handling reconnect replays.",
    content: `import 'dart:convert';
import '../../../core/database/local_database.dart';
import '../domain/models/sos_alert_model.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/database/daos/sync_dao.dart';

class SOSRepository {
  final LocalDatabase _localDb;
  final SyncDao _syncDao;
  final DioClient _dioClient;

  SOSRepository(this._localDb, this._syncDao, this._dioClient);

  Future<SOSAlertModel?> fetchMyActiveSOS() async {
    final cached = await _localDb.queryAll('sos_alerts');
    final active = cached
        .map((c) => SOSAlertModel.fromJson(c))
        .where((element) => element.volunteerId == 'vol_44' && element.status == SOSStatus.active)
        .toList();

    if (active.isNotEmpty) return active.first;
    return null;
  }

  Future<void> triggerSOSEmergencyOptimistic(SOSAlertModel alert) async {
    // Write state to Drift DB instantly
    await _localDb.insertRecord('sos_alerts', alert.toJson());

    // Enqueue emergency transmission outbox
    final key = 'sos_trigger_\${alert.id}';
    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'sos.created',
      payloadJson: jsonEncode(alert.toJson()),
    );

    print('[SOS REPO] SOS Alarm queued with urgency priority!');
  }

  Future<void> updateSOSStatusOptimistic(String sosId, SOSStatus status, {String? acknowledgedBy}) async {
    await _localDb.updateRecord('sos_alerts', 'id', sosId, {
      'status': status.toString().split('.').last,
      if (acknowledgedBy != null) 'acknowledged_by_callsign': acknowledgedBy,
    });

    final key = 'sos_status_\${DateTime.now().microsecondsSinceEpoch}';
    final payload = {
      'sos_id': sosId,
      'status': status.toString().split('.').last,
      'acknowledged_by_callsign': acknowledgedBy,
    };

    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'sos.status.changed',
      payloadJson: jsonEncode(payload),
    );
  }

  Future<void> updateSOSCoordinatesOptimistic(String sosId, double lat, double lng) async {
    await _localDb.updateRecord('sos_alerts', 'id', sosId, {
      'latitude': lat,
      'longitude': lng,
    });

    final key = 'sos_coord_\${DateTime.now().microsecondsSinceEpoch}';
    final payload = {
      'sos_id': sosId,
      'latitude': lat,
      'longitude': lng,
    };

    await _syncDao.addToQueue(
      idempotencyKey: key,
      actionType: 'sos.location.updated',
      payloadJson: jsonEncode(payload),
    );
  }
}`
  },
  {
    path: "lib/features/sos/providers/sos_providers.dart",
    category: "sos",
    description: "Tracks active distress states, GPS streams, location permissions verification and WS events.",
    content: `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/models/sos_alert_model.dart';
import '../data/sos_repository.dart';
import '../../../core/database/local_database.dart';
import '../../../core/database/daos/sync_dao.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/services/websocket_event_dispatcher.dart';

final sosRepositoryProvider = Provider<SOSRepository>((ref) {
  return SOSRepository(LocalDatabase(), ref.watch(syncDaoProvider), ref.watch(dioClientProvider));
});

// Holds current active SOS alarm from this device (null if healthy state)
final activeSOSEventProvider = StateNotifierProvider<ActiveSOSNotifier, SOSAlertModel?>((ref) {
  return ActiveSOSNotifier(ref.watch(sosRepositoryProvider));
});

class ActiveSOSNotifier extends StateNotifier<SOSAlertModel?> {
  final SOSRepository _repo;

  ActiveSOSNotifier(this._repo) : super(null) {
    _init();
  }

  Future<void> _init() async {
    final active = await _repo.fetchMyActiveSOS();
    if (active != null) {
      state = active;
    }
  }

  void setSOS(SOSAlertModel alert) {
    state = alert;
    _repo.triggerSOSEmergencyOptimistic(alert);
  }

  void resolveSOS() {
    if (state != null) {
      _repo.updateSOSStatusOptimistic(state!.id, SOSStatus.resolved);
      state = null;
    }
  }

  void updateLocation(double lat, double lng) {
    if (state != null) {
      state = state!.copyWith(latitude: lat, longitude: lng);
      _repo.updateSOSCoordinatesOptimistic(state!.id, lat, lng);
    }
  }
}

// Tracks location collection permissions workflow
final hasSOSPermissionsProvider = StateProvider<bool>((ref) => true);

// Unified realtime listener for distress updates
final sosRealtimeListener = Provider<void>((ref) {
  final dispatcher = ref.watch(webSocketEventDispatcherProvider);

  dispatcher.rawEvents.listen((event) {
    if (event.eventType == 'sos.created' || event.eventType == 'sos.resolved' || event.eventType == 'sos.status.changed') {
      print('[WS SOS MSG] Distress operational sync frame arrived: \${event.uuid}');
      // Trigger update updates to the UI
      ref.invalidate(activeSOSEventProvider);
    }
  });
});`
  },
  {
    path: "lib/features/sos/presentation/active_sos_screen.dart",
    category: "sos",
    description: "Full height high impact alarm panel restricting navigation to focus attention.",
    content: `import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/sos_providers.dart';

class ActiveSOSScreen extends ConsumerStatefulWidget {
  const ActiveSOSScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ActiveSOSScreen> createState() => _ActiveSOSScreenState();
}

class _ActiveSOSScreenState extends ConsumerState<ActiveSOSScreen> {
  Timer? _locationTimer;
  double _mockLat = 55.7562;
  double _mockLng = 37.6169;

  @override
  void initState() {
    super.initState();
    // Simulate high-frequency background updates (1s) to coordinate search groups
    _locationTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      _mockLat += 0.0001;
      _mockLng += 0.0001;
      ref.read(activeSOSEventProvider.notifier).updateLocation(_mockLat, _mockLng);
    });
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeSOS = ref.watch(activeSOSEventProvider);

    return Scaffold(
      backgroundColor: Colors.red[950],
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Shock header
              Column(
                children: [
                  const SizedBox(height: 20),
                  const Icon(Icons.warning_amber_rounded, color: Colors.yellowAccent, size: 80),
                  const SizedBox(height: 16),
                  const Text(
                    'РЕЖИМ ЧС АКТИВИРОВАН',
                    style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Сигнал бедствия транслируется на частоте штаба.',
                    style: TextStyle(color: Colors.red[100], fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),

              // Orbit visualization simulating high freq GPS
              Center(
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    color: Colors.red[900],
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.redAccent, width: 4),
                  ),
                  child: const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.gps_fixed, color: Colors.greenAccent, size: 36),
                        SizedBox(height: 8),
                        Text('GPS STREAMING', style: TextStyle(color: Colors.greenAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                        Text('Частота: 1 сек', style: TextStyle(color: Colors.white54, fontSize: 10)),
                      ],
                    ),
                  ),
                ),
              ),

              // Emergency stats
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.black26,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        const Text('Заряд батареи:', style: TextStyle(color: Colors.white70)),
                        Text('\${activeSOS?.batteryLevel ?? 88}%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        const Text('Координаты:', style: TextStyle(color: Colors.white70)),
                        Text(
                          '\${activeSOS?.latitude.toStringAsFixed(5) ?? "55.75"}, \${activeSOS?.longitude.toStringAsFixed(5) ?? "37.61"}',
                          style: const TextStyle(color: Colors.yellowAccent, fontFamily: 'monospace', fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Text('Запись окружения:', style: TextStyle(color: Colors.white70)),
                        Text('АКТИВНА🎙️', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                      ],
                    )
                  ],
                ),
              ),

              // Exit / Resolution Button
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.red[950],
                  minimumSize: const Size.fromHeight(60),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: () {
                  ref.read(activeSOSEventProvider.notifier).resolveSOS();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Сигнал бедствия успешно снят. Безопасность восстановлена.')),
                  );
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.check_circle_outline, size: 28),
                label: const Text(
                  'Я В БЕЗОПАСНОСТИ',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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
    path: "lib/features/sos/presentation/emergency_tracking_screen.dart",
    category: "sos",
    description: "Distress dashboard displaying rescue routes overlays mapped onto tactical GPS boards.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/sos_providers.dart';
import 'sos_details_screen.dart';

class EmergencyTrackingScreen extends ConsumerWidget {
  const EmergencyTrackingScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeSOS = ref.watch(activeSOSEventProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Карта ЧС Бедствия')),
      body: Stack(
        children: [
          // Geopositional base visual simulation helper
          Container(
            color: Colors.slate[900],
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.map, color: Colors.white24, size: 120),
                  const SizedBox(height: 12),
                  const Text('ТАКТИЧЕСКИЙ ГИС ОВЕРЛЕЙ SOS', style: TextStyle(color: Colors.white30, fontSize: 13, fontWeight: FontWeight.bold)),
                  if (activeSOS != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Пострадавший: \${activeSOS.callSign}\\nКоординаты: \${activeSOS.latitude.toStringAsFixed(5)}, \${activeSOS.longitude.toStringAsFixed(5)}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.redAccent, fontFamily: 'monospace', fontSize: 13),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Glowing glowing target
          if (activeSOS != null)
            Positioned(
              left: 140,
              top: 250,
              child: Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.red, width: 2),
                ),
                child: const Center(
                  child: Icon(Icons.warning, color: Colors.red, size: 32),
                ),
              ),
            ),

          // Bottom float card
          Positioned(
            left: 16,
            right: 16,
            bottom: 24,
            child: Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        const CircleAvatar(backgroundColor: Colors.red, child: Icon(Icons.crisis_alert, color: Colors.white)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(activeSOS?.callSign ?? 'Заря-4 (Иванова)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              const Text('Сигнал SOS • Активен', style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.arrow_forward_ios, size: 16),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const SOSDetailsScreen()),
                            );
                          },
                        )
                      ],
                    ),
                    const Divider(height: 24),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.directions_run, color: Colors.green),
                            SizedBox(width: 6),
                            Text('Экипаж Амур-12:', style: TextStyle(fontSize: 13)),
                          ],
                        ),
                        Text('Дистанция 450м (В пути)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      ],
                    )
                  ],
                ),
              ),
            ),
          )
        ],
      ),
    );
  }
}`
  },
  {
    path: "lib/features/sos/presentation/sos_details_screen.dart",
    category: "sos",
    description: "SOS incident auditing detailing logs updates, network stats metrics graphs and acoustical triggers.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/sos_providers.dart';

class SOSDetailsScreen extends ConsumerWidget {
  const SOSDetailsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeSOS = ref.watch(activeSOSEventProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Журнал аварийного вызова')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Basic header card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.red[50],
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.red[100]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Text(
                      'Сигнал от: \${activeSOS?.callSign ?? "Заря-4"}',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.red[900]),
                    ),
                    const Chip(label: Text('АКТИВЕН', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), backgroundColor: Colors.red),
                  ],
                ),
                const SizedBox(height: 8),
                Text('Запущен: \${activeSOS?.triggeredAt.toString() ?? "Только что"}', style: const TextStyle(fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 24),

          const Text('Координирующие данные', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          ListTile(
            title: const Text('Уровень батареи передатчика'),
            subtitle: Text('\${activeSOS?.batteryLevel ?? 88}%'),
            leading: const Icon(Icons.battery_alert, color: Colors.orange),
          ),
          ListTile(
            title: const Text('Сенсорный аудиофайл'),
            subtitle: const Text('Доступна запись окружения (10сек)'),
            leading: const Icon(Icons.audio_file, color: Colors.indigo),
            trailing: IconButton(
              icon: const Icon(Icons.play_circle_fill, size: 32, color: Colors.blueAccent),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Воспроизведение аварийного аудиоситуационного файла...')),
                );
              },
            ),
          ),
          const Divider(height: 48),

          // Steps list log
          const Text('Хронология действий (Escalation Log)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          _buildTimelineStep('12:58', 'Пользователь активировал SOS тревогу (Confirmed Hold).'),
          _buildTimelineStep('12:58', 'Фоновый трекинг выставил координаты в Drift Outbox.'),
          _buildTimelineStep('12:59', 'Координатор Амур-12 принял вызов в обработку.'),
        ],
      ),
    );
  }

  Widget _buildTimelineStep(String time, String desc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(time, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black54)),
          const SizedBox(width: 16),
          Expanded(child: Text(desc, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}`
  },
  {
    path: "lib/features/sos/presentation/widgets/sos_button_widget.dart",
    category: "sos",
    description: "Intact long hold trigger used to initiate critical distress operations.",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../domain/models/sos_alert_model.dart';
import '../../providers/sos_providers.dart';
import '../active_sos_screen.dart';

class SOSButtonWidget extends ConsumerStatefulWidget {
  const SOSButtonWidget({Key? key}) : super(key: key);

  @override
  ConsumerState<SOSButtonWidget> createState() => _SOSButtonWidgetState();
}

class _SOSButtonWidgetState extends ConsumerState<SOSButtonWidget> {
  double _progress = 0.0;
  bool _isHolding = false;

  void _onHoldStart() {
    setState(() {
      _isHolding = true;
      _progress = 0.0;
    });
    _tick();
  }

  void _onHoldEnd() {
    setState(() {
      _isHolding = false;
      _progress = 0.0;
    });
  }

  void _tick() {
    if (!_isHolding) return;
    Future.delayed(const Duration(milliseconds: 100), () {
      if (!mounted || !_isHolding) return;
      setState(() {
        _progress += 0.05;
        if (_progress >= 1.0) {
          _progress = 1.0;
          _isHolding = false;
          _dispatchSOSAlert();
        } else {
          _tick();
        }
      });
    });
  }

  void _dispatchSOSAlert() {
    final alert = SOSAlertModel(
      id: const Uuid().v4(),
      volunteerId: 'vol_44',
      callSign: 'Заря-4 (Иванова)',
      latitude: 55.7562,
      longitude: 37.6169,
      batteryLevel: 88,
      networkState: 'OK',
      status: SOSStatus.active,
      triggeredAt: DateTime.now(),
    );

    ref.read(activeSOSEventProvider.notifier).setSOS(alert);

    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ActiveSOSScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: (_) => _onHoldStart(),
      onLongPressEnd: (_) => _onHoldEnd(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: BoxDecoration(
          color: _isHolding ? Colors.redAccent.withOpacity(0.2) : Colors.red[50],
          border: Border.all(color: Colors.red[200]!),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 48,
                  height: 48,
                  child: CircularProgressIndicator(
                    value: _progress,
                    backgroundColor: Colors.red[100],
                    color: Colors.redAccent,
                    strokeWidth: 4,
                  ),
                ),
                Icon(Icons.sos, color: Colors.red[900], size: 24),
              ],
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('ТРЕВОГА SOS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.red)),
                Text(
                  _isHolding ? 'Удерживайте кнопку спасения...' : 'Зажмите на 3 сек для вызова SOS',
                  style: TextStyle(fontSize: 11, color: Colors.slate[750]),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/features/sos/presentation/widgets/emergency_confirmation_dialog.dart",
    category: "sos",
    description: "Guard validation modal prevent random SOS signals triggering.",
    content: `import 'package:flutter/material.dart';

class EmergencyConfirmationDialog extends StatelessWidget {
  final VoidCallback onConfirmed;

  const EmergencyConfirmationDialog({Key? key, required this.onConfirmed}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.dangerous, color: Colors.orange),
          SizedBox(width: 8),
          Text('Подтверждение SOS'),
        ],
      ),
      content: const Text(
        'Внимание! Сигнал тревоги экстренно прекратит обычный сеанс работы и мобилизует все силы отряда. Вы уверены, что вашей жизни угрожает опасность?',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('ОТМЕНА'),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
          onPressed: () {
            Navigator.pop(context);
            onConfirmed();
          },
          child: const Text('АКТИВИРОВАТЬ SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        )
      ],
    );
  }
}`
  },
  {
    path: "lib/core/services/logger_service.dart",
    category: "diagnostic",
    description: "Central structured telemetry framework tracking exception contexts.",
    content: `enum LogLevel {
  debug,
  info,
  warning,
  error,
  critical
}

class LoggerEntry {
  final DateTime timestamp;
  final LogLevel level;
  final String tag;
  final String message;
  final String? exceptionDetails;

  const LoggerEntry({
    required this.timestamp,
    required this.level,
    required this.tag,
    required this.message,
    this.exceptionDetails,
  });

  Map<String, dynamic> toJson() {
    return {
      'timestamp': timestamp.toIso8601String(),
      'level': level.toString().split('.').last,
      'tag': tag,
      'message': message,
      'exception_details': exceptionDetails,
    };
  }
}

class LoggerService {
  static final LoggerService instance = LoggerService._();
  LoggerService._();

  final List<LoggerEntry> _inMemoryBuffer = [];
  static const int _maxInMemoryCapacity = 300;

  void log(LogLevel level, String tag, String message, {String? exception}) {
    final entry = LoggerEntry(
      timestamp: DateTime.now(),
      level: level,
      tag: tag,
      message: message,
      exceptionDetails: exception,
    );

    _inMemoryBuffer.add(entry);
    if (_inMemoryBuffer.length > _maxInMemoryCapacity) {
      _inMemoryBuffer.removeAt(0);
    }

    // Direct console routing with beautiful custom terminal coloring
    final prefix = '[RESCUER HQ - \${level.toString().split('.').last.toUpperCase()}]';
    print('\$prefix [\$tag]: \$message \${exception != null ? "\\nException: $exception" : ""}');
  }

  void debug(String tag, String message) => log(LogLevel.debug, tag, message);
  void info(String tag, String message) => log(LogLevel.info, tag, message);
  void warning(String tag, String message) => log(LogLevel.warning, tag, message);
  void error(String tag, String message, {String? ex}) => log(LogLevel.error, tag, message, exception: ex);
  void critical(String tag, String message, {String? ex}) => log(LogLevel.critical, tag, message, exception: ex);

  List<LoggerEntry> getBufferedEntries() => List.unmodifiable(_inMemoryBuffer);
  
  void flush() {
    _inMemoryBuffer.clear();
    print('[LOGGER] Diagnostical in-memory logs buffer cleared.');
  }
}`
  },
  {
    path: "lib/core/services/lifecycle_manager.dart",
    category: "lifecycle",
    description: "Central lifecycle listener orchestrating clean websocket pause-resume cycles.",
    content: `import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'logger_service.dart';
import 'websocket_service.dart';
import 'sync/sync_engine.dart';

final appLifecycleManagerProvider = Provider<AppLifecycleManager>((ref) {
  final ws = ref.watch(webSocketServiceProvider);
  final sync = ref.watch(syncEngineProvider);
  return AppLifecycleManager(ws, sync);
});

class AppLifecycleManager with WidgetsBindingObserver {
  final WebSocketService _wsService;
  final SyncEngine _syncEngine;

  AppLifecycleManager(this._wsService, this._syncEngine) {
    WidgetsBinding.instance.addObserver(this);
    LoggerService.instance.info('LIFECYCLE', 'Central App Lifecycle Manager registered.');
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    LoggerService.instance.info('LIFECYCLE', 'Central App Lifecycle Manager unregistered.');
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    LoggerService.instance.info('LIFECYCLE', 'App state changed directly to: \$state');

    switch (state) {
      case AppLifecycleState.resumed:
        LoggerService.instance.info('LIFECYCLE', 'Application returned from foreground. Reconnecting websocket channels & starting background delta synchronization sync.');
        _wsService.connect();
        _syncEngine.triggerSync();
        break;
      case AppLifecycleState.paused:
        LoggerService.instance.info('LIFECYCLE', 'Application entered state paused in background. Shutting down websockets and suspension-unsafe timers.');
        _wsService.disconnect();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
        // No-op or lightweight buffer writes
        break;
      default:
        break;
    }
  }
}`
  }
];



