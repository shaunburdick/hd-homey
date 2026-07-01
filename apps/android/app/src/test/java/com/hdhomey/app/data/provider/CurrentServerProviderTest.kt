package com.hdhomey.app.data.provider

import app.cash.turbine.test
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.data.repository.ServerRepository
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [CurrentServerProvider].
 *
 * Verifies that:
 * - [currentServerProvider.activeServerFlow] emits the correct values on
 *   initialisation, server switch, and invalidation.
 * - [currentServerProvider.getActiveServer] returns the correct in-memory value.
 */
class CurrentServerProviderTest {

    private val testDispatcher = UnconfinedTestDispatcher()

    private val mockServerRepository: ServerRepository = mockk()

    /** Test fixtures. */
    private val serverA = Server(
        id = "server-a",
        name = "Server A",
        url = "http://192.168.1.100:3000"
    )

    private val serverB = Server(
        id = "server-b",
        name = "Server B",
        url = "http://192.168.2.100:3000"
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // ========== Initialisation ==========

    @Test
    fun `provider loads active server from repository on init`() {
        every { mockServerRepository.getActiveServer() } returns serverA

        val provider = CurrentServerProvider(mockServerRepository)

        assertEquals(serverA, provider.getActiveServer())
    }

    @Test
    fun `provider activeServerFlow emits server loaded from repository on init`() = runTest {
        every { mockServerRepository.getActiveServer() } returns serverA

        val provider = CurrentServerProvider(mockServerRepository)

        provider.activeServerFlow.test {
            assertEquals(serverA, awaitItem())
        }
    }

    @Test
    fun `provider handles null active server from repository on init`() {
        every { mockServerRepository.getActiveServer() } returns null

        val provider = CurrentServerProvider(mockServerRepository)

        assertNull(provider.getActiveServer())
    }

    @Test
    fun `provider activeServerFlow emits null when repository returns null on init`() = runTest {
        every { mockServerRepository.getActiveServer() } returns null

        val provider = CurrentServerProvider(mockServerRepository)

        provider.activeServerFlow.test {
            assertNull(awaitItem())
        }
    }

    // ========== switchToServer ==========

    @Test
    fun `switchToServer emits new server on activeServerFlow`() = runTest {
        every { mockServerRepository.getActiveServer() } returns serverA
        every { mockServerRepository.setActiveServer(serverB.id) } returns true
        every { mockServerRepository.getServerById(serverB.id) } returns serverB

        val provider = CurrentServerProvider(mockServerRepository)

        provider.activeServerFlow.test {
            // Skip the initial emission from init
            assertEquals(serverA, awaitItem())

            provider.switchToServer(serverB.id)

            assertEquals(serverB, awaitItem())
        }
    }

    @Test
    fun `switchToServer updates getActiveServer return value`() {
        every { mockServerRepository.getActiveServer() } returns serverA
        every { mockServerRepository.setActiveServer(serverB.id) } returns true
        every { mockServerRepository.getServerById(serverB.id) } returns serverB

        val provider = CurrentServerProvider(mockServerRepository)

        provider.switchToServer(serverB.id)

        assertEquals(serverB, provider.getActiveServer())
    }

    @Test
    fun `switchToServer returns false when repository fails and does not emit`() = runTest {
        every { mockServerRepository.getActiveServer() } returns serverA
        every { mockServerRepository.setActiveServer("nonexistent") } returns false

        val provider = CurrentServerProvider(mockServerRepository)

        provider.activeServerFlow.test {
            assertEquals(serverA, awaitItem())

            val result = provider.switchToServer("nonexistent")

            assertEquals(false, result)
            // No additional emission — the flow should not have a second server value
            // Drop the initial emission and verify no more events
        }

        // getActiveServer should still return the original server
        assertEquals(serverA, provider.getActiveServer())
    }

    // ========== invalidate ==========

    @Test
    fun `invalidate sets activeServer to null and emits null on flow`() = runTest {
        every { mockServerRepository.getActiveServer() } returns serverA

        val provider = CurrentServerProvider(mockServerRepository)

        provider.activeServerFlow.test {
            assertEquals(serverA, awaitItem())

            provider.invalidate()

            assertNull(awaitItem())
            assertNull(provider.getActiveServer())
        }
    }

    // ========== getActiveServer ==========

    @Test
    fun `getActiveServer returns correct value after construction`() {
        every { mockServerRepository.getActiveServer() } returns serverA

        val provider = CurrentServerProvider(mockServerRepository)

        assertEquals(serverA, provider.getActiveServer())
        assertEquals(serverA.url, provider.getActiveServerUrl())
        assertEquals(serverA.jwt, provider.getActiveServerJwt())
    }

    @Test
    fun `getActiveServer returns null when no server is active`() {
        every { mockServerRepository.getActiveServer() } returns null

        val provider = CurrentServerProvider(mockServerRepository)

        assertNull(provider.getActiveServer())
        assertNull(provider.getActiveServerUrl())
        assertNull(provider.getActiveServerJwt())
    }
}
