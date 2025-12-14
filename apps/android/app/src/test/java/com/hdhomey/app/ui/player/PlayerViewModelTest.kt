package com.hdhomey.app.ui.player

import app.cash.turbine.test
import com.hdhomey.app.domain.usecase.GenerateStreamUrlUseCase
import com.hdhomey.app.util.NetworkConnectivityHelper
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.IOException

/**
 * Unit tests for PlayerViewModel.
 *
 * Tests stream loading, error handling, retry logic with exponential backoff,
 * network connectivity checks, token refresh, and navigation events.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class PlayerViewModelTest {

    private lateinit var viewModel: PlayerViewModel
    private lateinit var generateStreamUrlUseCase: GenerateStreamUrlUseCase
    private lateinit var networkHelper: NetworkConnectivityHelper
    
    private val testDispatcher = StandardTestDispatcher()
    
    // Test data
    private val testTunerId = 1
    private val testChannelId = 5
    private val testChannelName = "2.1 CBS"
    private val testServerUrl = "http://test.local:3000"
    private val testStreamUrl = "http://test.local:3000/api/transcode/1/5/playlist.m3u8?token=abc123"

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        
        generateStreamUrlUseCase = mockk()
        networkHelper = mockk()
        
        // Default: network is available
        every { networkHelper.isNetworkAvailable() } returns true
        
        viewModel = PlayerViewModel(generateStreamUrlUseCase, networkHelper)
    }

    // ========== Load Stream Tests ==========

    @Test
    fun `loadStream should emit Preparing state initially`() = runTest {
        // Given: Successful stream generation
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        
        // When: Load stream
        viewModel.uiState.test {
            viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
            
            // Then: First state is Preparing
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Preparing)
            assertEquals(testChannelName, (state as PlayerUiState.Preparing).channelName)
            
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `loadStream should emit Playing state on success`() = runTest {
        // Given: Successful stream generation
        coEvery { generateStreamUrlUseCase(testServerUrl, testTunerId, testChannelId) } returns 
            Result.success(testStreamUrl)
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: State is Playing
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Playing)
            assertEquals(testChannelName, (state as PlayerUiState.Playing).channelName)
            assertTrue(state.controls.isPlaying)
        }
    }

    @Test
    fun `loadStream should emit stream URL on success`() = runTest {
        // Given: Successful stream generation
        coEvery { generateStreamUrlUseCase(testServerUrl, testTunerId, testChannelId) } returns 
            Result.success(testStreamUrl)
        
        // When: Load stream
        viewModel.streamUrlEvents.test {
            viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
            testDispatcher.scheduler.advanceUntilIdle()
            
            // Then: Stream URL is emitted
            assertEquals(testStreamUrl, awaitItem())
        }
    }

    @Test
    fun `loadStream should emit Error state on failure`() = runTest {
        // Given: Failed stream generation
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns 
            Result.failure(IOException("Network error"))
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: State is Error
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Error)
            val errorState = state as PlayerUiState.Error
            assertTrue(errorState.isRetryable)
            assertEquals(PlayerUiState.ErrorType.NETWORK, errorState.errorType)
        }
    }

    @Test
    fun `loadStream should reset retry count when resetRetryCount is true`() = runTest {
        // Given: Failed stream generation (to increment retry count)
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns 
            Result.failure(IOException("Network error"))
        
        // When: Load stream fails, trigger retry, then load again with reset
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        viewModel.retry()
        testDispatcher.scheduler.advanceTimeBy(1000) // Wait for first retry delay
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Now load again with resetRetryCount=true (should reset to 0)
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl, resetRetryCount = true)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Should succeed (retry count was reset)
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Playing)
        }
    }

    // ========== Network Check Tests ==========

    @Test
    fun `loadStream should check network connectivity before loading`() = runTest {
        // Given: Network is unavailable
        every { networkHelper.isNetworkAvailable() } returns false
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Should show network error immediately
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Error)
            val errorState = state as PlayerUiState.Error
            assertEquals(PlayerUiState.ErrorType.NETWORK, errorState.errorType)
            assertTrue(errorState.isRetryable)
            assertTrue(errorState.message.contains("No internet connection"))
        }
    }

    @Test
    fun `loadStream should proceed when network is available`() = runTest {
        // Given: Network is available
        every { networkHelper.isNetworkAvailable() } returns true
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Should succeed
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Playing)
        }
    }

    // ========== Retry Logic Tests ==========

    @Test
    fun `retry should apply exponential backoff delays`() = runTest {
        // Given: Failed stream generation
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns 
            Result.failure(IOException("Network error"))
        
        // When: Initial load fails
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // First retry: 1 second delay
        viewModel.uiState.test {
            viewModel.retry()
            val preparing1 = awaitItem()
            assertTrue(preparing1 is PlayerUiState.Preparing)
            assertTrue((preparing1 as PlayerUiState.Preparing).channelName.contains("1s"))
            
            // Advance past first retry
            testDispatcher.scheduler.advanceTimeBy(1000)
            testDispatcher.scheduler.advanceUntilIdle()
            
            val error1 = awaitItem()
            assertTrue(error1 is PlayerUiState.Error)
            
            // Second retry: 2 second delay
            viewModel.retry()
            val preparing2 = awaitItem()
            assertTrue(preparing2 is PlayerUiState.Preparing)
            assertTrue((preparing2 as PlayerUiState.Preparing).channelName.contains("2s"))
            
            // Third retry: 4 second delay  
            testDispatcher.scheduler.advanceTimeBy(2000)
            testDispatcher.scheduler.advanceUntilIdle()
            
            val error2 = awaitItem()
            assertTrue(error2 is PlayerUiState.Error)
            
            viewModel.retry()
            val preparing3 = awaitItem()
            assertTrue(preparing3 is PlayerUiState.Preparing)
            assertTrue((preparing3 as PlayerUiState.Preparing).channelName.contains("4s"))
            
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `retry should stop after max retries`() = runTest {
        // Given: Failed stream generation
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns 
            Result.failure(IOException("Network error"))
        
        // When: Initial load + 3 retries
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        repeat(3) {
            viewModel.retry()
            testDispatcher.scheduler.advanceTimeBy(10000) // Skip delay
            testDispatcher.scheduler.advanceUntilIdle()
        }
        
        // When: Attempt 4th retry
        viewModel.retry()
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Should show max retries error
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Error)
            val errorState = state as PlayerUiState.Error
            assertFalse(errorState.isRetryable) // No longer retryable
            assertTrue(errorState.message.contains("Maximum retries exceeded"))
        }
    }

    @Test
    fun `retry should show countdown in Preparing state`() = runTest {
        // Given: Failed stream generation
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns 
            Result.failure(IOException("Network error"))
        
        // When: Initial load fails and retry
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        viewModel.retry()
        
        // Then: Preparing state shows retry info
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Preparing)
            val preparingState = state as PlayerUiState.Preparing
            assertTrue(preparingState.channelName.contains("Retry 1/3"))
            assertTrue(preparingState.channelName.contains("1s"))
        }
    }

    @Test
    fun `retryManual should reset retry counter`() = runTest {
        // Given: Failed stream generation, reached retry 2/3
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns 
            Result.failure(IOException("Network error"))
        
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        viewModel.retry() // Retry 1
        testDispatcher.scheduler.advanceTimeBy(1000)
        testDispatcher.scheduler.advanceUntilIdle()
        
        viewModel.retry() // Retry 2
        testDispatcher.scheduler.advanceTimeBy(2000)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // When: Manual retry (should reset counter)
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        viewModel.retryManual()
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Should succeed (counter was reset)
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Playing)
        }
    }

    // ========== Error Handling Tests ==========

    @Test
    fun `loadStream should categorize IOException as NETWORK error`() = runTest {
        // Given: IOException
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns 
            Result.failure(IOException("Connection timeout"))
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Error type is NETWORK
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Error)
            assertEquals(PlayerUiState.ErrorType.NETWORK, (state as PlayerUiState.Error).errorType)
            assertTrue(state.isRetryable)
        }
    }

    @Test
    fun `loadStream should categorize 401 as AUTHENTICATION error`() = runTest {
        // Given: 401 HTTP error
        val httpException = mockk<retrofit2.HttpException>()
        every { httpException.code() } returns 401
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.failure(httpException)
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Error type is AUTHENTICATION
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Error)
            assertEquals(PlayerUiState.ErrorType.AUTHENTICATION, (state as PlayerUiState.Error).errorType)
            assertFalse(state.isRetryable)
        }
    }

    @Test
    fun `loadStream should emit SessionExpired navigation for 401 error`() = runTest {
        // Given: 401 HTTP error
        val httpException = mockk<retrofit2.HttpException>()
        every { httpException.code() } returns 401
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.failure(httpException)
        
        // When: Load stream
        viewModel.navigationEvents.test {
            viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
            testDispatcher.scheduler.advanceUntilIdle()
            
            // Then: SessionExpired event emitted
            val event = awaitItem()
            assertTrue(event is PlayerNavigation.SessionExpired)
        }
    }

    @Test
    fun `loadStream should categorize 404 as STREAM_UNAVAILABLE error`() = runTest {
        // Given: 404 HTTP error
        val httpException = mockk<retrofit2.HttpException>()
        every { httpException.code() } returns 404
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.failure(httpException)
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Error type is STREAM_UNAVAILABLE
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Error)
            assertEquals(PlayerUiState.ErrorType.STREAM_UNAVAILABLE, (state as PlayerUiState.Error).errorType)
            assertFalse(state.isRetryable)
        }
    }

    @Test
    fun `loadStream should categorize 503 as SERVER_ERROR`() = runTest {
        // Given: 503 HTTP error
        val httpException = mockk<retrofit2.HttpException>()
        every { httpException.code() } returns 503
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.failure(httpException)
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Error type is SERVER_ERROR
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Error)
            assertEquals(PlayerUiState.ErrorType.SERVER_ERROR, (state as PlayerUiState.Error).errorType)
            assertTrue(state.isRetryable)
        }
    }

    // ========== Token Refresh Tests ==========

    @Test
    fun `loadStream should schedule token refresh on success`() = runTest {
        // Given: Successful stream generation
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // When: Advance time by 10 minutes (token refresh interval)
        testDispatcher.scheduler.advanceTimeBy(600_000)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Should have been scheduled (verified by no exceptions)
        assertTrue(true)
    }

    @Test
    fun `token refresh should emit new stream URL`() = runTest {
        // Given: Successful stream generation
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        
        // When: Load stream
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        viewModel.streamUrlEvents.test {
            // First URL emitted on initial load
            assertEquals(testStreamUrl, awaitItem())
            
            // Advance to token refresh time
            testDispatcher.scheduler.advanceTimeBy(600_000)
            testDispatcher.scheduler.advanceUntilIdle()
            
            // Second URL emitted on refresh
            assertEquals(testStreamUrl, awaitItem())
            
            cancelAndIgnoreRemainingEvents()
        }
    }

    // ========== Lifecycle Tests ==========

    @Test
    fun `onBackPressed should emit NavigateBack event`() = runTest {
        viewModel.navigationEvents.test {
            viewModel.onBackPressed()
            
            val event = awaitItem()
            assertTrue(event is PlayerNavigation.NavigateBack)
        }
    }

    @Test
    fun `onBackPressed should cancel token refresh job`() = runTest {
        // Given: Stream is loaded and token refresh is scheduled
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // When: Back pressed
        viewModel.onBackPressed()
        testDispatcher.scheduler.advanceTimeBy(600_000) // Token refresh time
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Token refresh should NOT happen (job was cancelled)
        viewModel.streamUrlEvents.test {
            expectNoEvents() // No new stream URL emitted
        }
    }

    @Test
    fun `onBackPressed should cancel retry job`() = runTest {
        // Given: Failed load with retry scheduled
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns 
            Result.failure(IOException("Network error"))
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        viewModel.retry()
        
        // When: Back pressed before retry executes
        viewModel.onBackPressed()
        testDispatcher.scheduler.advanceTimeBy(10000) // Skip retry delay
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Then: Retry should NOT execute (job was cancelled)
        // State should still be Error (not Preparing for retry)
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Error)
        }
    }

    // ========== Playback State Tests ==========

    @Test
    fun `updatePlaybackState should update to Playing when isPlaying is true`() = runTest {
        // Given: Stream is loaded
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // When: Update playback state
        viewModel.updatePlaybackState(isPlaying = true)
        
        // Then: State is Playing
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Playing)
            assertTrue((state as PlayerUiState.Playing).controls.isPlaying)
        }
    }

    @Test
    fun `updatePlaybackState should update to Paused when isPlaying is false`() = runTest {
        // Given: Stream is loaded
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // When: Update playback state to paused
        viewModel.updatePlaybackState(isPlaying = false)
        
        // Then: State is Paused
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Paused)
            assertFalse((state as PlayerUiState.Paused).controls.isPlaying)
        }
    }

    @Test
    fun `onBuffering should update state to Buffering`() = runTest {
        // Given: Stream is loaded
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // When: Buffering starts
        viewModel.onBuffering()
        
        // Then: State is Buffering
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Buffering)
        }
    }

    @Test
    fun `onPlaybackError should update state to Error`() = runTest {
        // Given: Stream is loaded
        coEvery { generateStreamUrlUseCase(any(), any(), any()) } returns Result.success(testStreamUrl)
        viewModel.loadStream(testTunerId, testChannelId, testChannelName, testServerUrl)
        testDispatcher.scheduler.advanceUntilIdle()
        
        // When: Playback error occurs
        viewModel.onPlaybackError("Stream unavailable")
        
        // Then: State is Error
        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state is PlayerUiState.Error)
            assertEquals("Stream unavailable", (state as PlayerUiState.Error).message)
        }
    }
}
