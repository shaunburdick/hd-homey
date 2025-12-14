package com.hdhomey.app.data.repository

import app.cash.turbine.test
import com.hdhomey.app.storage.TokenDataStore
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for TokenRepository.
 *
 * Tests JWT token operations, Flow-based reactive access,
 * and server ID management.
 */
class TokenRepositoryTest {

    private lateinit var repository: TokenRepository
    private lateinit var tokenDataStore: TokenDataStore

    // Test data
    private val testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"
    private val testServerId = "server-123"

    @Before
    fun setup() {
        tokenDataStore = mockk(relaxed = true)
        repository = TokenRepository(tokenDataStore)
    }

    // ========== Save Token Tests ==========

    @Test
    fun `saveToken should call tokenDataStore saveToken`() = runTest {
        // When: Save token
        repository.saveToken(testToken)

        // Then: DataStore saveToken should be called
        coVerify { tokenDataStore.saveToken(testToken) }
    }

    @Test
    fun `saveToken should accept empty string`() = runTest {
        // When: Save empty token
        repository.saveToken("")

        // Then: DataStore should accept it
        coVerify { tokenDataStore.saveToken("") }
    }

    // ========== Get Token Tests ==========

    @Test
    fun `getToken should return token from DataStore`() = runTest {
        // Given: Token exists in DataStore
        every { tokenDataStore.getToken() } returns flowOf(testToken)

        // When: Get token
        val token = repository.getToken()

        // Then: Token is returned
        assertEquals(testToken, token)
    }

    @Test
    fun `getToken should return null when no token stored`() = runTest {
        // Given: No token in DataStore
        every { tokenDataStore.getToken() } returns flowOf(null)

        // When: Get token
        val token = repository.getToken()

        // Then: Null is returned
        assertNull(token)
    }

    @Test
    fun `getTokenFlow should return Flow from DataStore`() = runTest {
        // Given: Token Flow from DataStore
        every { tokenDataStore.getToken() } returns flowOf(testToken)

        // When: Get token flow
        repository.getTokenFlow().test {
            // Then: Token is emitted
            assertEquals(testToken, awaitItem())
            awaitComplete()
        }
    }

    @Test
    fun `getTokenFlow should emit null when no token`() = runTest {
        // Given: No token
        every { tokenDataStore.getToken() } returns flowOf(null)

        // When: Get token flow
        repository.getTokenFlow().test {
            // Then: Null is emitted
            assertNull(awaitItem())
            awaitComplete()
        }
    }

    @Test
    fun `getTokenFlow should emit updates when token changes`() = runTest {
        // Given: Token changes over time
        every { tokenDataStore.getToken() } returns flowOf(null, "token1", "token2")

        // When: Collect token flow
        repository.getTokenFlow().test {
            // Then: All values are emitted
            assertNull(awaitItem())
            assertEquals("token1", awaitItem())
            assertEquals("token2", awaitItem())
            awaitComplete()
        }
    }

    // ========== Has Token Tests ==========

    @Test
    fun `hasToken should return true when token exists`() = runTest {
        // Given: Token exists
        every { tokenDataStore.getToken() } returns flowOf(testToken)

        // When: Check has token
        val hasToken = repository.hasToken()

        // Then: Returns true
        assertTrue(hasToken)
    }

    @Test
    fun `hasToken should return false when no token`() = runTest {
        // Given: No token
        every { tokenDataStore.getToken() } returns flowOf(null)

        // When: Check has token
        val hasToken = repository.hasToken()

        // Then: Returns false
        assertFalse(hasToken)
    }

    @Test
    fun `hasToken should return false for empty string token`() = runTest {
        // Given: Empty string token (edge case)
        every { tokenDataStore.getToken() } returns flowOf("")

        // When: Check has token
        val hasToken = repository.hasToken()

        // Then: Returns false (empty string is falsy)
        assertFalse(hasToken)
    }

    // ========== Clear Token Tests ==========

    @Test
    fun `clearToken should call tokenDataStore clearToken`() = runTest {
        // When: Clear token
        repository.clearToken()

        // Then: DataStore clearToken should be called
        coVerify { tokenDataStore.clearToken() }
    }

    @Test
    fun `clearToken should work when no token exists`() = runTest {
        // Given: No token (defensive test)
        coEvery { tokenDataStore.clearToken() } returns Unit

        // When: Clear token
        repository.clearToken()

        // Then: Should not throw
        coVerify { tokenDataStore.clearToken() }
    }

    // ========== Server ID Tests ==========

    @Test
    fun `saveActiveServerId should call tokenDataStore`() = runTest {
        // When: Save server ID
        repository.saveActiveServerId(testServerId)

        // Then: DataStore should be called
        coVerify { tokenDataStore.saveActiveServerId(testServerId) }
    }

    @Test
    fun `getActiveServerId should return server ID from DataStore`() = runTest {
        // Given: Server ID in DataStore
        every { tokenDataStore.getActiveServerId() } returns flowOf(testServerId)

        // When: Get server ID
        val serverId = repository.getActiveServerId()

        // Then: Server ID is returned
        assertEquals(testServerId, serverId)
    }

    @Test
    fun `getActiveServerId should return null when no server ID`() = runTest {
        // Given: No server ID
        every { tokenDataStore.getActiveServerId() } returns flowOf(null)

        // When: Get server ID
        val serverId = repository.getActiveServerId()

        // Then: Null is returned
        assertNull(serverId)
    }

