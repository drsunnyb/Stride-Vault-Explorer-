//
//  PushService.swift
//  Stride
//
//  Registers the device for remote APNs notifications and upserts the token
//  to Supabase's `device_tokens` table so the admin can target this device
//  in city / Plus broadcasts.
//

import Foundation
import UIKit
import UserNotifications

/// Lightweight wrapper around UNUserNotificationCenter + APNs registration.
/// Mirrors the Expo `registerPush` flow so both clients land in the same
/// `device_tokens` table the admin reads from.
@MainActor
@Observable
final class PushService: NSObject {
    static let shared = PushService()

    private(set) var token: String?
    private(set) var lastRegistered: Date?

    /// Metadata the admin needs to target this device. Provide whatever the
    /// caller knows at the time — empty values are stored as NULL.
    var meta: PushMeta = PushMeta()

    /// Ask the user for notification permission. Returns true if granted.
    /// Safe to call from onboarding or from a settings toggle.
    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            if granted {
                UIApplication.shared.registerForRemoteNotifications()
            }
            return granted
        } catch {
            return false
        }
    }

    /// Called from the AppDelegate adapter when APNs hands us a device token.
    /// Encodes the raw bytes as a hex string (the format Apple's Push Service
    /// expects) and upserts to Supabase.
    func handle(deviceToken: Data) {
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        token = hex
        Task.detached { [hex, meta] in
            await Self.upsert(token: hex, meta: meta)
        }
        lastRegistered = Date()
    }

    /// Re-upsert when the player's city / Plus status changes so the admin
    /// keeps a fresh segmentation snapshot for every active device.
    func refreshContext(meta: PushMeta) {
        self.meta = meta
        guard let token else { return }
        Task.detached { [token, meta] in
            await Self.upsert(token: token, meta: meta)
        }
    }

    private static func upsert(token: String, meta: PushMeta) async {
        guard !Config.EXPO_PUBLIC_SUPABASE_URL.isEmpty,
              !Config.EXPO_PUBLIC_SUPABASE_ANON_KEY.isEmpty,
              let url = URL(string: "\(Config.EXPO_PUBLIC_SUPABASE_URL)/rest/v1/device_tokens")
        else { return }

        let iso = ISO8601DateFormatter()
        let body: [String: Any] = [
            "token": token,
            "platform": "apns",
            "auth_id": meta.authId ?? NSNull(),
            "username": meta.username ?? NSNull(),
            "home_city_id": meta.homeCityId ?? NSNull(),
            "plus": meta.plus,
            "locale": meta.locale ?? NSNull(),
            "updated_at": iso.string(from: Date()),
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: body) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(Config.EXPO_PUBLIC_SUPABASE_ANON_KEY, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(Config.EXPO_PUBLIC_SUPABASE_ANON_KEY)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
        req.httpBody = data
        _ = try? await URLSession.shared.data(for: req)
    }
}

/// Targeting metadata used when registering a token.
nonisolated struct PushMeta: Sendable {
    var authId: String?
    var username: String?
    var homeCityId: String?
    var plus: Bool = false
    var locale: String?
}
