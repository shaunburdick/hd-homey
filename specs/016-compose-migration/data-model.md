# Data Models — Compose Migration

**Feature**: `016-compose-migration`  
**Date**: 2026-06-29  

---

## 1. AsyncState<T> (Generic Three-State Container)

**Location**: `ui/components/AsyncStateContent.kt`

```kotlin
/**
 * Generic three-state representation for asynchronous data loading.
 *
 * Used by every screen composable that loads data from a ViewModel.
 * Prevents the need for separate sealed interfaces per screen
 * (though existing screen-specific types like [ChannelListUiState]
 * are wrapped into AsyncState for rendering).
 */
sealed interface AsyncState<out T> {
    /** Data is currently loading. */
    data object Loading : AsyncState<Nothing>

    /** Data loaded successfully. */
    data class Success<T>(val data: T) : AsyncState<T>

    /**
     * An error occurred during loading.
     *
     * @property message Human-readable error description.
     * @property cause Optional throwable for debugging.
     */
    data class Error(
        val message: String,
        val cause: Throwable? = null
    ) : AsyncState<Nothing>
}
```

### AsyncStateContent Composable

```kotlin
/**
 * Renders one of three states (loading, error, success/empty) for any
 * screen that loads async data.
 *
 * @param state The current [AsyncState] to render.
 * @param onRetry Called when the user taps the retry button in the error state.
 * @param loadingContent Composable shown during [AsyncState.Loading].
 *        Defaults to [ShimmerEffect].
 * @param emptyCheck Function that returns `true` when the success data
 *        should be considered "empty" and the empty state shown instead.
 * @param emptyContent Composable shown when [emptyCheck] returns true.
 * @param content Composable shown for [AsyncState.Success] data.
 */
@Composable
fun <T> AsyncStateContent(
    state: AsyncState<T>,
    onRetry: () -> Unit,
    loadingContent: @Composable () -> Unit = { ShimmerEffect() },
    emptyCheck: (T) -> Boolean = { false },
    emptyContent: @Composable () -> Unit,
    content: @Composable (T) -> Unit
)
```

---

## 2. Route Objects (@Serializable)

**Location**: `ui/navigation/Routes.kt`

```kotlin
import kotlinx.serialization.Serializable

/** Root screen — displays the list of configured servers. */
@Serializable
object ServerList

/** Add a new server form screen. */
@Serializable
object AddServer

/**
 * Authentication (device code pairing) screen.
 *
 * @property serverId The server ID to authenticate against.
 */
@Serializable
data class Authentication(val serverId: String)

/**
 * Channel list for a given server.
 *
 * @property serverId Optional server ID. Null means "active server".
 */
@Serializable
data class ChannelList(val serverId: String? = null)

/**
 * Video player screen for a specific channel.
 *
 * @property channelId The channel ID (as string for serialization).
 * @property channelName Display name shown in player controls overlay.
 */
@Serializable
data class Player(val channelId: String, val channelName: String)

/** Success screen shown after authentication completes. */
@Serializable
object Success
```

---

## 3. ExtendedColors

**Location**: `ui/theme/ExtendedColors.kt`

```kotlin
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.MaterialTheme

/**
 * Non-M3-standard colors used throughout the HD Homey app.
 *
 * Accessed via [MaterialTheme.extendedColors] extension property.
 *
 * @property success Green status — connected, healthy (0xFF10B981).
 * @property successContainer Dark green background for success chips (0xFF064E3B).
 * @property warning Yellow/amber — degraded state, caution (0xFFF59E0B).
 * @property warningContainer Dark amber background for warning chips (0xFF78350F).
 * @property info Blue informational status (0xFF3B82F6).
 * @property infoContainer Dark blue background for info chips (0xFF1E3A8A).
 * @property textTertiary Lowest-emphasis text color (0xFF909090).
 * @property textDisabled Disabled text color (0xFF666666).
 */
data class ExtendedColors(
    val success: Color,
    val successContainer: Color,
    val warning: Color,
    val warningContainer: Color,
    val info: Color,
    val infoContainer: Color,
    val textTertiary: Color,
    val textDisabled: Color
)

/**
 * CompositionLocal providing [ExtendedColors] down the composable tree.
 * Uses [staticCompositionLocalOf] because extended colors never change
 * at runtime (dark-theme-only app).
 */
val LocalExtendedColors = staticCompositionLocalOf {
    ExtendedColors(
        success = Color.Unspecified,
        successContainer = Color.Unspecified,
        warning = Color.Unspecified,
        warningContainer = Color.Unspecified,
        info = Color.Unspecified,
        infoContainer = Color.Unspecified,
        textTertiary = Color.Unspecified,
        textDisabled = Color.Unspecified
    )
}

/** Convenience extension property on [MaterialTheme]. */
val MaterialTheme.extendedColors: ExtendedColors
    get() = LocalExtendedColors.current
```