    @Test
    fun `getActiveServerIdFlow should return Flow from DataStore`() = runTest {
        // Given: Server ID Flow
        every { tokenDataStore.getActiveServerId() } returns flowOf(testServerId)

        // When: Get server ID flow
        repository.getActiveServerIdFlow().test {
            // Then: Server ID is emitted
            assertEquals(testServerId, awaitItem())
            awaitComplete()
        }
    }

    @Test
    fun `getActiveServerIdFlow should emit null when no server`() = runTest {
        // Given: No server ID
        every { tokenDataStore.getActiveServerId() } returns flowOf(null)

        // When: Get server ID flow
        repository.getActiveServerIdFlow().test {
            // Then: Null is emitted
            assertNull(awaitItem())
            awaitComplete()
        }
    }

    // ========== Clear All Tests ==========

    @Test
    fun `clearAll should call tokenDataStore clearAll`() = runTest {
        // When: Clear all
        repository.clearAll()

        // Then: DataStore clearAll should be called
        coVerify { tokenDataStore.clearAll() }
    }

    @Test
    fun `clearAll should remove both token and server ID`() = runTest {
        // Given: Token and server ID exist
        coEvery { tokenDataStore.clearAll() } returns Unit

        // When: Clear all
        repository.clearAll()

        // Then: clearAll called once
        coVerify(exactly = 1) { tokenDataStore.clearAll() }
    }

    // ========== Token Refresh Tests ==========

    @Test
    fun `refreshToken should return NotImplementedError`() = runTest {
        // When: Attempt to refresh token
        val result = repository.refreshToken()

        // Then: Result is failure with NotImplementedError
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is NotImplementedError)
    }

    @Test
    fun `refreshToken error message should indicate not implemented`() = runTest {
        // When: Attempt to refresh token
        val result = repository.refreshToken()

        // Then: Error message is clear
        val exception = result.exceptionOrNull() as NotImplementedError
        assertTrue(exception.message?.contains("not implemented") == true)
    }

    // ========== Integration/Flow Tests ==========

    @Test
    fun `typical authentication flow should work correctly`() = runTest {
        // Simulate: Login → Save Token → Check Token → Logout
        
        // 1. Initially no token
        every { tokenDataStore.getToken() } returns flowOf(null)
        assertFalse(repository.hasToken())
        
        // 2. User logs in, token saved
        repository.saveToken(testToken)
        coVerify { tokenDataStore.saveToken(testToken) }
        
        // 3. Token now exists
        every { tokenDataStore.getToken() } returns flowOf(testToken)
        assertTrue(repository.hasToken())
        assertEquals(testToken, repository.getToken())
        
        // 4. User logs out, token cleared
        repository.clearToken()
        coVerify { tokenDataStore.clearToken() }
    }

    @Test
    fun `server switch flow should work correctly`() = runTest {
        // Simulate: Save Server A → Switch to Server B → Clear
        
        // 1. Save first server
        repository.saveActiveServerId("server-A")
        coVerify { tokenDataStore.saveActiveServerId("server-A") }
        
        // 2. Switch to second server
        repository.saveActiveServerId("server-B")
        coVerify { tokenDataStore.saveActiveServerId("server-B") }
        
        // 3. Clear server (logout from all)
        repository.clearAll()
        coVerify { tokenDataStore.clearAll() }
    }

    @Test
    fun `reactive token updates should propagate through Flow`() = runTest {
        // Given: Token updates over time (simulating login/logout)
        every { tokenDataStore.getToken() } returns flowOf(
            null,           // No token initially
            "token1",       // User logs in
            "token2",       // Token refreshed
            null            // User logs out
        )

        // When: Observe token flow
        repository.getTokenFlow().test {
            // Then: All updates propagate
            assertNull(awaitItem())             // Initial: no token
            assertEquals("token1", awaitItem()) // Login
            assertEquals("token2", awaitItem()) // Refresh
            assertNull(awaitItem())             // Logout
            awaitComplete()
        }
    }

    // ========== Edge Cases ==========

    @Test
    fun `saving same token twice should not cause issues`() = runTest {
        // When: Save same token twice
        repository.saveToken(testToken)
        repository.saveToken(testToken)

        // Then: Should be called twice (idempotent)
        coVerify(exactly = 2) { tokenDataStore.saveToken(testToken) }
    }

    @Test
    fun `clearing token multiple times should not cause issues`() = runTest {
        // When: Clear token multiple times
        repository.clearToken()
        repository.clearToken()
        repository.clearToken()

        // Then: Should be called three times (idempotent)
        coVerify(exactly = 3) { tokenDataStore.clearToken() }
    }

    @Test
    fun `very long token string should be accepted`() = runTest {
        // Given: Very long JWT token (typical for real JWTs)
        val longToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "a".repeat(500)

        // When: Save long token
        repository.saveToken(longToken)

        // Then: Should be saved without issues
        coVerify { tokenDataStore.saveToken(longToken) }
    }

    @Test
    fun `special characters in server ID should be accepted`() = runTest {
        // Given: Server ID with special characters
        val specialServerId = "server-123_ABC.test@domain.com"

        // When: Save server ID
        repository.saveActiveServerId(specialServerId)

        // Then: Should be saved
        coVerify { tokenDataStore.saveActiveServerId(specialServerId) }
    }
}
