package com.hdhomey.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Application class for HD Homey.
 *
 * Annotated with [HiltAndroidApp] to trigger Hilt's code generation and
 * serve as the application-level component for dependency injection.
 */
@HiltAndroidApp
class HdHomeyApplication : Application()
