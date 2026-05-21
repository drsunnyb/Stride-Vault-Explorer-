import Foundation
import CoreLocation

/// Codable mirror of `VaultStore` mutable state. Persisted to UserDefaults so
/// progress survives relaunch — matches the Expo build's AsyncStorage blob.
nonisolated struct PersistedPlayer: Codable, Sendable {
    var version: Int = 1
    var claimedIDs: [String] = []
    /// Map of vaultId → most recent claim epoch ms (for respawn timers).
    var lastClaimAt: [String: Double] = [:]
    var coins: Int = 0
    var xp: Int = 0
    var level: Int = 1
    var streak: Int = 0
    var streakFreezes: Int = 1
    var lastClaimDayKey: String?
    var lastStepBonusDay: String?
    var stepsToday: Int = 0
    var stepsTodayDay: String?
    var stepsLifetime: Int = 0
    var stepsAtLastClaim: Int = 0
    var hotVaultClaims: [String: String] = [:]
    var comebackClaimsRemaining: Int = 0
    var lastActiveDay: String?
    var lastTribeWinWeek: String?
    /// Set to the current ISO week when the player was on the losing side of
    /// the previous derby. Grants a soft "Redemption" +10% multiplier and
    /// surfaces a banner in TribesView. Never zeroes the balance.
    var lastTribeLossWeek: String?

    var brandCoins: [String: Int] = ["nike": 0, "apple": 0, "lulu": 0]
    var brandExchangedTodayBy: [String: Int] = [:]
    var brandExchangedDay: String?

    var ownedRewards: [String] = []
    var redemptionHistory: [Redemption] = []
    var raffleEntries: [String: Int] = [:]
    var joinedChallenges: [String] = []
    var predictions: [PersistedPrediction] = []
    var predictionHistory: [PersistedPrediction] = []

    var handle: String = "@walker"
    var displayName: String = "You"
    var avatarSeed: Int = 7
    var tribeId: String?
    var hasCompletedOnboarding: Bool = false
    var paywallLastWeek: String?
    var seenSoftPaywall: Bool = false

    var sharesToday: Int = 0
    var sharesTodayDay: String?
    var lifetimeShares: Int = 0
    var shareCoinsEarned: Int = 0
    var referralSignups: Int = 0
    var hasUsedReferral: Bool = false

    var weeklyStakeJoined: Bool = false
    var weeklyStakeJoinedWeek: String?
    var notificationsEnabled: Bool = false

    var plus: PlusSubscription?

    // Stored as lat/lng since CLLocationCoordinate2D isn't Codable.
    var userLat: Double = 51.5085
    var userLng: Double = -0.1278

    /// Player's chosen home city — drives the global waitlist.
    var homeCityId: String?
    /// Per-city votes this player has minted from steps + shares + referrals.
    var cityVotes: [String: Int] = [:]
    /// Lifetime-steps total already credited toward city votes (anti-double-count).
    var cityVoteStepsCredited: Int = 0

    var userCoordinate: CLLocationCoordinate2D {
        get { CLLocationCoordinate2D(latitude: userLat, longitude: userLng) }
        set { userLat = newValue.latitude; userLng = newValue.longitude }
    }
}

nonisolated struct Redemption: Codable, Hashable, Sendable, Identifiable {
    let id: String
    let rewardId: String
    let redeemedAt: Date
    let code: String
    let paidWith: String       // "stride" or a brand id
    let paidAmount: Int
}

nonisolated struct PersistedPrediction: Codable, Hashable, Sendable, Identifiable {
    let id: String
    let pickPlayerId: String
    let pickName: String
    let stake: Int
    let placedAt: Date
    let marketId: String
    /// "pending" | "won" | "lost"
    var result: String
    var payout: Int?
}

/// Generates an 8-char redemption code (XXXX-XXXX).
nonisolated enum RedemptionCode {
    static func make() -> String {
        let chars = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        var out = ""
        for i in 0..<8 {
            out.append(chars.randomElement() ?? "X")
            if i == 3 { out.append("-") }
        }
        return out
    }
}

/// Versioned UserDefaults persistence with safe fallback on schema mismatch.
nonisolated enum PlayerPersistence {
    static let key = "stride.player.v1"

    static func load() -> PersistedPlayer {
        guard let data = UserDefaults.standard.data(forKey: key) else { return PersistedPlayer() }
        do {
            return try JSONDecoder().decode(PersistedPlayer.self, from: data)
        } catch {
            return PersistedPlayer()
        }
    }

    static func save(_ player: PersistedPlayer) {
        do {
            let data = try JSONEncoder().encode(player)
            UserDefaults.standard.set(data, forKey: key)
        } catch {
            // Silently ignore — persistence is best-effort.
        }
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: key)
    }
}
