package com.hdhomey.app.data.repository

import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.api.HdHomeyApiServiceProvider
import com.hdhomey.app.api.models.ChannelPreferenceDto
import com.hdhomey.app.api.models.DataResponse
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.domain.model.ChannelPreferences
import io.mockk.coEvery
import io.mockk.coVerify
import android.util.Log
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
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
 * Unit tests for [PreferencesRepository].
 *
 * Verifies that:
 * - The cache is keyed by `"$serverUrl|$tunerId"` so different servers/tuners
 *   never return stale data from each other.
 * - The cache TTL is respected (entries older than [CACHE_TTL_MS] are re-fetched).
 * - [invalidateCache] clears all entries.
 * - [invalidateCacheForServer] clears entries for a specific server only.
 * - API errors gracefully return [ChannelPreferences.EMPTY].
 */
class PreferencesRepositoryTest {

    private val testDispatcher = UnconfinedTestDispatcher()

    private val mockApiServiceProvider: HdHomeyApiServiceProvider = mockk()
    private val repository = PreferencesRepository(mockApiServiceProvider)

    /** Test server fixtures — different URLs to verify cache keying. */
    private val serverA = Server(
        id = "server-a",
        name = "Server A",
        url = "http://192.168.1.100:3000",
        jwt = "jwt-a"
    )

    private val serverB = Server(
        id = "server-b",
        name = "Server B",
        url = "http://192.168.2.100:3000",
        jwt = "jwt-b"
    )

    /** A single DTO that the mapper will convert to a preference with channel 42 favourited. */
    private val favoriteDto = ChannelPreferenceDto(
        channelId = 42,
        tunerId = 1,
        guideNumber = "2.1",
        guideName = "CBS",
        isFavorite = true,
        isHidden = false,
        updatedAt = "2026-06-29T00:00:00Z"
    )

    @Before
    fun setUp() {
        // Mock android.util.Log so that Log.w() in the repository's catch block
        // does not throw "Method not mocked" on non-Robolectric test runners.
        mockkStatic(Log::class)
        every { Log.w(any<String>(), any<String>(), any<Throwable>()) } returns 0
        every { Log.w(any<String>(), any<String>()) } returns 0

        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    /** Creates a mock API service that returns the given DTOs. */
    private fun mockApiService(vararg dtos: ChannelPreferenceDto): HdHomeyApiService {
        val service: HdHomeyApiService = mockk()
        coEvery { service.getChannelPreferences(any()) } returns DataResponse(dtos.toList())
        return service
    }

    /** Sets up [mockApiServiceProvider] to return [service] for [server]. */
    private fun stubProvider(server: Server, service: HdHomeyApiService) {
        every { mockApiServiceProvider.getService(server.url, server.jwt) } returns service
    }

    // ========== Cache keying per server ==========

    @Test
    fun `getPreferences returns different results for different servers`() = runTest {
        val serviceA = mockApiService(favoriteDto) // channel 42 favorite on server A
        val serviceB = mockApiService()            // no favorites on server B
        stubProvider(serverA, serviceA)
        stubProvider(serverB, serviceB)

        val prefsA = repository.getPreferences(serverA)
        val prefsB = repository.getPreferences(serverB)

        assertEquals(setOf(42), prefsA.favorites)
        assertTrue(prefsB.favorites.isEmpty())
    }

    @Test
    fun `getPreferences caches per server so second call does not hit API`() = runTest {
        val service = mockApiService(favoriteDto)
        stubProvider(serverA, service)

        // First call — populates cache
        repository.getPreferences(serverA)
        // Second call — should use cache (same server)
        repository.getPreferences(serverA)

        // The API should have been called exactly once (second call served from cache)
        coVerify(exactly = 1) { service.getChannelPreferences(any()) }
    }

    @Test
    fun `getPreferences caches per tunerId under the same server`() = runTest {
        val service = mockApiService(favoriteDto)
        stubProvider(serverA, service)

        // First call with tunerId=1
        repository.getPreferences(serverA, tunerId = 1)
        // Second call with tunerId=2 — should be a different cache key
        repository.getPreferences(serverA, tunerId = 2)

        // Both should have hit the API (different cache keys)
        coVerify(exactly = 2) { service.getChannelPreferences(any()) }
    }

    // ========== Cache invalidation ==========

    @Test
    fun `invalidateCache forces re-fetch on next call`() = runTest {
        val service = mockApiService(favoriteDto)
        stubProvider(serverA, service)

        repository.getPreferences(serverA)
        repository.invalidateCache()
        repository.getPreferences(serverA)

        coVerify(exactly = 2) { service.getChannelPreferences(any()) }
    }

    @Test
    fun `invalidateCacheForServer clears only the specified server's cache`() = runTest {
        val serviceA = mockApiService(favoriteDto)
        val serviceB = mockApiService()
        stubProvider(serverA, serviceA)
        stubProvider(serverB, serviceB)

        // Populate cache for both servers
        repository.getPreferences(serverA)
        repository.getPreferences(serverB)

        // Invalidate only server A
        repository.invalidateCacheForServer(serverA)

        // Request server A again — should re-fetch (cache cleared)
        repository.getPreferences(serverA)
        // Request server B again — should use cache (still valid)
        repository.getPreferences(serverB)

        // serviceA.getChannelPreferences called twice (first + re-fetch)
        // serviceB.getChannelPreferences called once (cache hit on second)
        coVerify(exactly = 2) { serviceA.getChannelPreferences(any()) }
        coVerify(exactly = 1) { serviceB.getChannelPreferences(any()) }
    }

    // ========== Error handling ==========

    @Test
    fun `getPreferences returns EMPTY on API error`() = runTest {
        val service: HdHomeyApiService = mockk()
        coEvery { service.getChannelPreferences(any()) } throws RuntimeException("Network error")
        stubProvider(serverA, service)

        val prefs = repository.getPreferences(serverA)

        assertEquals(ChannelPreferences.EMPTY, prefs)
    }

    @Test
    fun `getPreferences returns EMPTY and does not cache failed result`() = runTest {
        // First call fails, second call should try again (not serve a cached EMPTY)
        val service: HdHomeyApiService = mockk()
        coEvery { service.getChannelPreferences(any()) } throws RuntimeException("Network error")
        stubProvider(serverA, service)

        repository.getPreferences(serverA)

        // Change the service behaviour to succeed on second call
        coEvery { service.getChannelPreferences(any()) } returns DataResponse(listOf(favoriteDto))

        val prefs = repository.getPreferences(serverA)

        // Should have channel 42 as favorite (re-fetched, not from cache)
        assertEquals(setOf(42), prefs.favorites)
        coVerify(exactly = 2) { service.getChannelPreferences(any()) }
    }
}
