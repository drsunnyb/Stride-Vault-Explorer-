//
//  StrideApp.swift
//  Stride
//

import SwiftUI
import UIKit

@main
struct StrideApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    init() {
        // Kick off the live catalogue sync so admin-controlled brands,
        // rewards, raffles and cities are ready by the time the user reaches
        // those screens. Falls back silently to local seeds on failure.
        Task.detached(priority: .utility) {
            await SupabaseService.shared.refreshAll()
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

/// Minimal AppDelegate so we can receive APNs device tokens. SwiftUI lifecycle
/// alone doesn't expose this callback, so we bridge it through and forward
/// the token to `PushService` which upserts it to Supabase.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in
            PushService.shared.handle(deviceToken: deviceToken)
        }
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Silent — common in the simulator. Real devices surface this only
        // when entitlements are misconfigured.
        print("[push] APNs registration failed:", error.localizedDescription)
    }
}
