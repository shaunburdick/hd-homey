package com.hdhomey.app.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import androidx.test.core.app.ApplicationProvider
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.storage.AppPreferences
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Unit tests for ServerRepository.
 *
 * Tests CRUD operations, active server management, authentication updates,
 * and edge cases.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class ServerRepositoryTest {

    private lateinit var repository: ServerRepository
    private lateinit var appPreferences: AppPreferences
    private lateinit var context: Context
    private val Context.testDataStore: DataStore<Preferences> by preferencesDataStore(
        name = "test_server_repo_prefs"
    )

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        appPreferences = AppPreferences(context.testDataStore)
        appPreferences.clearAll() // Clean slate for each test
        repository = ServerRepository(appPreferences)
    }

    // ========== Add Server Tests ==========

    @Test
    fun `addServer should create new server with generated ID`() {
        val server = repository.addServer("Home Server", "http://192.168.1.100:3000")

        assertNotNull(server.id)
        assertEquals("Home Server", server.name)
        assertEquals("http://192.168.1.100:3000", server.url)
        assertNull(server.jwt)
        assertTrue(server.createdAt > 0)
    }

    @Test
    fun `addServer should persist server to preferences`() {
        repository.addServer("Test Server", "http://test.com")

        val servers = repository.getAllServers()
        assertEquals(1, servers.size)
        assertEquals("Test Server", servers[0].name)
    }

    @Test
    fun `addServer should trim whitespace from name and URL`() {
        val server = repository.addServer("  Home Server  ", "  http://test.com  ")

        assertEquals("Home Server", server.name)
        assertEquals("http://test.com", server.url)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `addServer should throw exception for duplicate name`() {
        repository.addServer("Home Server", "http://test1.com")
        repository.addServer("Home Server", "http://test2.com") // Should throw
    }

    @Test(expected = IllegalArgumentException::class)
    fun `addServer should throw exception for case-insensitive duplicate name`() {
        repository.addServer("Home Server", "http://test1.com")
        repository.addServer("home server", "http://test2.com") // Should throw
    }

    @Test
    fun `addServer should allow same URL with different names`() {
        val server1 = repository.addServer("Home", "http://test.com")
        val server2 = repository.addServer("Office", "http://test.com")

        assertNotEquals(server1.id, server2.id)
        assertEquals(2, repository.getServerCount())
    }

    // ========== Remove Server Tests ==========

    @Test
    fun `removeServer should remove existing server`() {
        val server = repository.addServer("Test Server", "http://test.com")
        
        val removed = repository.removeServer(server.id)
        
        assertTrue(removed)
        assertEquals(0, repository.getServerCount())
        assertNull(repository.getServerById(server.id))
    }

    @Test
    fun `removeServer should return false for non-existent ID`() {
        val removed = repository.removeServer("non-existent-id")
        
        assertFalse(removed)
    }

    @Test
    fun `removeServer should clear active server if it was the removed one`() {
        val server = repository.addServer("Test Server", "http://test.com")
        repository.setActiveServer(server.id)
        
        repository.removeServer(server.id)
        
        assertNull(repository.getActiveServer())
    }

    @Test
    fun `removeServer should not clear active server if different server removed`() {
        val server1 = repository.addServer("Server 1", "http://test1.com")
        val server2 = repository.addServer("Server 2", "http://test2.com")
        repository.setActiveServer(server1.id)
        
        repository.removeServer(server2.id)
        
        assertEquals(server1.id, repository.getActiveServer()?.id)
    }

    // ========== Get Servers Tests ==========

    @Test
    fun `getAllServers should return empty list when no servers`() {
        val servers = repository.getAllServers()
        
        assertEquals(0, servers.size)
    }

    @Test
    fun `getAllServers should return all servers sorted by lastConnected`() {
        val server1 = repository.addServer("Server 1", "http://test1.com")
        Thread.sleep(10) // Ensure different timestamps
        val server2 = repository.addServer("Server 2", "http://test2.com")
        Thread.sleep(10)
        val server3 = repository.addServer("Server 3", "http://test3.com")
        
        val servers = repository.getAllServers()
        
        assertEquals(3, servers.size)
        // Most recent first
        assertEquals(server3.id, servers[0].id)
        assertEquals(server2.id, servers[1].id)
        assertEquals(server1.id, servers[2].id)
    }

    @Test
    fun `getServerById should return server when exists`() {
        val addedServer = repository.addServer("Test Server", "http://test.com")
        
        val foundServer = repository.getServerById(addedServer.id)
        
        assertNotNull(foundServer)
        assertEquals(addedServer.id, foundServer?.id)
        assertEquals(addedServer.name, foundServer?.name)
    }

    @Test
    fun `getServerById should return null when not exists`() {
        val foundServer = repository.getServerById("non-existent-id")
        
        assertNull(foundServer)
    }

    // ========== Update Server Tests ==========

    @Test
    fun `updateServer should update existing server`() {
        val server = repository.addServer("Original Name", "http://test.com")
        val updatedServer = server.copy(name = "Updated Name")
        
        val updated = repository.updateServer(updatedServer)
        
        assertTrue(updated)
        assertEquals("Updated Name", repository.getServerById(server.id)?.name)
    }

    @Test
    fun `updateServer should return false for non-existent server`() {
        val fakeServer = Server(id = "fake-id", name = "Fake", url = "http://fake.com")
        
        val updated = repository.updateServer(fakeServer)
        
        assertFalse(updated)
    }

    @Test
    fun `updateServer should preserve server ID`() {
        val server = repository.addServer("Test", "http://test.com")
        val originalId = server.id
        val updatedServer = server.copy(name = "New Name")
        
        repository.updateServer(updatedServer)
        
        assertEquals(originalId, repository.getServerById(originalId)?.id)
    }

    // ========== Active Server Tests ==========

    @Test
    fun `setActiveServer should set active server`() {
        val server = repository.addServer("Test Server", "http://test.com")
        
        val result = repository.setActiveServer(server.id)
        
        assertTrue(result)
        assertEquals(server.id, repository.getActiveServer()?.id)
    }

    @Test
    fun `setActiveServer should return false for non-existent server`() {
        val result = repository.setActiveServer("non-existent-id")
        
        assertFalse(result)
    }

    @Test
    fun `setActiveServer should update lastConnected timestamp`() {
        val server = repository.addServer("Test Server", "http://test.com")
        val originalTimestamp = server.lastConnected
        
        Thread.sleep(10) // Ensure different timestamp
        repository.setActiveServer(server.id)
        
        val updatedServer = repository.getServerById(server.id)
        assertTrue(updatedServer!!.lastConnected > originalTimestamp)
    }

    @Test
    fun `getActiveServer should return null when no active server`() {
        val activeServer = repository.getActiveServer()
        
        assertNull(activeServer)
    }

    @Test
    fun `getActiveServer should return null when active server ID points to deleted server`() {
        val server = repository.addServer("Test Server", "http://test.com")
        repository.setActiveServer(server.id)
        
        // Manually delete server (bypassing repository to simulate edge case)
        appPreferences.saveServers(emptyList())
        
        val activeServer = repository.getActiveServer()
        assertNull(activeServer)
    }

    @Test
    fun `clearActiveServer should clear active server selection`() {
        val server = repository.addServer("Test Server", "http://test.com")
        repository.setActiveServer(server.id)
        
        val cleared = repository.clearActiveServer()
        
        assertTrue(cleared)
        assertNull(repository.getActiveServer())
        // Server should still exist
        assertNotNull(repository.getServerById(server.id))
    }

    // ========== Authentication Tests ==========

    @Test
    fun `updateServerAuthentication should update auth fields`() {
        val server = repository.addServer("Test Server", "http://test.com")
        val expiresAt = System.currentTimeMillis() + 3600000
        
        val updated = repository.updateServerAuthentication(
            serverId = server.id,
            jwt = "fake-jwt-token",
            expiresAt = expiresAt,
            username = "testuser",
            userRole = "admin"
        )
        
        assertTrue(updated)
        val updatedServer = repository.getServerById(server.id)
        assertEquals("fake-jwt-token", updatedServer?.jwt)
        assertEquals(expiresAt, updatedServer?.expiresAt)
        assertEquals("testuser", updatedServer?.username)
        assertEquals("admin", updatedServer?.userRole)
    }

    @Test
    fun `updateServerAuthentication should return false for non-existent server`() {
        val updated = repository.updateServerAuthentication(
            serverId = "non-existent",
            jwt = "token",
            expiresAt = System.currentTimeMillis(),
            username = "user",
            userRole = "viewer"
        )
        
        assertFalse(updated)
    }

    @Test
    fun `clearServerAuthentication should clear auth fields`() {
        val server = repository.addServer("Test Server", "http://test.com")
        repository.updateServerAuthentication(
            server.id, "token", System.currentTimeMillis(), "user", "admin"
        )
        
        val cleared = repository.clearServerAuthentication(server.id)
        
        assertTrue(cleared)
        val clearedServer = repository.getServerById(server.id)
        assertNull(clearedServer?.jwt)
        assertNull(clearedServer?.username)
        assertNull(clearedServer?.userRole)
        assertNull(clearedServer?.expiresAt)
    }

    @Test
    fun `clearServerAuthentication should return false for non-existent server`() {
        val cleared = repository.clearServerAuthentication("non-existent-id")
        
        assertFalse(cleared)
    }

    // ========== Helper Methods Tests ==========

    @Test
    fun `hasServers should return false when no servers`() {
        assertFalse(repository.hasServers())
    }

    @Test
    fun `hasServers should return true when servers exist`() {
        repository.addServer("Test Server", "http://test.com")
        
        assertTrue(repository.hasServers())
    }

    @Test
    fun `getServerCount should return correct count`() {
        assertEquals(0, repository.getServerCount())
        
        repository.addServer("Server 1", "http://test1.com")
        assertEquals(1, repository.getServerCount())
        
        repository.addServer("Server 2", "http://test2.com")
        assertEquals(2, repository.getServerCount())
        
        val servers = repository.getAllServers()
        repository.removeServer(servers[0].id)
        assertEquals(1, repository.getServerCount())
    }

    @Test
    fun `isServerNameExists should return false when name does not exist`() {
        assertFalse(repository.isServerNameExists("Nonexistent"))
    }

    @Test
    fun `isServerNameExists should return true when name exists`() {
        repository.addServer("Home Server", "http://test.com")
        
        assertTrue(repository.isServerNameExists("Home Server"))
    }

    @Test
    fun `isServerNameExists should be case-insensitive`() {
        repository.addServer("Home Server", "http://test.com")
        
        assertTrue(repository.isServerNameExists("home server"))
        assertTrue(repository.isServerNameExists("HOME SERVER"))
        assertTrue(repository.isServerNameExists("HoMe SeRvEr"))
    }

    @Test
    fun `isServerNameExists should exclude specified ID`() {
        val server = repository.addServer("Test Server", "http://test.com")
        
        // Same name, but excluding this server's ID (useful for updates)
        assertFalse(repository.isServerNameExists("Test Server", excludeId = server.id))
    }

    @Test
    fun `isServerNameExists should not exclude other servers`() {
        val server1 = repository.addServer("Server 1", "http://test1.com")
        repository.addServer("Server 2", "http://test2.com")
        
        // Checking "Server 2" while excluding server1's ID should still return true
        assertTrue(repository.isServerNameExists("Server 2", excludeId = server1.id))
    }
}
