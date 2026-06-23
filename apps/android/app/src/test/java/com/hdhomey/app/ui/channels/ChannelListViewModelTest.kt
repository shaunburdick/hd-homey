package com.hdhomey.app.ui.channels

import app.cash.turbine.test
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.model.ChannelWithMetadata
import com.hdhomey.app.data.repository.ChannelRepository
import com.hdhomey.app.domain.usecase.GetChannelsUseCase
import com.hdhomey.app.storage.AppPreferences
import io.mockk.coEvery
import io.mockk.mockk
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

/**
 * Unit tests for [ChannelListViewModel].
 *
 * Uses MockK to mock use cases and Turbine to assert on [StateFlow] emissions.
 * [UnconfinedTestDispatcher] is installed as the main dispatcher so that
 * [kotlinx.coroutines.CoroutineScope.launch] blocks inside [viewModelScope] run
 * eagerly and synchronously within each [runTest] block.
 */
class ChannelListViewModelTest {

    private val testDispatcher = UnconfinedTestDispatcher()

    private val getChannelsUseCase: GetChannelsUseCase = mockk()
    private val channelRepository: ChannelRepository = mockk()
    private val appPreferences: AppPreferences = mockk()

    @Before
    fun setUp() {
        // Install test dispatcher so viewModelScope coroutines execute eagerly.
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    /** Convenience factory — keeps test bodies focused on behaviour, not construction. */
    private fun createViewModel() = ChannelListViewModel(
        getChannelsUseCase = getChannelsUseCase,
        channelRepository = channelRepository,
        appPreferences = appPreferences
    )

    // ========== Initial state ==========

    @Test
    fun `initial state is Loading`() = runTest {
        val viewModel = createViewModel()
        assertEquals(ChannelListUiState.Loading, viewModel.uiState.value)
    }

    // ========== loadChannels — success path ==========

    @Test
    fun `loadChannels emits Success with channels`() = runTest {
        val channels = listOf(
            ChannelWithMetadata(
                channel = Channel(id = 1, tunerId = 1, number = "2.1", name = "CBS", isHd = true),
                isFavorite = false,
                isHidden = false
            )
        )
        coEvery { getChannelsUseCase(1) } returns channels
        coEvery { channelRepository.getTuners() } returns listOf(1 to "Living Room")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            // Verify the ViewModel always starts in Loading state.
            assertEquals(ChannelListUiState.Loading, awaitItem())

            viewModel.loadChannels(1)

            // After the coroutine completes, expect a Success emission.
            val state = awaitItem()
            assertTrue(state is ChannelListUiState.Success)
            if (state is ChannelListUiState.Success) {
                assertEquals(channels.size, state.channels.size)
                assertEquals("2.1", state.channels[0].channel.number)
                assertEquals("CBS", state.channels[0].channel.name)
            }
        }
    }

