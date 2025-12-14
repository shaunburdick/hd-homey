package com.hdhomey.app.ui.channels

import app.cash.turbine.test
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.model.ChannelPreferences
import com.hdhomey.app.domain.usecase.GetChannelPreferencesUseCase
import com.hdhomey.app.domain.usecase.GetChannelsUseCase
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import retrofit2.HttpException
import java.io.IOException

/**
 * Unit tests for ChannelListViewModel.
 *
 * Tests UI state management, navigation events, and error handling.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ChannelListViewModelTest {

    private lateinit var viewModel: ChannelListViewModel
    private lateinit var getChannelsUseCase: GetChannelsUseCase
    private lateinit var getChannelPreferencesUseCase: GetChannelPreferencesUseCase

    private val testDispatcher = StandardTestDispatcher()
    private val testTunerId = 1
    private val testTunerName = "Test Tuner"

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        getChannelsUseCase = mockk()
        getChannelPreferencesUseCase = mockk()
        viewModel = ChannelListViewModel(
            getChannelsUseCase,
            getChannelPreferencesUseCase
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // ========== Initial State ==========

    @Test
    fun `initial state should be Loading`() = runTest {
        // Then: Initial state is Loading
        assertTrue(viewModel.uiState.value is ChannelListUiState.Loading)
    }

    // ========== Success Cases ==========

    @Test
    fun `loadChannels should emit Loading then Success when channels loaded`() = runTest {
        // Given: Successful channel fetch
        val channels = listOf(
            createChannel(number = "2.1", name = "CBS"),
            createChannel(number = "4.1", name = "NBC")
        )
        val preferences = ChannelPreferences.EMPTY
        coEvery { getChannelsUseCase(testTunerId) } returns Result.success(channels)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(preferences)

        viewModel.uiState.test {
            // Initial state
            assertTrue(awaitItem() is ChannelListUiState.Loading)

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: State transitions to Success
            val state = awaitItem() as ChannelListUiState.Success
            assertEquals(2, state.channels.size)
            assertEquals(testTunerName, state.tunerName)
        }
    }

    @Test
    fun `loadChannels should emit Empty when no channels exist`() = runTest {
        // Given: Empty channel list
        coEvery { getChannelsUseCase(testTunerId) } returns Result.success(emptyList())
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(ChannelPreferences.EMPTY)

        viewModel.uiState.test {
            skipItems(1) // Skip initial Loading state

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: State is Empty
            assertTrue(awaitItem() is ChannelListUiState.Empty)
        }
    }

    @Test
    fun `loadChannels should merge channels with preferences correctly`() = runTest {
        // Given: Channels with some marked as favorite/hidden
        val channels = listOf(
            createChannel(id = 1, number = "2.1", name = "CBS"),
            createChannel(id = 2, number = "4.1", name = "NBC"),
            createChannel(id = 3, number = "7.1", name = "ABC")
        )
        val preferences = ChannelPreferences(
            favorites = setOf("2.1"),
            hidden = setOf("7.1")
        )
        coEvery { getChannelsUseCase(testTunerId) } returns Result.success(channels)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(preferences)

        viewModel.uiState.test {
            skipItems(1) // Skip initial Loading state

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: Channels have correct preference flags
            val state = awaitItem() as ChannelListUiState.Success
            assertEquals(2, state.channels.size) // Hidden channel filtered out
            assertTrue(state.channels[0].channel.number == "2.1") // Favorite first
            assertTrue(state.channels[0].isFavorite)
        }
    }

    @Test
    fun `loadChannels should handle preferences fetch failure gracefully`() = runTest {
        // Given: Channels succeed but preferences fail (404 - not yet implemented)
        val channels = listOf(createChannel(number = "2.1"))
        coEvery { getChannelsUseCase(testTunerId) } returns Result.success(channels)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.failure(
            mockk<HttpException>().apply {
                coEvery { code() } returns 404
            }
        )

        viewModel.uiState.test {
            skipItems(1) // Skip initial Loading state

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: Channels still displayed without preferences
            val state = awaitItem() as ChannelListUiState.Success
            assertEquals(1, state.channels.size)
            assertFalse(state.channels[0].isFavorite)
        }
    }

    @Test
    fun `loadChannels should sort channels by number after merging preferences`() = runTest {
        // Given: Unsorted channels
        val channels = listOf(
            createChannel(number = "10.1"),
            createChannel(number = "2.1"),
            createChannel(number = "5.1")
        )
        val preferences = ChannelPreferences.EMPTY
        coEvery { getChannelsUseCase(testTunerId) } returns Result.success(channels)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(preferences)

        viewModel.uiState.test {
            skipItems(1)

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: Channels sorted by number
            val state = awaitItem() as ChannelListUiState.Success
            assertEquals("2.1", state.channels[0].channel.number)
            assertEquals("5.1", state.channels[1].channel.number)
            assertEquals("10.1", state.channels[2].channel.number)
        }
    }

    // ========== Error Cases ==========

    @Test
    fun `loadChannels should emit Error on network failure`() = runTest {
        // Given: Network error
        coEvery { getChannelsUseCase(testTunerId) } returns Result.failure(
            IOException("Network timeout")
        )
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(ChannelPreferences.EMPTY)

        viewModel.uiState.test {
            skipItems(1)

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: State is Error with network message
            val state = awaitItem() as ChannelListUiState.Error
            assertTrue(state.message.contains("Network error"))
            assertTrue(state.isRetryable)
        }
    }

    @Test
    fun `loadChannels should emit Error on 401 authentication failure`() = runTest {
        // Given: 401 Unauthorized
        val authError = mockk<HttpException>()
        coEvery { authError.code() } returns 401
        coEvery { authError.message() } returns "Unauthorized"
        coEvery { getChannelsUseCase(testTunerId) } returns Result.failure(authError)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(ChannelPreferences.EMPTY)

        viewModel.uiState.test {
            skipItems(1)

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: State is Error with auth message
            val state = awaitItem() as ChannelListUiState.Error
            assertTrue(state.message.contains("Session expired"))
            assertFalse(state.isRetryable) // Auth errors not retryable
        }
    }

    @Test
    fun `loadChannels should emit Error on 404 tuner not found`() = runTest {
        // Given: 404 Not Found
        val notFoundError = mockk<HttpException>()
        coEvery { notFoundError.code() } returns 404
        coEvery { notFoundError.message() } returns "Tuner not found"
        coEvery { getChannelsUseCase(testTunerId) } returns Result.failure(notFoundError)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(ChannelPreferences.EMPTY)

        viewModel.uiState.test {
            skipItems(1)

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: State is Error with not found message
            val state = awaitItem() as ChannelListUiState.Error
            assertTrue(state.message.contains("Tuner not found"))
            assertFalse(state.isRetryable)
        }
    }

    @Test
    fun `loadChannels should emit Error on 500 server error`() = runTest {
        // Given: 500 Internal Server Error
        val serverError = mockk<HttpException>()
        coEvery { serverError.code() } returns 500
        coEvery { serverError.message() } returns "Internal server error"
        coEvery { getChannelsUseCase(testTunerId) } returns Result.failure(serverError)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(ChannelPreferences.EMPTY)

        viewModel.uiState.test {
            skipItems(1)

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: State is Error with server error message
            val state = awaitItem() as ChannelListUiState.Error
            assertTrue(state.message.contains("Server error"))
            assertTrue(state.isRetryable) // Server errors retryable
        }
    }

    // ========== Retry Logic ==========

    @Test
    fun `retry should reload channels using cached tuner ID`() = runTest {
        // Given: Initial load succeeded
        val channels = listOf(createChannel())
        coEvery { getChannelsUseCase(testTunerId) } returns Result.success(channels)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(ChannelPreferences.EMPTY)
        
        viewModel.loadChannels(testTunerId, testTunerName)
        testDispatcher.scheduler.advanceUntilIdle()

        viewModel.uiState.test {
            skipItems(1) // Skip current Success state

            // When: Retry
            viewModel.retry()
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: Channels reloaded
            assertTrue(awaitItem() is ChannelListUiState.Success)
        }
    }

    @Test
    fun `retry should emit Error when no tuner ID cached`() = runTest {
        // Given: No previous load (no cached tuner ID)

        viewModel.uiState.test {
            skipItems(1)

            // When: Retry without previous load
            viewModel.retry()
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: Error state
            val state = awaitItem() as ChannelListUiState.Error
            assertTrue(state.message.contains("Cannot retry"))
            assertFalse(state.isRetryable)
        }
    }

    // ========== Navigation Events ==========

    @Test
    fun `onChannelSelected should emit NavigateToPlayer event`() = runTest {
        // Given: A channel
        val channel = createChannel(number = "2.1", name = "CBS")

        viewModel.navigationEvents.test {
            // When: Channel selected
            viewModel.onChannelSelected(channel)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: NavigateToPlayer event emitted
            val event = awaitItem() as ChannelListNavigation.NavigateToPlayer
            assertEquals(channel, event.channel)
        }
    }

    @Test
    fun `onBackPressed should emit NavigateBack event`() = runTest {
        viewModel.navigationEvents.test {
            // When: Back pressed
            viewModel.onBackPressed()
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: NavigateBack event emitted
            assertTrue(awaitItem() is ChannelListNavigation.NavigateBack)
        }
    }

    @Test
    fun `showError should emit ShowError event`() = runTest {
        // Given: Error message
        val errorMessage = "Something went wrong"

        viewModel.navigationEvents.test {
            // When: Show error
            viewModel.showError(errorMessage)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: ShowError event emitted
            val event = awaitItem() as ChannelListNavigation.ShowError
            assertEquals(errorMessage, event.message)
        }
    }

    // ========== Refresh ==========

    @Test
    fun `refresh should reload channels using cached tuner ID`() = runTest {
        // Given: Initial load succeeded
        val channels = listOf(createChannel())
        coEvery { getChannelsUseCase(testTunerId) } returns Result.success(channels)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(ChannelPreferences.EMPTY)
        
        viewModel.loadChannels(testTunerId, testTunerName)
        testDispatcher.scheduler.advanceUntilIdle()

        viewModel.uiState.test {
            skipItems(1) // Skip current Success state

            // When: Refresh
            viewModel.refresh()
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: Channels reloaded
            assertTrue(awaitItem() is ChannelListUiState.Success)
        }
    }

    @Test
    fun `refresh should do nothing when no tuner ID cached`() = runTest {
        // Given: No previous load

        viewModel.uiState.test {
            // When: Refresh without previous load
            viewModel.refresh()
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: State remains Loading (no change)
            assertTrue(awaitItem() is ChannelListUiState.Loading)
        }
    }

    // ========== Edge Cases ==========

    @Test
    fun `loadChannels should emit Empty when all channels are hidden`() = runTest {
        // Given: All channels marked as hidden
        val channels = listOf(
            createChannel(number = "2.1"),
            createChannel(number = "4.1")
        )
        val preferences = ChannelPreferences(
            favorites = emptySet(),
            hidden = setOf("2.1", "4.1") // All hidden
        )
        coEvery { getChannelsUseCase(testTunerId) } returns Result.success(channels)
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(preferences)

        viewModel.uiState.test {
            skipItems(1)

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: State is Empty (no visible channels)
            assertTrue(awaitItem() is ChannelListUiState.Empty)
        }
    }

    @Test
    fun `loadChannels should handle unexpected exception gracefully`() = runTest {
        // Given: Unexpected exception
        coEvery { getChannelsUseCase(testTunerId) } throws RuntimeException("Unexpected error")
        coEvery { getChannelPreferencesUseCase(testTunerId) } returns Result.success(ChannelPreferences.EMPTY)

        viewModel.uiState.test {
            skipItems(1)

            // When: Load channels
            viewModel.loadChannels(testTunerId, testTunerName)
            testDispatcher.scheduler.advanceUntilIdle()

            // Then: State is Error
            val state = awaitItem() as ChannelListUiState.Error
            assertTrue(state.message.contains("Unexpected error"))
            assertTrue(state.isRetryable)
        }
    }

    // ========== Helper Functions ==========

    /**
     * Create a test channel with default values.
     */
    private fun createChannel(
        id: Int = 1,
        tunerId: Int = testTunerId,
        number: String = "2.1",
        name: String = "Test Channel",
        isHd: Boolean = true,
        videoCodec: String = "H264",
        audioCodec: String = "AAC",
        streamUrl: String = "http://test/stream"
    ): Channel {
        return Channel(
            id = id,
            tunerId = tunerId,
            number = number,
            name = name,
            isHd = isHd,
            videoCodec = videoCodec,
            audioCodec = audioCodec,
            streamUrl = streamUrl
        )
    }
}