---

## 4. AdaptiveValues (WindowSizeClass + TV)

**Location**: `ui/components/AdaptiveLayout.kt`

```kotlin
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Shape

/**
 * Adaptive layout values derived from [WindowSizeClass] and TV detection.
 *
 * Provided via [LocalAdaptiveValues] CompositionLocal so any composable
 * can access screen-appropriate spacing and sizing without manually
 * recalculating in each screen.
 *
 * @property horizontalMargin Horizontal screen margin (16dp phone, 24dp tablet, 48dp TV).
 * @property cardShape Corner shape for cards (8dp phone, 12dp TV).
 * @property isTv Whether the device is an Android TV.
 * @property minTouchTarget Minimum touch target size (always 48dp).
 */
data class AdaptiveValues(
    val horizontalMargin: Dp,
    val cardShape: Shape,
    val isTv: Boolean,
    val minTouchTarget: Dp
)

val LocalAdaptiveValues = staticCompositionLocalOf {
    AdaptiveValues(
        horizontalMargin = 16.dp,
        cardShape = RoundedCornerShape(8.dp),
        isTv = false,
        minTouchTarget = 48.dp
    )
}
```

---

## 5. UiState Data Classes per Screen

### 5.1 ServerListUiState

**Location**: `ui/servers/ServerListViewModel.kt`

```kotlin
import com.hdhomey.app.data.model.Server

/**
 * UI state for the server list screen.
 * Uses [AsyncState] pattern; [AsyncState.Success] wraps a [List]<[Server]>.
 */
// No separate sealed interface needed — ServerListViewModel
// exposes StateFlow<AsyncState<List<Server>>>
```

### 5.2 ServerListViewModel

```kotlin
@HiltViewModel
class ServerListViewModel @Inject constructor(
    private val serverRepository: ServerRepository,
    private val currentServerProvider: CurrentServerProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow<AsyncState<List<Server>>>(AsyncState.Loading)
    val uiState: StateFlow<AsyncState<List<Server>>> = _uiState.asStateFlow()

    fun loadServers() { /* ... */ }
    fun deleteServer(id: String, onCancel: () -> Unit) { /* ... */ }
    fun getActiveServer(): Server? { /* ... */ }
}
```

### 5.3 AddServerUiState / AddServerViewModel

**Location**: `ui/servers/AddServerViewModel.kt`

```kotlin
/**
 * UI state for the add-server screen.
 *
 * @property name Server display name text field value.
 * @property url Server URL text field value.
 * @property nameError Validation error for the name field, or null.
 * @property urlError Validation error for the URL field, or null.
 * @property isTesting Whether the connectivity test is in progress.
 * @property testResult Null if untested, true if connection succeeded, false if failed.
 * @property saveResult Null if not yet saved, true if saved successfully, false if failed.
 */
data class AddServerUiState(
    val name: String = "",
    val url: String = "",
    val nameError: String? = null,
    val urlError: String? = null,
    val isTesting: Boolean = false,
    val testResult: Boolean? = null,
    val testErrorMessage: String? = null,
    val saveResult: Boolean? = null
)

@HiltViewModel
class AddServerViewModel @Inject constructor(
    private val serverRepository: ServerRepository,
    private val connectivityChecker: ServerConnectivityChecker
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddServerUiState())
    val uiState: StateFlow<AddServerUiState> = _uiState.asStateFlow()

    fun updateName(name: String) { /* ... */ }
    fun updateUrl(url: String) { /* ... */ }
    fun testConnection() { /* ... */ }
    fun saveServer() { /* ... */ }
}
```

### 5.4 AuthenticationUiState

**Location**: `ui/auth/AuthenticationViewModel.kt`

