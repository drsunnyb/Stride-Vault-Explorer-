import Foundation
import UserNotifications

/// Wraps `UNUserNotificationCenter` so the rest of the app stays free of
/// import noise. Mirrors `expo/lib/notifications.ts` 1:1 — daily, hot vault,
/// streak warning, final hour, power hour heads-up, raffle ending, prediction
/// settle, and vault respawn.
nonisolated enum NotificationService {

    // ── Identifiers (match Expo tag prefixes) ───────────────────────────────
    static let dailyId        = "sq.daily"
    static let hotVaultId     = "sq.hot"
    static let streakId       = "sq.streak"
    static func respawnId(_ vaultId: String) -> String { "sq.respawn.\(vaultId)" }
    static func raffleId(_ raffleId: String) -> String { "sq.raffle.\(raffleId)" }
    static func powerId(_ startsAt: Date) -> String { "sq.power.\(Int(startsAt.timeIntervalSince1970))" }
    static func finalId(_ endsAt: Date) -> String { "sq.final.\(Int(endsAt.timeIntervalSince1970))" }
    static func predictId(_ endsAt: Date) -> String { "sq.predict.\(Int(endsAt.timeIntervalSince1970))" }

    // ── Permission ──────────────────────────────────────────────────────────
    @discardableResult
    static func requestPermission() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
        } catch {
            return false
        }
    }

    // ── Daily 9am nudge ─────────────────────────────────────────────────────
    static func scheduleDailyReminder() async {
        let content = UNMutableNotificationContent()
        content.title = "Your London map is waking up."
        content.body = "Fresh vaults dropped overnight. Start your streak before the city does."
        content.sound = .default

        var date = DateComponents(); date.hour = 9; date.minute = 0
        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        let req = UNNotificationRequest(identifier: dailyId, content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(req)
    }

    // ── Daily 6am Hot Vault drop ────────────────────────────────────────────
    static func scheduleHotVaultDrop() async {
        let content = UNMutableNotificationContent()
        content.title = "5 new Hot Vaults are live"
        content.body = "First to walk wins 5× coins. Pick yours before the city does."
        content.sound = .default

        var date = DateComponents(); date.hour = 6; date.minute = 0
        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        let req = UNNotificationRequest(identifier: hotVaultId, content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(req)
    }

    // ── Nightly 10pm streak warning ─────────────────────────────────────────
    static func scheduleStreakWarning() async {
        let content = UNMutableNotificationContent()
        content.title = "Don't break your streak"
        content.body = "Two hours left to claim a vault and keep your run alive."
        content.sound = .default

        var date = DateComponents(); date.hour = 22; date.minute = 0
        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        let req = UNNotificationRequest(identifier: streakId, content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(req)
    }

    // ── 30min-ahead Power Hour heads-up ─────────────────────────────────────
    static func schedulePowerHourAlert(startsAt: Date, multiplier: Int) async {
        let fire = startsAt.addingTimeInterval(-30 * 60)
        let interval = fire.timeIntervalSinceNow
        guard interval > 60 else { return }

        let content = UNMutableNotificationContent()
        content.title = "Power Hour in 30 min · \(multiplier)×"
        content.body = "Drop everything — every vault pays \(multiplier)× for one hour."
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let req = UNNotificationRequest(identifier: powerId(startsAt), content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(req)
    }

    // ── Final Hour (1h before weekly ladder closes) ─────────────────────────
    static func scheduleFinalHourAlert(periodEndsAt: Date, label: String) async {
        let fire = periodEndsAt.addingTimeInterval(-60 * 60)
        let interval = fire.timeIntervalSinceNow
        guard interval > 60 else { return }

        let content = UNMutableNotificationContent()
        content.title = "Final Hour · \(label)"
        content.body = "Every coin counts double for the next 60 minutes. Climb."
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let req = UNNotificationRequest(identifier: finalId(periodEndsAt), content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(req)
    }

    // ── 1h before raffle closes ─────────────────────────────────────────────
    static func scheduleRaffleEndAlert(raffleId raffle: String, title: String, endsAt: Date) async {
        let fire = endsAt.addingTimeInterval(-60 * 60)
        let interval = fire.timeIntervalSinceNow
        guard interval > 60 else { return }

        let content = UNMutableNotificationContent()
        content.title = "Raffle closing in 1 hour"
        content.body = "\(title) — buy more entries before the draw locks."
        content.sound = .default
        content.userInfo = ["raffleId": raffle]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let req = UNNotificationRequest(identifier: raffleId(raffle), content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(req)
    }

    // ── Prediction market settle ────────────────────────────────────────────
    static func schedulePredictionSettleAlert(endsAt: Date) async {
        let interval = endsAt.timeIntervalSinceNow
        guard interval > 60 else { return }

        let content = UNMutableNotificationContent()
        content.title = "Stride Predict settles tonight"
        content.body = "If your pick takes the weekly crown, your share of the pot lands instantly."
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let req = UNNotificationRequest(identifier: predictId(endsAt), content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(req)
    }

    // ── Per-vault respawn ──────────────────────────────────────────────────
    static func scheduleVaultRespawn(vaultId: String, vaultName: String, at fireDate: Date) async {
        let interval = fireDate.timeIntervalSinceNow
        guard interval > 5 else { return }

        let content = UNMutableNotificationContent()
        content.title = "\(vaultName) respawned"
        content.body = "Walk back over and claim it again."
        content.sound = .default
        content.userInfo = ["vaultId": vaultId]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let req = UNNotificationRequest(identifier: respawnId(vaultId), content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(req)
    }

    /// Fires a notification in ~5s so users can verify permission + delivery.
    static func scheduleTestNotification() async {
        let content = UNMutableNotificationContent()
        content.title = "Notifications are on"
        content.body = "You'll get nudges for streaks, Power Hours, Hot Vaults and raffles."
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
        let req = UNNotificationRequest(identifier: "sq.test.\(Int(Date().timeIntervalSince1970))",
                                        content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(req)
    }

    static func cancelAll() {
        let c = UNUserNotificationCenter.current()
        c.removeAllPendingNotificationRequests()
        c.removeAllDeliveredNotifications()
    }

    static func cancelVaultRespawn(_ vaultId: String) {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [respawnId(vaultId)])
    }
}
