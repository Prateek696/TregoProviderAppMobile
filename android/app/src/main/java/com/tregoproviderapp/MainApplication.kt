package com.tregoproviderapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(TregoNotificationPackage())
          add(TregoBubblePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    // Kick offline queue: drop corrupted/silent items, register network listener,
    // and immediately try to flush anything that was queued while the process was dead.
    try {
      TregoOfflineQueue.purgeCorrupted(this)
      TregoOfflineQueue.ensureConnectivityListener(this)
      if (TregoOfflineQueue.count(this) > 0) TregoOfflineQueue.flush(this)
    } catch (e: Exception) {
      android.util.Log.e("MainApplication", "Offline queue init failed: ${e.message}")
    }
  }
}