```kotlin
import android.graphics.Bitmap

/**
 * UI state for the device-code authentication screen.
 *
 * @property deviceCode The 8-character device code shown to the user.
 * @property qrCodeBitmap QR code bitmap encoding the pairing URL.
 * @property expiresAt Timestamp (epoch millis) when the code expires.
 * @property isPolling Whether the polling coroutine is active.
 * @property isExpired Whether the device code has expired.
 * @property isAuthorized Whether authorization was successful.
 * @property errorMessage Error description, or null.
 */
data class AuthenticationUiState(
    val deviceCode: String = "",
    val qrCodeBitmap: Bitmap? = null,
    val expiresAt: Long = 0L,
    val isPolling: Boolean = false,
    val isExpired: Boolean = false,
    val isAuthorized: Boolean = false,
    val errorMessage: String? = null,
    val serverName: String = ""
)

@HiltViewModel
class AuthenticationViewModel @Inject constructor(
    private val deviceCodeService: DeviceCodeService,
    private val currentServerProvider: CurrentServerProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthenticationUiState())
    val uiState: StateFlow<AuthenticationUiState> = _uiState.asStateFlow()

    fun startPairing(serverId: String) { /* ... */ }
    fun cancelPolling() { /* ... */ }
    fun retryPairing() { /* ... */ }
}
```

### 5.5 ChannelListUiState (Existing — Kept Unchanged)

**Location**: `ui/channels/ChannelListUiState.kt`

The existing sealed interface is kept **unchanged**. The `ChannelListScreen`
composable maps it to the `AsyncState` pattern internally:

```kotlin
// ChannelListScreen uses ChannelListViewModel's existing uiState
// and renders each state manually rather than wrapping in AsyncState.
// This avoids code churn on the existing ViewModel.
```

### 5.6 PlayerUiState (Existing — Kept Unchanged)

**Location**: `ui/player/PlayerUiState.kt`

The existing sealed interface is kept **unchanged**. The `PlayerScreen`
composable collects `PlayerViewModel.uiState` directly.

Existing states:
- `PlayerUiState.Loading`
- `PlayerUiState.Buffering`
- `PlayerUiState.Playing(isPlaying: Boolean)`
- `PlayerUiState.Error(message: String, isRetryable: Boolean)`

### 5.7 SuccessScreenUiState

No ViewModel needed — purely presentational. State is derived from
navigation arguments and server information.

```kotlin
/**
 * Data needed by the SuccessScreen composable.
 * Passed via navigation or looked up from CurrentServerProvider.
 *
 * @property serverId Server ID for navigation.
 * @property serverName Display name of the server.
 * @property username Authenticated user's name.
 */
data class SuccessScreenData(
    val serverId: String,
    val serverName: String,
    val username: String
)
```

---

## 6. Theme Color Constants

**Location**: `ui/theme/Color.kt`

```kotlin
// Brand & Accent
val HdHomeyBlue = Color(0xFF2563EB)
val HdHomeyBlueDark = Color(0xFF1D4ED8)

// Backgrounds
val BackgroundDark = Color(0xFF1A1A1A)
val SurfaceDark = Color(0xFF2A2A2A)
val SurfaceDarkElevated = Color(0xFF3A3A3A)

// Text
val TextPrimary = Color(0xFFF0F0F0)
val TextSecondary = Color(0xFFB3B3B3)
val TextTertiary = Color(0xFF909090)
val TextDisabled = Color(0xFF666666)

// Borders
val ColorBorder = Color(0xFF404040)
val ColorBorderHover = Color(0xFF505050)

// Status colors
val SuccessGreen = Color(0xFF10B981)
val ErrorRed = Color(0xFFFF5555)
val WarningYellow = Color(0xFFF59E0B)

// Semantic backgrounds
val ColorSuccessBg = Color(0xFF064E3B)
val ColorErrorBg = Color(0xFF7F1D1D)
val ColorWarningBg = Color(0xFF78350F)

// Info
val ColorInfo = Color(0xFF3B82F6)
val ColorInfoBg = Color(0xFF1E3A8A)
```

---

## 7. Typography — Phone Defaults

**Location**: `ui/theme/Type.kt`

