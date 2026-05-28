# Rescuer HQ — Flutter Authentication Feature Architecture
**Статус:** Production-Ready Specification  
**Модуль:** `features/auth`

---

## 1. Auth Feature Architecture & Layers

Мы строго следуем принципам **Clean Architecture** с разделением на три изолированных слоя: `Data`, `Domain` и `Presentation`.

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                           PRESENTATION LAYER                           │
 │  - LoginScreen (Форма ввода, валидация DTO)                            │
 │  - RegistrationRequestScreen (Форма подачи заявки волонтера)           │
 │  - PendingApprovalScreen (Экран ожидания модерации IT-админом)          │
 │  - AuthNotifier (Управление реактивным состоянием авторизации)          │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              DOMAIN LAYER                              │
 │  - UserProfileModel (Сущность пользователя спасательной операции)       │
 │  - UserRole (Enum ролей: Volunteer, Coordinator, Director и др.)       │
 │  - AuthState (Иммутабельное состояние авторизации во всех фазах)       │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                               DATA LAYER                               │
 │  - AuthRepository (Реализации контрактов, обработка ошибок, маппинг)   │
 │  - AuthApi (Низкоуровневые HTTP-методы обмена с бэкендом)              │
 │  - SecureStorageClient (Интерфейс шифрованного хранилища токенов)       │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. State Management Architecture (Riverpod State Engine)

Управление сессиями спасателей реализовано реактивно с помощью провайдера `authProvider`.

### Диаграмма перехода состояний (Auth State Transitions)

```text
       ┌───────────────┐
       │ Uninitialized │ (Запуск приложения, чтение Secure Storage)
       └───────┬───────┘
               ▼
       ┌───────────────┐
       │  LoadingState │ (Проверка токенов или отправка на логин)
       └───────┬───────┘
               ├─────────────────────────────────────────┐
               ▼ (Токены валидны, одобрен)                ▼ (Заявка на модерации)
     ┌───────────────────┐                     ┌────────────────────────┐
     │ AuthenticatedState│                     │ PendingApprovalState   │
     └─────────┬─────────┘                     └──────────┬─────────────┘
               │                                          │ (Администратор подтвердил)
               ▼ (Кнопка "Выход" или отзыв сессии)       ▼
     ┌───────────────────┐                                │
     │UnauthenticatedState│ ◄─────────────────────────────┘
     └───────────────────┘
```

### Структура иммутабельного состояния (`AuthState`)
Состояние авторизации является сложным объектом, поддерживающим:
1. **`Uninitialized`**: Первичный запуск.
2. **`Loading`**: Показ сплеш-скрина.
3. **`Unauthenticated`**: Пользователь должен ввести пароль.
4. **`PendingApproval`**: Заявка зарегистрирована, но не подтверждена IT-администратором. Пользователь зависает на экране ожидания с автоматическим лонг-поллингом раз в 15 секунд.
5. **`Authenticated`**: Полный оперативный доступ к картам и чатам.

---

## 3. Navigation & Auth Flow Routing (GoRouter Guards)

Декларативный роутер `GoRouter` использует редиректы, непрерывно реагируя на изменения `authProvider`.

### Роли и доступы (RBAC Matrix)

| Роль | Чат | Трекер | Создание SOS | Изменение секторов карты | Модерация волонтеров |
|---|:---:|:---:|:---:|:---:|:---:|
| **Volunteer** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Operator** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Coordinator** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Senior Coordinator** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Director** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **IT Admin** | ❌ | ❌ | ❌ | ❌ | ✅ |

