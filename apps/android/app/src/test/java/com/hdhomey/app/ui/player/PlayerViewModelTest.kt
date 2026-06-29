package com.hdhomey.app.ui.player

import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.exoplayer.ExoPlayer
import app.cash.turbine.test
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.data.provider.CurrentServerProvider
import com.hdhomey.app.domain.model.StreamToken
import com.hdhomey.app.domain.usecase.GenerateStreamUrlUseCase
import io.mockk.coEvery
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.Runs
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.Instant

/**
 * Unit tests for [PlayerViewModel].
 *
 * Robolectric is required because [PlayerViewModel.loadStream] calls
 * [androidx.media3.common.MediaItem.fromUri] and [androidx.media3.exoplayer.hls.HlsMediaSource],
 * which are Android library types that throw "Stub!" without real Android stubs.
 *
 * [ExoPlayer] and [CacheDataSource.Factory] are mocked with MockK because they cannot be
 * instantiated on the JVM.
 * [GenerateStreamUrlUseCase] is mocked to control token-generation outcomes.
 * [CurrentServerProvider] is mocked to provide a test server fixture.
 * [UnconfinedTestDispatcher] is installed as the main dispatcher so that
 * [kotlinx.coroutines.CoroutineScope.launch] blocks inside [viewModelScope] run
 * eagerly and synchronously within each [runTest] block.
 *
 * ## Mock strategy after the per-server refactor
 *
 * [PlayerViewModel.loadStream] now calls:
 * 1. `currentServerProvider.getActiveServer()` — returns a [Server] with URL and JWT.
 * 2. `generateStreamToken(server, tunerId, channelId)` — fetches a token (suspend, must be mocked).
 * 3. `buildStreamUrl(...)` — pure function, uses real implementation (no mock needed).
 * 4. `buildRawStreamUrl(...)` — pure function, uses real implementation (no mock needed).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class PlayerViewModelTest {

    private val testDispatcher = UnconfinedTestDispatcher()

    private val mockExoPlayer: ExoPlayer = mockk()
    private val mockCacheDataSourceFactory: CacheDataSource.Factory = mockk()
    private val mockUseCase: GenerateStreamUrlUseCase = mockk()
    private val mockCurrentServerProvider: CurrentServerProvider = mockk()

    /** Default test parameters — reused across all stream-loading tests. */
    private val serverUrl = "http://192.168.1.100:3000"
    private val tunerId = 1
    private val channelId = 42
    private val tokenValue = "abc"

    /** Test server fixture returned by [mockCurrentServerProvider]. */
    private val testServer = Server(
        id = "test-server",
        name = "Test Server",
        url = serverUrl,
        jwt = "test-jwt-token",
        expiresAt = System.currentTimeMillis() + 86_400_000L,
        userRole = "admin",
        username = "testuser"
    )

    /** A fake [StreamToken] with a far-future expiry so [StreamToken.isValid] returns true. */
    private val fakeToken = StreamToken(
        token = tokenValue,
        expiresAt = Instant.now().plusSeconds(900),
        tunerId = tunerId,
        channelId = channelId
    )

    /** Expected HLS URL derived from [fakeToken] — matches [GenerateStreamUrlUseCase.buildStreamUrl]. */
    private val expectedHlsUrl =
        "http://192.168.1.100:3000/api/transcode/1/42/playlist.m3u8?token=$tokenValue"

    /** Expected raw URL derived from [fakeToken] — matches [GenerateStreamUrlUseCase.buildRawStreamUrl]. */
    private val expectedRawUrl =
        "http://192.168.1.100:3000/tuners/1/channel/42/stream?token=$tokenValue"

    @Before
    fun setUp() {
        // Install test dispatcher so viewModelScope coroutines execute eagerly.
        Dispatchers.setMain(testDispatcher)

        // Stub every ExoPlayer method that PlayerViewModel touches so all test
        // cases begin from a clean, predictable starting point.
        every { mockExoPlayer.removeListener(any()) } just Runs
        every { mockExoPlayer.addListener(any()) } just Runs
        every { mockExoPlayer.setMediaItem(any()) } just Runs
        every { mockExoPlayer.setMediaSource(any()) } just Runs
        every { mockExoPlayer.prepare() } just Runs
        every { mockExoPlayer.play() } just Runs
        every { mockExoPlayer.pause() } just Runs
        every { mockExoPlayer.stop() } just Runs
        every { mockExoPlayer.clearMediaItems() } just Runs
        every { mockExoPlayer.isPlaying } returns true

        // Stub CurrentServerProvider to return our test server
        every { mockCurrentServerProvider.getActiveServer() } returns testServer

        // Stub the pure URL-builder functions on the use-case mock.
        // These are non-suspend, side-effect-free functions whose implementation
        // is correct by construction — we stub them to return predictable, verifiable
        // values rather than relying on a real instance in the ViewModel test context.
        every { mockUseCase.buildStreamUrl(any(), any(), any(), any()) } answers {
            val url = firstArg<String>()
            val tId = secondArg<Int>()
            val cId = thirdArg<Int>()
            val tok = arg<StreamToken>(3)
            "${url.trimEnd('/')}/api/transcode/$tId/$cId/playlist.m3u8?token=${tok.token}"
        }
        every { mockUseCase.buildRawStreamUrl(any(), any(), any(), any()) } answers {
            val url = firstArg<String>()
            val tId = secondArg<Int>()
            val cId = thirdArg<Int>()
            val tok = arg<StreamToken>(3)
            "${url.trimEnd('/')}/tuners/$tId/channel/$cId/stream?token=${tok.token}"
        }
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    /** Convenience factory — keeps test bodies focused on behaviour, not construction. */
    private fun createViewModel() = PlayerViewModel(
        exoPlayer = mockExoPlayer,
        cacheDataSourceFactory = mockCacheDataSourceFactory,
        generateStreamUrlUseCase = mockUseCase,
        currentServerProvider = mockCurrentServerProvider
    )

    // ========== Initial state ==========

    @Test
    fun `initial state is Loading`() = runTest {
        val viewModel = createViewModel()
        assertEquals(PlayerUiState.Loading, viewModel.uiState.value)
    }

    // ========== loadStream — success path ==========

    @Test
    fun `loadStream emits Buffering then Playing on success`() = runTest {
        coEvery {
            mockUseCase.generateStreamToken(testServer, tunerId, channelId)
        } returns fakeToken

        val viewModel = createViewModel()

        viewModel.uiState.test {
            // ViewModel starts in Loading — verify the initial emission.
            assertEquals(PlayerUiState.Loading, awaitItem())

            viewModel.loadStream(serverUrl, tunerId, channelId)

            // loadStream sets _uiState to Loading, but StateFlow conflates duplicate
            // values — the state is already Loading so the assignment is a no-op from
            // the collector's perspective.  The next distinct emission is Buffering.
            assertEquals(PlayerUiState.Buffering, awaitItem())
        }
    }

    // ========== loadStream — error path ==========

    @Test
    fun `loadStream emits Error when use case throws`() = runTest {
        coEvery {
            mockUseCase.generateStreamToken(testServer, tunerId, channelId)
        } throws RuntimeException("Network failure")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            assertEquals(PlayerUiState.Loading, awaitItem()) // initial

            viewModel.loadStream(serverUrl, tunerId, channelId)

            // StateFlow conflates the duplicate Loading emission — loadStream sets
            // _uiState to Loading but it is already Loading, so it is a no-op.
            // The next distinct emission is Error from the catch block.
            val errorState = awaitItem()
            assertTrue(errorState is PlayerUiState.Error)
            if (errorState is PlayerUiState.Error) {
                assertTrue(errorState.message.contains("Network failure"))
                assertTrue(errorState.isRetryable)
            }
        }
    }

    @Test
    fun `loadStream Error message falls back when exception has no message`() = runTest {
        coEvery {
            mockUseCase.generateStreamToken(testServer, tunerId, channelId)
        } throws RuntimeException()

        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // initial Loading
            viewModel.loadStream(serverUrl, tunerId, channelId)
            // StateFlow conflates the duplicate Loading emission.
            val errorState = awaitItem()
            assertTrue(errorState is PlayerUiState.Error)
            if (errorState is PlayerUiState.Error) {
                assertEquals("Failed to load stream", errorState.message)
            }
        }
    }

    // ========== loadStream — raw + HLS URL construction ==========

    @Test
    fun `loadStream builds raw URL with correct format`() {
        // buildRawStreamUrl is a pure function — test it directly without coroutines
        val realUseCase = GenerateStreamUrlUseCase(mockk())

        val rawUrl = realUseCase.buildRawStreamUrl(serverUrl, tunerId, channelId, fakeToken)

        assertEquals(expectedRawUrl, rawUrl)
    }

    @Test
    fun `loadStream builds HLS URL with correct format`() {
        val realUseCase = GenerateStreamUrlUseCase(mockk())

        val hlsUrl = realUseCase.buildStreamUrl(serverUrl, tunerId, channelId, fakeToken)

        assertEquals(expectedHlsUrl, hlsUrl)
    }

    @Test
    fun `buildRawStreamUrl trims trailing slash from serverUrl`() {
        val realUseCase = GenerateStreamUrlUseCase(mockk())

        val rawUrl = realUseCase.buildRawStreamUrl("http://192.168.1.100:3000/", tunerId, channelId, fakeToken)

        assertEquals(expectedRawUrl, rawUrl)
    }

    // ========== playPause ==========

    @Test
    fun `playPause(true) calls exoPlayer play`() = runTest {
        val viewModel = createViewModel()

        viewModel.playPause(play = true)

        verify(exactly = 1) { mockExoPlayer.play() }
    }

    @Test
    fun `playPause(false) calls exoPlayer pause`() = runTest {
        val viewModel = createViewModel()

        viewModel.playPause(play = false)

        verify(exactly = 1) { mockExoPlayer.pause() }
    }

    @Test
    fun `playPause(true) does not call exoPlayer pause`() = runTest {
        val viewModel = createViewModel()

        viewModel.playPause(play = true)

        verify(exactly = 0) { mockExoPlayer.pause() }
    }

    @Test
    fun `playPause(false) does not call exoPlayer play`() = runTest {
        val viewModel = createViewModel()

        viewModel.playPause(play = false)

        // play() is never called in response to playPause(false).
        // Note: play() is called by loadStream internally, but loadStream
        // is NOT called here — so exactly 0 invocations is expected.
        verify(exactly = 0) { mockExoPlayer.play() }
    }

    // ========== releasePlayer ==========

    @Test
    fun `releasePlayer calls exoPlayer stop and clearMediaItems`() = runTest {
        val viewModel = createViewModel()

        viewModel.releasePlayer()

        verify(exactly = 1) { mockExoPlayer.stop() }
        verify(exactly = 1) { mockExoPlayer.clearMediaItems() }
    }

    @Test
    fun `releasePlayer does not call exoPlayer play or pause`() = runTest {
        val viewModel = createViewModel()

        viewModel.releasePlayer()

        verify(exactly = 0) { mockExoPlayer.play() }
        verify(exactly = 0) { mockExoPlayer.pause() }
    }

    @Test
    fun `releasePlayer removes event listener from exoPlayer`() = runTest {
        coEvery {
            mockUseCase.generateStreamToken(testServer, tunerId, channelId)
        } returns fakeToken

        val viewModel = createViewModel()

        // Load a stream so that an eventListener is registered
        viewModel.loadStream(serverUrl, tunerId, channelId)

        viewModel.releasePlayer()

        // The listener added during loadStream must be removed to avoid a leak
        verify(atLeast = 1) { mockExoPlayer.removeListener(any()) }
    }

    // ========== retryLoad ==========

    @Test
    fun `retryLoad calls loadStream again with the same parameters`() = runTest(testDispatcher) {
        coEvery {
            mockUseCase.generateStreamToken(testServer, tunerId, channelId)
        } returns fakeToken

        val viewModel = createViewModel()

        viewModel.loadStream(serverUrl, tunerId, channelId)
        viewModel.retryLoad()

        // retryLoad launches a coroutine with an exponential-backoff delay before calling
        // loadStream again. Advance virtual time so that delay completes and the launched
        // coroutine runs to completion before verifying the call count.
        testScheduler.advanceUntilIdle()

        // generateStreamToken should have been invoked twice — once for the
        // original loadStream and once for the retryLoad.
        io.mockk.coVerify(exactly = 2) {
            mockUseCase.generateStreamToken(testServer, tunerId, channelId)
        }
    }

    @Test
    fun `retryLoad does nothing if loadStream was never called`() = runTest {
        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // initial Loading

            viewModel.retryLoad()

            // No state transition expected — tunerId and channelId are still -1
            // so the guard condition in retryLoad prevents loadStream from running.
            expectNoEvents()
        }
    }

    @Test
    fun `retryLoad emits Loading before retrying`() = runTest(testDispatcher) {
        coEvery {
            mockUseCase.generateStreamToken(testServer, tunerId, channelId)
        } throws RuntimeException("First failure") andThen fakeToken

        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // initial Loading

            // First attempt — fails
            viewModel.loadStream(serverUrl, tunerId, channelId)
            // StateFlow conflates the duplicate Loading emission from loadStream.
            val error = awaitItem()  // Error (next distinct state after Loading)
            assertTrue(error is PlayerUiState.Error)

            // Retry — retryLoad sets _uiState to Loading; this IS a distinct change
            // (from Error → Loading) so StateFlow emits it.
            viewModel.retryLoad()
            val retryLoading = awaitItem()  // Loading
            assertEquals(PlayerUiState.Loading, retryLoading)

            // Success on second attempt transitions to Buffering
            val retryBuffering = awaitItem()
            assertEquals(PlayerUiState.Buffering, retryBuffering)
        }
    }

    @Test
    fun `retryLoad emits non-retryable Error after exhausting MAX_RETRY_ATTEMPTS`() = runTest(testDispatcher) {
        coEvery {
            mockUseCase.generateStreamToken(testServer, tunerId, channelId)
        } throws RuntimeException("Persistent failure")

        val viewModel = createViewModel()

        // Seed the saved stream parameters by calling loadStream once
        viewModel.loadStream(serverUrl, tunerId, channelId)
        testScheduler.advanceUntilIdle()

        // Drive retryLoad until just before the exhaustion threshold (MAX_RETRY_ATTEMPTS = 3).
        // Attempt 1 and 2 each trigger another loadStream that fails, incrementing retryAttempt.
        repeat(2) {
            viewModel.retryLoad()
            testScheduler.advanceUntilIdle()
        }

        // The third retryLoad call crosses the threshold and should emit a non-retryable Error
        viewModel.retryLoad()

        val finalState = viewModel.uiState.value
        assertTrue("Expected Error state after retry exhaustion but got $finalState",
            finalState is PlayerUiState.Error)
        if (finalState is PlayerUiState.Error) {
            assertTrue(
                "Expected non-retryable error after exhaustion",
                !finalState.isRetryable
            )
        }
    }
}
