package com.hdhomey.app.di

import com.hdhomey.app.BuildConfig
import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.api.interceptors.AuthInterceptor
import com.hdhomey.app.api.interceptors.ErrorInterceptor
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
 * lifetime — one shared [OkHttpClient], [Json] instance, [Retrofit], and
 * [HdHomeyApiService] for the whole app.
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
     * Provides the shared [OkHttpClient] with authentication and error-handling interceptors.
     *
     * Interceptor order matters:
     * 1. [AuthInterceptor] runs first — injects the `Cookie: better-auth.session_token=<TOKEN>`
     *    header on every outgoing request before it hits the wire.
     * 2. [ErrorInterceptor] runs second — inspects the response for 401/403/5xx status codes
     *    and sets [ErrorInterceptor.authFailureDetected] accordingly.
     *
     * Timeouts are intentionally generous (30 s) to accommodate HDHomeRun devices on
     * slower home networks.
     *
     * Both interceptors are provided by Hilt (via `@Inject constructor`) and are injected
     * as parameters here rather than through the module constructor (which is not allowed
     * for Dagger `object` modules).
     *
     * @param authInterceptor Injects the session cookie; provided by Hilt.
     * @param errorInterceptor Handles 401/403/5xx responses; provided by Hilt.
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        errorInterceptor: ErrorInterceptor,
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .addInterceptor(errorInterceptor)
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

    /**
     * Provides the [HdHomeyApiService] Retrofit service implementation.
     *
     * Retrofit generates the implementation at runtime by proxying the interface methods
     * to HTTP calls using the annotations declared in [HdHomeyApiService].
     *
     * The returned instance is a singleton — reusing one Retrofit-generated proxy avoids
     * unnecessary object allocation and keeps OkHttp's connection pool shared across all
     * API calls.
     *
     * @param retrofit Shared Retrofit instance provided by [provideRetrofit]
     * @return The generated implementation of [HdHomeyApiService]
     */
    @Provides
    @Singleton
    fun provideHdHomeyApi(retrofit: Retrofit): HdHomeyApiService =
        retrofit.create(HdHomeyApiService::class.java)
}
