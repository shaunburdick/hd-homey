package com.hdhomey.app.di

import com.hdhomey.app.BuildConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt DI module providing singleton network dependencies.
 *
 * Installed in [SingletonComponent] so all provided objects are scoped to the application
 * lifetime — one shared [OkHttpClient], [Json] instance, and [Retrofit] for the whole app.
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * Provides the [Json] serializer used by Retrofit's converter factory.
     *
     * Configuration:
     * - [Json.ignoreUnknownKeys]: tolerates new server-side fields without crashing
     * - [Json.encodeDefaults]: serialises default-value properties (needed for request bodies)
     * - [Json.prettyPrint] = false: compact wire format
     */
    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        prettyPrint = false
    }

    /**
     * Provides the shared [OkHttpClient].
     *
     * Timeouts are intentionally generous (30 s) to accommodate HDHomeRun devices on
     * slower home networks. Other modules (e.g., DataModule) may add interceptors by
     * taking this client as a dependency and calling [OkHttpClient.newBuilder].
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Provides the application-wide [Retrofit] instance.
     *
     * Base URL is sourced from [BuildConfig.BACKEND_URL] (set via `local.properties` at
     * build time). The trailing slash is appended here because Retrofit requires it on the
     * base URL, but [BuildConfig.BACKEND_URL] may or may not include it.
     *
     * The [Json] converter factory handles both request body serialisation and response
     * deserialisation for all Retrofit service interfaces.
     *
     * @param okHttpClient Shared HTTP client provided by [provideOkHttpClient]
     * @param json Shared JSON serializer provided by [provideJson]
     */
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, json: Json): Retrofit {
        val contentType = "application/json".toMediaType()
        return Retrofit.Builder()
            .baseUrl(BuildConfig.BACKEND_URL.trimEnd('/') + "/") // Ensure exactly one trailing slash
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }
}
