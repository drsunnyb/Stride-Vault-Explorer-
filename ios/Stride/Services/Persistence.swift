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
    /// v3 raffles-only era: true once any legacy brand-coin balance has been
    /// auto-converted into Stride Coins on first launch.
    var brandCoinsMigratedV3: Bool = false

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

    /// Friends the player has added (mirrors Expo `player.friends`).
    var friendsList: [PersistedFriend] = AppData.seedFriends
    /// Stake challenges (live + settled, most recent first).
    var stakeChallenges: [PersistedStakeChallenge] = []
    /// Coins locked inside open stake challenges (not spendable elsewhere).
    var lockedCoins: Int = 0

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

    /// Inbox notifications (most recent first). Seeded on first launch with
    /// a handful of realistic incoming friend requests + challenge invites
    /// so the UI has content before backend push wiring lands.
    var notifications: [InboxNotification] = InboxNotification.seedDefaults()

    var userCoordinate: CLLocationCoordinate2D {
        get { CLLocationCoordinate2D(latitude: userLat, longitude: userLng) }
        set { userLat = newValue.latitude; userLng = newValue.longitude }
    }
}

/// Codable friend record persisted on-device. Mirrors `expo/types/game.ts Friend`.
// MARK: - Inbox notifications

nonisolated enum InboxNotificationKind: String, Codable, Sendable, Hashable {
    case friendRequest = "friend-request"
    case friendJoined = "friend-joined"
    case challengeInvite = "challenge-invite"
    case challengeWon = "challenge-won"
    case challengeLost = "challenge-lost"
    case cityLive = "city-live"
    case system
}

nonisolated enum InboxResolution: String, Codable, Sendable, Hashable {
    case accepted, declined
}

nonisolated struct InboxNotification: Codable, Hashable, Sendable, Identifiable {
    var id: String
    var kind: InboxNotificationKind
    var createdAt: Date
    var read: Bool
    var actionable: Bool
    var title: String
    var body: String
    var fromName: String?
    var fromUsername: String?
    var avatarSeed: Int?
    var challengeId: String?
    var resolution: InboxResolution?

    static func seedDefaults() -> [InboxNotification] {
        let now = Date()
        return [
            .init(id: "n_req_nova", kind: .friendRequest,
                  createdAt: now.addingTimeInterval(-60 * 18), read: false, actionable: true,
                  title: "Nova Vance wants to be friends",
                  body: "Walked 14,210 steps this week · same tribe",
                  fromName: "Nova Vance", fromUsername: "novavance", avatarSeed: 1),
            .init(id: "n_req_atlas", kind: .friendRequest,
                  createdAt: now.addingTimeInterval(-60 * 60 * 6), read: false, actionable: true,
                  title: "Atlas Jin wants to be friends",
                  body: "Top 50 walker this month · invited by Kai",
                  fromName: "Atlas Jin", fromUsername: "atlas.j", avatarSeed: 11),
            .init(id: "n_chal_sable", kind: .challengeInvite,
                  createdAt: now.addingTimeInterval(-60 * 60 * 2), read: false, actionable: true,
                  title: "Sable invited you to a Step Showdown",
                  body: "500c stake · 7 days · winner takes the pot",
                  fromName: "Sable Wren", fromUsername: "sable", avatarSeed: 4,
                  challengeId: "c_seed_sable"),
            .init(id: "n_joined_juno", kind: .friendJoined,
                  createdAt: now.addingTimeInterval(-60 * 60 * 26), read: true, actionable: false,
                  title: "Juno Park joined via your link",
                  body: "+500 coins paid to you both",
                  fromName: "Juno Park", fromUsername: "junopark", avatarSeed: 6),
        ]
    }
}

nonisolated struct PersistedFriend: Codable, Hashable, Sendable, Identifiable {
    let id: String
    let username: String
    let displayName: String
    let avatarSeed: Int
    let addedAt: Date
}

nonisolated enum ChallengeMetric: String, Codable, Sendable, CaseIterable, Hashable {
    case steps, vaults, coins

    var label: String {
        switch self {
        case .steps: return "STEPS"
        case .vaults: return "VAULTS"
        case .coins: return "COINS"
        }
    }
}

nonisolated enum ChallengeParticipantState: String, Codable, Sendable, Hashable {
    case invited, joined, out
}

nonisolated struct PersistedChallengeParticipant: Codable, Hashable, Sendable, Identifiable {
    /// "you" for the local player, otherwise the friend id.
    let playerId: String
    let displayName: String
    let avatarSeed: Int
    var state: ChallengeParticipantState
    /// Metric value at challenge start.
    var baseline: Int
    /// Current metric value (live for you, simulated for friends).
    var current: Int

    var id: String { playerId }
    var delta: Int { max(0, current - baseline) }
}

nonisolated enum ChallengeStatus: String, Codable, Sendable, Hashable {
    case pending, live, settled, cancelled
}

nonisolated struct PersistedStakeChallenge: Codable, Hashable, Sendable, Identifiable {
    let id: String
    var title: String
    let createdBy: String
    let stake: Int
    let metric: ChallengeMetric
    let createdAt: Date
    let startsAt: Date
    let endsAt: Date
    let inviteExpiresAt: Date
    var status: ChallengeStatus
    var participants: [PersistedChallengeParticipant]
    var winnerId: String?
    var payout: Int?
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
