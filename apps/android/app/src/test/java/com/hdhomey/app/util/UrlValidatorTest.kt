package com.hdhomey.app.util

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for UrlValidator.
 *
 * Tests validation, normalization, and edge cases for HTTP/HTTPS URLs.
 */
class UrlValidatorTest {

    @Test
    fun `validate should accept valid HTTP URL with port`() {
        val result = UrlValidator.validate("http://192.168.1.100:3000")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("http://192.168.1.100:3000", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should accept valid HTTPS URL`() {
        val result = UrlValidator.validate("https://example.com")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("https://example.com", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should auto-prepend http when no protocol specified`() {
        val result = UrlValidator.validate("192.168.1.100:3000")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("http://192.168.1.100:3000", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should auto-prepend http for domain without protocol`() {
        val result = UrlValidator.validate("example.com")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("http://example.com", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should remove trailing slash`() {
        val result = UrlValidator.validate("http://example.com/")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("http://example.com", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should preserve path without trailing slash`() {
        val result = UrlValidator.validate("http://example.com/api")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("http://example.com/api", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should remove default HTTP port 80`() {
        val result = UrlValidator.validate("http://example.com:80")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("http://example.com", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should remove default HTTPS port 443`() {
        val result = UrlValidator.validate("https://example.com:443")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("https://example.com", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should trim whitespace`() {
        val result = UrlValidator.validate("  http://example.com  ")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("http://example.com", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should reject empty string`() {
        val result = UrlValidator.validate("")
        assertTrue(result is UrlValidator.ValidationResult.Error)
        assertEquals("URL cannot be empty", (result as UrlValidator.ValidationResult.Error).message)
    }

    @Test
    fun `validate should reject whitespace-only string`() {
        val result = UrlValidator.validate("   ")
        assertTrue(result is UrlValidator.ValidationResult.Error)
        assertEquals("URL cannot be empty", (result as UrlValidator.ValidationResult.Error).message)
    }

    @Test
    fun `validate should reject unsupported protocol`() {
        val result = UrlValidator.validate("ftp://example.com")
        assertTrue(result is UrlValidator.ValidationResult.Error)
        assertTrue((result as UrlValidator.ValidationResult.Error).message.contains("HTTP and HTTPS"))
    }

    @Test
    fun `validate should reject invalid URL format`() {
        // Use URLs with invalid characters that java.net.URL consistently rejects
        val result = UrlValidator.validate("http://[invalid")
        assertTrue(result is UrlValidator.ValidationResult.Error)
        assertTrue((result as UrlValidator.ValidationResult.Error).message.contains("Invalid URL format"))
    }

    @Test
    fun `validate should accept localhost`() {
        val result = UrlValidator.validate("http://localhost:3000")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("http://localhost:3000", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `validate should accept 10_0_2_2 Android emulator localhost alias`() {
        val result = UrlValidator.validate("http://10.0.2.2:3000")
        assertTrue(result is UrlValidator.ValidationResult.Success)
        assertEquals("http://10.0.2.2:3000", (result as UrlValidator.ValidationResult.Success).url)
    }

    @Test
    fun `isValid should return true for valid URL`() {
        assertTrue(UrlValidator.isValid("http://example.com"))
    }

    @Test
    fun `isValid should return false for invalid URL`() {
        assertFalse(UrlValidator.isValid(""))
        assertFalse(UrlValidator.isValid("ftp://example.com"))
        // Use URLs with invalid characters that java.net.URL consistently rejects
        assertFalse(UrlValidator.isValid("http://[invalid"))
    }

    @Test
    fun `getDisplayName should extract host and port`() {
        assertEquals("192.168.1.100:3000", UrlValidator.getDisplayName("http://192.168.1.100:3000"))
    }

    @Test
    fun `getDisplayName should extract host without default port`() {
        assertEquals("example.com", UrlValidator.getDisplayName("http://example.com:80"))
        assertEquals("example.com", UrlValidator.getDisplayName("https://example.com:443"))
    }

    @Test
    fun `getDisplayName should extract host only for standard ports`() {
        assertEquals("example.com", UrlValidator.getDisplayName("http://example.com"))
        assertEquals("example.com", UrlValidator.getDisplayName("https://example.com"))
    }

    @Test
    fun `getDisplayName should return empty string for invalid URL`() {
        assertEquals("", UrlValidator.getDisplayName(""))
        // Use URLs with invalid characters that java.net.URL consistently rejects
        assertEquals("", UrlValidator.getDisplayName("http://[invalid"))
    }

    @Test
    fun `getDisplayName should handle URL without protocol`() {
        assertEquals("192.168.1.100:3000", UrlValidator.getDisplayName("192.168.1.100:3000"))
    }
}