### Логика ролей в GoRouter Guards:
```dart
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/loading',
    redirect: (context, state) {
      final status = authState.status;

      // Если идет загрузка сессии
      if (status == AuthStatus.loading && state.matchedLocation != '/loading') {
        return '/loading';
      }

      // Состояние ожидания одобрения IT-администратором
      if (status == AuthStatus.pendingApproval && state.matchedLocation != '/pending') {
        return '/pending';
      }

      // Неавторизованный пользователь отправляется на экран входа/регистрации
      final isAuthPage = state.matchedLocation == '/login' || state.matchedLocation == '/register-request';
      if (status == AuthStatus.unauthenticated && !isAuthPage) {
        return '/login';
      }

      // Авторизованный волонтер пытается открыть логин
      if (status == AuthStatus.authenticated && isAuthPage) {
        return '/searches';
      }

      return null;
    },
    // ... routes
  );
});
```

---

## 4. Token & Session Architecture (Double-Lock Rotation)

Безопасность транзакций обеспечивается парой токенов: **Access Token** (короткоживущий JWT, 15 минут) и **Refresh Token** (долгоживущий шифрованный токен, 30 дней).

### Double-Lock Refresh Mechanism (Потокобезопасная ротация)

Для предотвращения ситуации гонки, когда одновременно падают несколько запросов с истекшим Access Token, интерцептор использует блокирующий mutex-механизм:

```text
    Request A ────────► [401 Outdated Token] ──────► [acquire Lock] ──► Call POST /refresh
                                                                               │
    Request B ────────► [401 Outdated Token] ──────► [Blocked by Lock]         ▼
                                                           │             Update Storage & Memory
    Request B (Retry) ◄────── Replay with New Token ◄──────┘                   │
                                                                         [release Lock]
```

1. **Locking**: Первый запрос, поймавший ошибку 401, активирует блокировку выполнения повторных ротаций `_isRefreshing = true`.
2. **Buffering**: Последующие параллельные сетевые вызовы, получающие 401, откладываются во внутреннюю очередь `_retryQueue`.
3. **Execution**: Выполняется атомарный запрос к методу `/api/v1/auth/refresh`.
4. **Resolution**: Полученные токены записываются в зашифрованное хранилище. Все отложенные запросы из `_retryQueue` выполняются повторно с новым зашифрованным заголовочным ключом, после чего блокировка снимается.

---

## 5. Network Layers Interconnection (Dio & Secure Engine)

Мобильный клиент инжектирует токен в каждый выходящий запрос по заголовку `'Authorization': 'Bearer <token>'`. Исключение составляют запросы публичной зоны (`/auth/login`, `/auth/register-request`).

### Схема обработки исключений (API Error Mapping)

Мы маппируем нативные ошибки Dio в человекочитаемые доменные исключения:
* **`400 Bad Request`**: Превращается в `ValidationException` с разбором ошибок валидации DTO с сервера для корректной подсветки полей формы ввода.
* **`403 Forbidden`**: Адаптирует предупреждение `AccessDeniedException` (например, волонтер лезет в консоль координатора).
* **`409 Conflict`**: `EmailAlreadyRecordedException` при регистрации.
* **`ConnectionTimeout`**: Превращается в `NetworkOfflineException` для автоматического перехода приложения в фоновый локальный режим Drift.

---

## 6. Secure Storage Architecture & Hardware Protection

Хранение ключей авторизации осуществляется аппаратно с использованием зашифрованного системного контейнера устройства:

* **iOS implementation**:
  Используется нативная служба **Apple Keychain Services**. Токены пишутся с уровнем доступности `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` — это гарантирует, что данные расшифровываются только тогда, когда устройство разблокировано владельцем, и исключает копирование учетных данных при резервном бэкапе системы.
* **Android implementation**:
  Применяется библиотека Android Jetpack **Security EncryptedSharedPreferences**, взаимодействующая с аппаратным хранилищем **Android KeyStore**. Ключи симметричного шифрования AES-256 генерируются аппаратно, исключая извлечение токенов через root-доступ или эмуляторы с незащищенной памятью.
* **Wipe Policy**:
  При разлогивании вызывается принудительный каскадный сброс локальной памяти. Мы выполняем метод `.deleteAll()`, а также очищаем оперативную кэш-память Drift для пресечения криминалистического анализа памяти найденного смартфона.