    @Test
    fun `loadChannels Success contains tunerName from backend API`() = runTest {
        val channels = listOf(
            ChannelWithMetadata(
                channel = Channel(id = 2, tunerId = 5, number = "4.1", name = "NBC", isHd = true),
                isFavorite = true,
                isHidden = false
            )
        )
        coEvery { getChannelsUseCase(5) } returns channels
        coEvery { channelRepository.getTuners() } returns listOf(5 to "Living Room")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // Loading

            viewModel.loadChannels(5)

            val state = awaitItem()
            assertTrue(state is ChannelListUiState.Success)
            if (state is ChannelListUiState.Success) {
                assertEquals("Living Room", state.tunerName)
            }
        }
    }

    @Test
    fun `loadChannels Success falls back to Tuner N when tuner not found in list`() = runTest {
        val channels = listOf(
            ChannelWithMetadata(
                channel = Channel(id = 3, tunerId = 7, number = "5.1", name = "FOX", isHd = true),
                isFavorite = false,
                isHidden = false
            )
        )
        coEvery { getChannelsUseCase(7) } returns channels
        // Tuner 7 is absent from the list returned by the repository.
        coEvery { channelRepository.getTuners() } returns emptyList()

        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // Loading

            viewModel.loadChannels(7)

            val state = awaitItem()
            assertTrue(state is ChannelListUiState.Success)
            if (state is ChannelListUiState.Success) {
                assertEquals("Tuner 7", state.tunerName)
            }
        }
    }

    @Test
    fun `loadChannels Success preserves channel metadata`() = runTest {
        val channels = listOf(
            ChannelWithMetadata(
                channel = Channel(id = 10, tunerId = 1, number = "7.1", name = "ABC", isHd = true),
                isFavorite = true,
                isHidden = false
            ),
            ChannelWithMetadata(
                channel = Channel(id = 11, tunerId = 1, number = "9.2", name = "PBS", isHd = false),
                isFavorite = false,
                isHidden = true
            )
        )
        coEvery { getChannelsUseCase(1) } returns channels
        coEvery { channelRepository.getTuners() } returns listOf(1 to "Living Room")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // Loading

            viewModel.loadChannels(1)

            val state = awaitItem()
            assertTrue(state is ChannelListUiState.Success)
            if (state is ChannelListUiState.Success) {
                assertEquals(2, state.channels.size)
                assertTrue(state.channels[0].isFavorite)
                assertTrue(state.channels[1].isHidden)
            }
        }
    }

    // ========== loadChannels — empty path ==========

    @Test
    fun `loadChannels emits Empty when no channels returned`() = runTest {
        coEvery { getChannelsUseCase(1) } returns emptyList()
        coEvery { channelRepository.getTuners() } returns listOf(1 to "Living Room")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            assertEquals(ChannelListUiState.Loading, awaitItem())

            viewModel.loadChannels(1)

            val state = awaitItem()
            assertEquals(ChannelListUiState.Empty, state)
        }
    }

    // ========== loadChannels — error path ==========

    @Test
    fun `loadChannels emits Error on exception`() = runTest {
        coEvery { getChannelsUseCase(1) } throws RuntimeException("Network error")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            assertEquals(ChannelListUiState.Loading, awaitItem())

            viewModel.loadChannels(1)

            val state = awaitItem()
            assertTrue(state is ChannelListUiState.Error)
            if (state is ChannelListUiState.Error) {
                assertTrue(state.message.contains("Network error"))
                assertTrue(state.isRetryable)
            }
        }
    }

    @Test
    fun `loadChannels Error message falls back when exception has no message`() = runTest {
        coEvery { getChannelsUseCase(1) } throws RuntimeException()

        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // Loading

            viewModel.loadChannels(1)

            val state = awaitItem()
            assertTrue(state is ChannelListUiState.Error)
            if (state is ChannelListUiState.Error) {
                assertEquals("Failed to load channels", state.message)
            }
        }
    }

    // ========== loadChannels — state transitions ==========

    @Test
    fun `loadChannels resets state to Loading on each call`() = runTest {
        val channels = listOf(
            ChannelWithMetadata(
                channel = Channel(id = 1, tunerId = 1, number = "2.1", name = "CBS", isHd = true),
                isFavorite = false,
                isHidden = false
            )
        )
        coEvery { getChannelsUseCase(1) } returns channels
        coEvery { channelRepository.getTuners() } returns listOf(1 to "Living Room")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // Initial Loading

            // First load succeeds
            viewModel.loadChannels(1)
            val firstSuccess = awaitItem()
            assertTrue(firstSuccess is ChannelListUiState.Success)

            // Second load should emit Loading before emitting Success again
            viewModel.loadChannels(1)
            val secondLoading = awaitItem()
            assertEquals(ChannelListUiState.Loading, secondLoading)

            val secondSuccess = awaitItem()
            assertTrue(secondSuccess is ChannelListUiState.Success)
        }
    }

    // ========== retryLoad ==========

    @Test
    fun `retryLoad re-uses last tunerId and succeeds after initial failure`() = runTest {
        val channels = listOf(
            ChannelWithMetadata(
                channel = Channel(id = 1, tunerId = 1, number = "2.1", name = "CBS", isHd = true),
                isFavorite = false,
                isHidden = false
            )
        )
        coEvery { getChannelsUseCase(1) } throws RuntimeException("Network error") andThen channels
        coEvery { channelRepository.getTuners() } returns listOf(1 to "Living Room")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // Initial Loading

            // First load — fails
            viewModel.loadChannels(1)
            val errorState = awaitItem()
            assertTrue(errorState is ChannelListUiState.Error)

            // Retry — transitions back to Loading then succeeds
            viewModel.retryLoad()
            val retryLoading = awaitItem()
            assertEquals(ChannelListUiState.Loading, retryLoading)

            val successState = awaitItem()
            assertTrue(successState is ChannelListUiState.Success)
            if (successState is ChannelListUiState.Success) {
                assertEquals(1, successState.channels.size)
            }
        }
    }

    @Test
    fun `retryLoad does nothing if loadChannels was never called`() = runTest {
        val viewModel = createViewModel()

        viewModel.uiState.test {
            awaitItem() // Initial Loading

            // retryLoad before any loadChannels — state should remain Loading
            viewModel.retryLoad()

            // No additional emission expected (state stays Loading)
            expectNoEvents()
        }
    }
}
