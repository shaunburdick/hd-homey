package com.hdhomey.app.data.repository

import com.hdhomey.app.storage.TokenDataStore
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue

/**
 * Unit tests for [TokenRepository].
 *
 * Verifies that every public method correctly delegates to [TokenDataStore] without
 * adding extra logic. All suspend-function tests use [runTest]; synchronous-function
 * tests (getTokenSync, hasToken) use plain blocking calls with [every].
 *
 * MockK is used so that no Android runtime (DataStore / Context) is required —
 * the repository is a thin delegation layer and can be exercised on the plain JVM.
 *
 * [repository] is initialized in [setUp] rather than as a class-level field because
 * [TokenRepository.token] is resolved at construction time from [tokenDataStore.token].
 * The stub must be in place before the repository is created to avoid a [MockKException].
 */
class TokenRepositoryTest {

    private val tokenDataStore: TokenDataStore = mockk()
    private lateinit var repository: TokenRepository

    @Before
    fun setUp() {
        // Provide a default stub for the token Flow so that TokenRepository can be
        // constructed safely — its `token` field is initialised at construction time.
        every { tokenDataStore.token } returns flowOf(null)
        repository = TokenRepository(tokenDataStore)
    }

    // ========== token Flow ==========

    @Test
    fun `token flow exposes the dataStore token flow`() {
        val expectedFlow = flowOf("flow-token")
        every { tokenDataStore.token } returns expectedFlow

        // Re-create repository so the token property is resolved with our stub.
        val repo = TokenRepository(tokenDataStore)

        assertEquals(expectedFlow, repo.token)
    }

    // ========== saveToken ==========

    @Test
    fun `saveToken delegates to dataStore`() = runTest {
        coEvery { tokenDataStore.saveToken(any()) } returns Unit

        repository.saveToken("test-token")

        coVerify(exactly = 1) { tokenDataStore.saveToken("test-token") }
    }

    @Test
    fun `saveToken passes token value unchanged`() = runTest {
        val captured = mutableListOf<String>()
        coEvery { tokenDataStore.saveToken(capture(captured)) } returns Unit

        repository.saveToken("Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig")

        assertEquals("Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig", captured.single())
    }

    // ========== clearToken ==========

    @Test
    fun `clearToken delegates to dataStore`() = runTest {
        coEvery { tokenDataStore.clearToken() } returns Unit

        repository.clearToken()

        coVerify(exactly = 1) { tokenDataStore.clearToken() }
    }

    // ========== getTokenSync ==========

    @Test
    fun `getTokenSync returns token from dataStore`() {
        every { tokenDataStore.getTokenSync() } returns "sync-token"

        val result = repository.getTokenSync()

        assertEquals("sync-token", result)
    }

    @Test
    fun `getTokenSync returns null when dataStore has no token`() {
        every { tokenDataStore.getTokenSync() } returns null

        val result = repository.getTokenSync()

        assertNull(result)
    }

    // ========== hasToken ==========

    @Test
    fun `hasToken returns true when token exists`() {
        every { tokenDataStore.getTokenSync() } returns "some-token"

        assertTrue(repository.hasToken())
    }

    @Test
    fun `hasToken returns false when no token stored`() {
        every { tokenDataStore.getTokenSync() } returns null

        assertFalse(repository.hasToken())
    }

    @Test
    fun `hasToken uses getTokenSync internally`() {
        // Verify hasToken calls getTokenSync exactly once — it must not call the
        // suspend getToken or any other method to read the token.
        every { tokenDataStore.getTokenSync() } returns "tok"

        repository.hasToken()

        io.mockk.verify(exactly = 1) { tokenDataStore.getTokenSync() }
    }
}
