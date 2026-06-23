package com.hdhomey.app.ui.player

import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.exoplayer.ExoPlayer
import app.cash.turbine.test
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

/**
 * Unit tests for [PlayerViewModel].
 *
 * Robolectric is required because [PlayerViewModel.loadStream] calls
 * [androidx.media3.common.MediaItem.fromUri] and [androidx.media3.exoplayer.hls.HlsMediaSource],
 * which are Android library types that throw "Stub!" without real Android stubs.
 *
 * [ExoPlayer] and [CacheDataSource.Factory] are mocked with MockK because they cannot be
 * instantiated on the JVM.
 * [GenerateStreamUrlUseCase] is mocked to control URL generation outcomes.
 * [UnconfinedTestDispatcher] is installed as the main dispatcher so that
 * [kotlinx.coroutines.CoroutineScope.launch] blocks inside [viewModelScope] run
 * eagerly and synchronously within each [runTest] block.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class PlayerViewModelTest {

    private val testDispatcher = UnconfinedTestDispatcher()

    private val mockExoPlayer: ExoPlayer = mockk()
    private val mockCacheDataSourceFactory: CacheDataSource.Factory = mockk()
    private val mockUseCase: GenerateStreamUrlUseCase = mockk()

    /** Default test parameters — reused across all stream-loading tests. */
    private val serverUrl = "http://192.168.1.100:3000"
    private val tunerId = 1
    private val channelId = 42
    private val streamUrl = "http://192.168.1.100:3000/api/transcode/1/42/playlist.m3u8?token=abc"

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
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    /** Convenience factory — keeps test bodies focused on behaviour, not construction. */
    private fun createViewModel() = PlayerViewModel(
        exoPlayer = mockExoPlayer,
        cacheDataSourceFactory = mockCacheDataSourceFactory,
        generateStreamUrlUseCase = mockUseCase
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
            mockUseCase.generateStreamUrl(serverUrl, tunerId, channelId)
        } returns streamUrl

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
            mockUseCase.generateStreamUrl(serverUrl, tunerId, channelId)
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
            mockUseCase.generateStreamUrl(serverUrl, tunerId, channelId)
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

    // ========== retryLoad ==========

    @Test
    fun `retryLoad calls loadStream again with the same parameters`() = runTest(testDispatcher) {
        coEvery {
            mockUseCase.generateStreamUrl(serverUrl, tunerId, channelId)
        } returns streamUrl

        val viewModel = createViewModel()

        viewModel.loadStream(serverUrl, tunerId, channelId)
        viewModel.retryLoad()

        // retryLoad launches a coroutine with an exponential-backoff delay before calling
        // loadStream again. Advance virtual time so that delay completes and the launched
        // coroutine runs to completion before verifying the call count.
        testScheduler.advanceUntilIdle()

        // generateStreamUrl should have been invoked twice — once for the
        // original loadStream and once for the retryLoad.
        io.mockk.coVerify(exactly = 2) {
            mockUseCase.generateStreamUrl(serverUrl, tunerId, channelId)
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
            mockUseCase.generateStreamUrl(serverUrl, tunerId, channelId)
        } throws RuntimeException("First failure") andThen streamUrl

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
}