```kotlin
import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val PhoneTypography = Typography(
    displayLarge = TextStyle(           // 57sp — not used directly; kept at M3 default
        fontWeight = FontWeight.Normal,
        fontSize = 57.sp,
        lineHeight = 64.sp,
        letterSpacing = (-0.25).sp
    ),
    headlineLarge = TextStyle(          // 48sp — TV screen titles (M3 default: 32sp)
        fontWeight = FontWeight.Bold,
        fontSize = 48.sp,
        lineHeight = 56.sp
    ),
    headlineMedium = TextStyle(         // 32sp — channel names, section titles
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp
    ),
    headlineSmall = TextStyle(          // 24sp — card titles, sub-headings
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 32.sp
    ),
    titleLarge = TextStyle(             // 20sp — server/channel names
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 28.sp,
        letterSpacing = 0.sp
    ),
    titleMedium = TextStyle(            // 16sp — body emphasis
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp
    ),
    titleSmall = TextStyle(             // 14sp — captions, labels
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp
    ),
    bodyLarge = TextStyle(              // 16sp — body text
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp
    ),
    bodyMedium = TextStyle(             // 14sp — secondary text
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp
    ),
    bodySmall = TextStyle(              // 12sp — timestamps, fine print
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.4.sp
    ),
    labelLarge = TextStyle(             // 14sp — button text
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp
    ),
    labelMedium = TextStyle(            // 12sp — badges, helper text
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    ),
    labelSmall = TextStyle(             // 10sp — overlines, tiny labels
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    )
)
```

### TV Typography (Oversized Variants)

```kotlin
val TvTypography = PhoneTypography.copy(
    headlineLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 48.sp,
        lineHeight = 56.sp
    ),
    headlineMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 40.sp,   // bumped from 32sp for TV readability
        lineHeight = 48.sp
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 28.sp,   // bumped from 20sp
        lineHeight = 36.sp
    ),
    displayLarge = TextStyle(          // Device code size
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.Bold,
        fontSize = 96.sp,
        lineHeight = 104.sp,
        letterSpacing = 0.2.sp
    )
)
```

---

## 8. Shapes

**Location**: `ui/theme/Shape.kt`

```kotlin
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),   // Not used directly; small = 4dp
    small = RoundedCornerShape(4.dp),        // Badges, tags
    medium = RoundedCornerShape(8.dp),       // Cards, inputs, buttons (phone default)
    large = RoundedCornerShape(12.dp),       // Dialogs, modals, TV cards
    extraLarge = RoundedCornerShape(16.dp)   // Not used
)
```

---

## 9. HdHomeyTheme

**Location**: `ui/theme/HdHomeyTheme.kt`

```kotlin
@Composable
fun HdHomeyTheme(
    isTv: Boolean = LocalConfiguration.current.uiMode and
        Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION,
    content: @Composable () -> Unit
) {
    val colorScheme = darkHdHomeyColorScheme()
    val typography = if (isTv) TvTypography else PhoneTypography

    val extendedColors = ExtendedColors(
        success = SuccessGreen,
        successContainer = ColorSuccessBg,
        warning = WarningYellow,
        warningContainer = ColorWarningBg,
        info = ColorInfo,
        infoContainer = ColorInfoBg,
        textTertiary = TextTertiary,
        textDisabled = TextDisabled
    )

    val windowSizeClass = calculateCurrentWindowSizeClass()
    val adaptiveValues = AdaptiveValues(
        horizontalMargin = when {
            isTv -> 48.dp
            windowSizeClass.windowWidthSizeClass == WindowWidthSizeClass.Compact -> 16.dp
            else -> 24.dp
        },
        cardShape = if (isTv) RoundedCornerShape(12.dp) else RoundedCornerShape(8.dp),
        isTv = isTv,
        minTouchTarget = 48.dp
    )

    CompositionLocalProvider(
        LocalExtendedColors provides extendedColors,
        LocalAdaptiveValues provides adaptiveValues
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = typography,
            shapes = AppShapes,
            content = content
        )
    }
}
```

### darkHdHomeyColorScheme

```kotlin
private fun darkHdHomeyColorScheme(): darkColorScheme = darkColorScheme(
    primary = HdHomeyBlue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF1E3A8A),
    onPrimaryContainer = Color(0xFFDBEAFE),
    secondary = HdHomeyBlue,
    onSecondary = Color.White,
    background = BackgroundDark,
    onBackground = TextPrimary,
    surface = SurfaceDark,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceDarkElevated,
    onSurfaceVariant = TextSecondary,
    outline = ColorBorder,
    error = ErrorRed,
    onError = Color.White,
    errorContainer = ColorErrorBg,
    onErrorContainer = Color(0xFFFECACA)
)
```
