package com.hdhomey.app.storage

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.hdhomey.app.data.model.Server
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Unit tests for AppPreferences.
 *
 * Uses Robolectric for Android SharedPreferences testing.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28]) // API 28 (Android 9.0) - minSdk
class AppPreferencesTest {

    private lateinit var appPreferences: AppPreferences
    private lateinit var context: Context

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        appPreferences = AppPreferences(context)
        // Clear any existing data
        appPreferences.clearAll()
    }

    @Test
    fun `saveServers and loadServers should persist server list`() {
        val servers = listOf(
            Server(
                id = "server-1",
                name = "Home Server",
                url = "http://192.168.1.100:3000"
            ),
            Server(
                id = "server-2",
                name = "Office Server",
                url = "https://office.example.com"
            )
        )

        val saved = appPreferences.saveServers(servers)
        assertTrue(saved)

        val loaded = appPreferences.loadServers()
        assertEquals(2, loaded.size)
        assertEquals("Home Server", loaded[0].name)
        assertEquals("Office Server", loaded[1].name)
    }

    @Test
    fun `saveServers should serialize authenticated server correctly`() {
        val authenticatedServer = Server(
            id = "auth-server",
            name = "Authenticated Server",
            url = "http://test.com",
            jwt = "fake-jwt-token",
            expiresAt = System.currentTimeMillis() + 3600000, // 1 hour from now
            username = "testuser",
            userRole = "admin"
        )

        appPreferences.saveServers(listOf(authenticatedServer))
        val loaded = appPreferences.loadServers()

        assertEquals(1, loaded.size)
        assertEquals("Authenticated Server", loaded[0].name)
        assertEquals("fake-jwt-token", loaded[0].jwt)
        assertEquals("testuser", loaded[0].username)
        assertEquals("admin", loaded[0].userRole)
        assertNotNull(loaded[0].expiresAt)
    }

    @Test
    fun `loadServers should return empty list when no servers saved`() {
        val loaded = appPreferences.loadServers()
        assertEquals(0, loaded.size)
    }

    @Test
    fun `saveServers should overwrite previous servers`() {
        val initialServers = listOf(
            Server(id = "1", name = "Server 1", url = "http://test1.com")
        )
        appPreferences.saveServers(initialServers)

        val newServers = listOf(
            Server(id = "2", name = "Server 2", url = "http://test2.com"),
            Server(id = "3", name = "Server 3", url = "http://test3.com")
        )
        appPreferences.saveServers(newServers)

        val loaded = appPreferences.loadServers()
        assertEquals(2, loaded.size)
        assertEquals("Server 2", loaded[0].name)
        assertEquals("Server 3", loaded[1].name)
    }

    @Test
    fun `setActiveServerId and getActiveServerId should persist active server`() {
        val serverId = "active-server-123"
        
        val saved = appPreferences.setActiveServerId(serverId)
        assertTrue(saved)

        val loaded = appPreferences.getActiveServerId()
        assertEquals(serverId, loaded)
    }

    @Test
    fun `getActiveServerId should return null when no active server set`() {
        val loaded = appPreferences.getActiveServerId()
        assertNull(loaded)
    }

    @Test
    fun `setActiveServerId with null should clear active server`() {
        appPreferences.setActiveServerId("some-server")
        appPreferences.setActiveServerId(null)

        val loaded = appPreferences.getActiveServerId()
        assertNull(loaded)
    }

    @Test
    fun `isFirstLaunch should return true when no servers configured`() {
        assertTrue(appPreferences.isFirstLaunch())
    }

    @Test
    fun `isFirstLaunch should return false when servers exist`() {
        val servers = listOf(
            Server(id = "1", name = "Server", url = "http://test.com")
        )
        appPreferences.saveServers(servers)

        assertFalse(appPreferences.isFirstLaunch())
    }

    @Test
    fun `clearAll should remove all data`() {
        appPreferences.saveServers(
            listOf(Server(id = "1", name = "Test", url = "http://test.com"))
        )
        appPreferences.setActiveServerId("some-id")

        val cleared = appPreferences.clearAll()
        assertTrue(cleared)

        assertTrue(appPreferences.loadServers().isEmpty())
        assertNull(appPreferences.getActiveServerId())
        assertTrue(appPreferences.isFirstLaunch())
    }

    @Test
    fun `clearActiveServer should only remove active server ID`() {
        val servers = listOf(
            Server(id = "1", name = "Test", url = "http://test.com")
        )
        appPreferences.saveServers(servers)
        appPreferences.setActiveServerId("some-id")

        val cleared = appPreferences.clearActiveServer()
        assertTrue(cleared)

        // Servers should still exist
        assertEquals(1, appPreferences.loadServers().size)
        // But active server should be null
        assertNull(appPreferences.getActiveServerId())
    }

    @Test
    fun `getInstance should return singleton instance`() {
        val instance1 = AppPreferences.getInstance(context)
        val instance2 = AppPreferences.getInstance(context)

        // Should be same instance
        assertSame(instance1, instance2)
    }

    @Test
    fun `saveServers should handle empty list`() {
        val saved = appPreferences.saveServers(emptyList())
        assertTrue(saved)

        val loaded = appPreferences.loadServers()
        assertEquals(0, loaded.size)
    }
}
