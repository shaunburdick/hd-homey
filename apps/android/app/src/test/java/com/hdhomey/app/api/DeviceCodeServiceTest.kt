package com.hdhomey.app.api

import com.hdhomey.app.api.models.DeviceCodeResponse
import com.hdhomey.app.api.models.PollResponse
import com.hdhomey.app.api.models.UserInfo
import io.mockk.*
import kotlinx.coroutines.test.runTest
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.IOException

/**
 * Unit tests for DeviceCodeService.
 *
 * Uses MockK to mock OkHttpClient and test network interactions
 * without requiring a real backend server.
 */
class DeviceCodeServiceTest {

    private lateinit var httpClient: OkHttpClient
    private lateinit var call: okhttp3.Call
    private lateinit var service: DeviceCodeService

    private val serverUrl = "http://test.example.com"
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    @Before
    fun setup() {
        // Mock Android Log class
        mockkStatic(android.util.Log::class)
        every { android.util.Log.d(any(), any()) } returns 0
        every { android.util.Log.e(any(), any()) } returns 0
        every { android.util.Log.e(any(), any(), any()) } returns 0
        
        httpClient = mockk()
        call = mockk<okhttp3.Call>()
        service = DeviceCodeService(serverUrl, httpClient)
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    // ========== generateCode() Tests ==========

    @Test
    fun `generateCode should return DeviceCodeResponse on success`() = runTest {
        val responseJson = """
            {
                "code": "ABC123",
                "expiresAt": "2025-12-14T12:00:00.000Z",
                "pairingUrl": "http://test.example.com/pair?code=ABC123"
            }
        """.trimIndent()

        mockSuccessfulResponse(responseJson)

        val result = service.generateCode("Test Device")

        assertEquals("ABC123", result.code)
        assertEquals("2025-12-14T12:00:00.000Z", result.expiresAt)
        assertEquals("http://test.example.com/pair?code=ABC123", result.pairingUrl)

        verify {
            httpClient.newCall(match { request ->
                request.url.toString() == "$serverUrl/api/auth/device/code" &&
                request.method == "POST"
            })
        }
    }

    @Test
    fun `generateCode should send correct request body`() = runTest {
        val responseJson = """
            {
                "code": "XYZ789",
                "expiresAt": "2025-12-14T12:00:00.000Z",
                "pairingUrl": "http://test.example.com/pair?code=XYZ789"
            }
        """.trimIndent()

        var capturedRequestBody: String? = null

        every { httpClient.newCall(any()) } answers {
            val request = firstArg<Request>()
            val buffer = okio.Buffer()
            request.body?.writeTo(buffer)
            capturedRequestBody = buffer.readUtf8()
            this@DeviceCodeServiceTest.call
        }
        every { call.execute() } returns Response.Builder()
            .request(Request.Builder().url(serverUrl).build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(responseJson.toResponseBody(jsonMediaType))
            .build()

        service.generateCode("My TV")

        assertNotNull(capturedRequestBody)
        assertTrue(capturedRequestBody!!.contains("\"deviceName\":\"My TV\""))
        assertTrue(capturedRequestBody!!.contains("\"deviceType\":\"tv\""))
    }

    @Test(expected = Exception::class)
    fun `generateCode should throw exception on HTTP error`() = runTest {
        mockErrorResponse(400, "Bad Request")

        service.generateCode("Test Device")
    }

    @Test(expected = Exception::class)
    fun `generateCode should throw exception on network error`() = runTest {
        every { httpClient.newCall(any()) } returns call
        every { call.execute() } throws IOException("Network unreachable")

        service.generateCode("Test Device")
    }

    @Test(expected = Exception::class)
    fun `generateCode should throw exception on empty response body`() = runTest {
        every { httpClient.newCall(any()) } returns call
        every { call.execute() } returns Response.Builder()
            .request(Request.Builder().url(serverUrl).build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(null)
            .build()

        service.generateCode("Test Device")
    }

    @Test(expected = Exception::class)
    fun `generateCode should throw exception on malformed JSON`() = runTest {
        mockSuccessfulResponse("{ invalid json }")

        service.generateCode("Test Device")
    }

    @Test
    fun `generateCode should handle special characters in device name`() = runTest {
        val responseJson = """
            {
                "code": "TEST01",
                "expiresAt": "2025-12-14T12:00:00.000Z",
                "pairingUrl": "http://test.example.com/pair?code=TEST01"
            }
        """.trimIndent()

        mockSuccessfulResponse(responseJson)

        val result = service.generateCode("Living Room TV (4K)")

        assertEquals("TEST01", result.code)
    }

    // ========== pollAuthorization() Tests ==========

    @Test
    fun `pollAuthorization should return pending status`() = runTest {
        val responseJson = """
            {
                "status": "pending"
            }
        """.trimIndent()

        mockSuccessfulResponse(responseJson)

        val result = service.pollAuthorization("ABC123")

        assertEquals("pending", result.status)
        assertNull(result.token)
        assertNull(result.user)

        verify {
            httpClient.newCall(match { request ->
                request.url.toString() == "$serverUrl/api/auth/device/poll?code=ABC123" &&
                request.method == "GET"
            })
        }
    }

    @Test
    fun `pollAuthorization should return authorized status with token`() = runTest {
        val responseJson = """
            {
                "status": "authorized",
                "token": "fake-jwt-token",
                "expiresAt": 1234567890000,
                "user": {
                    "username": "testuser",
                    "role": "admin"
                }
            }
        """.trimIndent()

        mockSuccessfulResponse(responseJson)

        val result = service.pollAuthorization("ABC123")

        assertEquals("authorized", result.status)
        assertEquals("fake-jwt-token", result.token)
        assertEquals(1234567890000L, result.expiresAt)
        assertNotNull(result.user)
        assertEquals("testuser", result.user?.username)
        assertEquals("admin", result.user?.role)
    }

    @Test
    fun `pollAuthorization should return expired status`() = runTest {
        val responseJson = """
            {
                "status": "expired"
            }
        """.trimIndent()

        mockSuccessfulResponse(responseJson)

        val result = service.pollAuthorization("ABC123")

        assertEquals("expired", result.status)
        assertNull(result.token)
    }

    @Test
    fun `pollAuthorization should return denied status`() = runTest {
        val responseJson = """
            {
                "status": "denied"
            }
        """.trimIndent()

        mockSuccessfulResponse(responseJson)

        val result = service.pollAuthorization("ABC123")

        assertEquals("denied", result.status)
        assertNull(result.token)
    }

    @Test(expected = Exception::class)
    fun `pollAuthorization should throw exception on HTTP error`() = runTest {
        mockErrorResponse(404, "Not Found")

        service.pollAuthorization("INVALID")
    }

    @Test(expected = Exception::class)
    fun `pollAuthorization should throw exception on network error`() = runTest {
        every { httpClient.newCall(any()) } returns call
        every { call.execute() } throws IOException("Connection timeout")

        service.pollAuthorization("ABC123")
    }

    @Test(expected = Exception::class)
    fun `pollAuthorization should throw exception on empty response body`() = runTest {
        every { httpClient.newCall(any()) } returns call
        every { call.execute() } returns Response.Builder()
            .request(Request.Builder().url(serverUrl).build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(null)
            .build()

        service.pollAuthorization("ABC123")
    }

    @Test
    fun `pollAuthorization should handle viewer role`() = runTest {
        val responseJson = """
            {
                "status": "authorized",
                "token": "viewer-jwt-token",
                "expiresAt": 1234567890000,
                "user": {
                    "username": "vieweruser",
                    "role": "viewer"
                }
            }
        """.trimIndent()

        mockSuccessfulResponse(responseJson)

        val result = service.pollAuthorization("XYZ789")

        assertEquals("authorized", result.status)
        assertEquals("viewer", result.user?.role)
    }

    @Test
    fun `pollAuthorization should ignore unknown JSON fields`() = runTest {
        val responseJson = """
            {
                "status": "pending",
                "unknownField": "should be ignored",
                "anotherUnknown": 12345
            }
        """.trimIndent()

        mockSuccessfulResponse(responseJson)

        val result = service.pollAuthorization("ABC123")

        assertEquals("pending", result.status)
        // Should not throw exception even with unknown fields
    }

    // ========== Helper Methods ==========

    private fun mockSuccessfulResponse(responseBody: String) {
        every { httpClient.newCall(any()) } returns call
        every { call.execute() } returns Response.Builder()
            .request(Request.Builder().url(serverUrl).build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(responseBody.toResponseBody(jsonMediaType))
            .build()
    }

    private fun mockErrorResponse(code: Int, message: String) {
        every { httpClient.newCall(any()) } returns call
        every { call.execute() } returns Response.Builder()
            .request(Request.Builder().url(serverUrl).build())
            .protocol(Protocol.HTTP_1_1)
            .code(code)
            .message(message)
            .body("Error".toResponseBody(jsonMediaType))
            .build()
    }
}
