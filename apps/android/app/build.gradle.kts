import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.hdhomey.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.hdhomey.app"
        minSdk = 28  // Android 9.0 (Pie) - ~95% device coverage
        targetSdk = 36  // Android 16
        versionCode = 1
        versionName = "0.1.0-alpha"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Load backend URL from local.properties
        val properties = project.rootProject.file("local.properties")
            .takeIf { it.exists() }
            ?.let { file ->
                Properties().apply {
                    file.inputStream().use { stream -> load(stream) }
                }
            }

        buildConfigField(
            "String",
            "BACKEND_URL",
            "\"${properties?.getProperty("backend.url") ?: "http://192.168.1.100:3000"}\""
        )

        // Android TV banner
        resValue("string", "app_name", "HD Homey")
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            isDebuggable = true
        }
        
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-opt-in=kotlin.RequiresOptIn",
            "-Xcontext-receivers"
        )
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
        compose = true
    }

    packaging {
        resources {
            merges += "META-INF/LICENSE.md"
            merges += "META-INF/LICENSE-notice.md"
        }
    }
}

ksp {
    arg("dagger.hilt.disableModulesHaveInstallInCheck", "true")
}

dependencies {
    // Force kotlin-stdlib throughout the project — Coil 3.5.0 transitively pulls kotlin-stdlib
    // 2.4.0 which the Kotlin 2.2.x compiler cannot read (metadata v2.4.0 > max 2.3.0).
    // Using resolutionStrategy.force() overrides all transitive versions with our chosen one.
    configurations.configureEach {
        resolutionStrategy {
            force("org.jetbrains.kotlin:kotlin-stdlib:${libs.versions.kotlin.get()}")
        }
    }

    // Kotlin
    implementation(libs.kotlin.stdlib)
    implementation(libs.kotlinx.coroutines.android)

    // AndroidX Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.lifecycle.livedata.ktx)
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.fragment.ktx)
    implementation(libs.androidx.recyclerview)
    implementation(libs.androidx.cardview)
    implementation(libs.androidx.coordinatorlayout)
    
    // Material Design
    implementation(libs.google.material)

    // Navigation
    implementation(libs.androidx.navigation.fragment.ktx)
    implementation(libs.androidx.navigation.ui.ktx)

    // Android TV
    implementation(libs.androidx.leanback)

    // Networking
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)

    // DataStore
    implementation(libs.datastore.preferences)
    implementation(libs.datastore.core)

    // Image loading
    implementation(libs.coil)

    // Media3 / ExoPlayer
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.exoplayer.hls)
    implementation(libs.media3.ui)
    implementation(libs.media3.session)

    // Dependency Injection (Hilt)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.fragment)

    // Security
    implementation(libs.androidx.security.crypto)

    // QR Code generation
    implementation(libs.zxing.core)

    // Testing
    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.turbine)

    // Force kotlin-metadata-jvm version to match Kotlin compiler
    // Required by Hilt's annotation processor for Kotlin 2.1.0 metadata support
    ksp("org.jetbrains.kotlin:kotlin-metadata-jvm:2.1.0")

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.compose.activity)
    implementation(libs.compose.navigation)
    implementation(libs.compose.hilt.navigation)
    implementation(libs.compose.window.size.classes)
    implementation(libs.coil.compose)
    debugImplementation(libs.compose.ui.tooling)
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.test.junit4)
    debugImplementation(libs.compose.ui.test.manifest)

    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.mockk.android)
}
