import Foundation

nonisolated struct Player: Identifiable, Hashable, Sendable {
    let id: String
    let handle: String
    let name: String
    let avatarSeed: Int
    let coins: Int
    let streak: Int
    let tribe: String
}

nonisolated enum TribeCategory: String, Codable, CaseIterable, Hashable, Sendable {
    case football, runCrew, wellness, workplace, borough, university

    var title: String {
        switch self {
        case .football:   return "FOOTBALL"
        case .runCrew:    return "RUN CREWS"
        case .wellness:   return "WELLNESS"
        case .workplace:  return "WORKPLACE"
        case .borough:    return "BOROUGHS"
        case .university: return "UNIVERSITIES"
        }
    }

    var caption: String {
        switch self {
        case .football:   return "Back your club. Win for the badge."
        case .runCrew:    return "Stack miles with the crew. Win Nike drops."
        case .wellness:   return "Move soft, win Lulu."
        case .workplace:  return "Crew up with your office. Apple credit on the line."
        case .borough:    return "Rep your postcode. Win local perks."
        case .university: return "Reppin' the campus."
        }
    }
}

/// What each tribe pays out to every member when they top the weekly board.
nonisolated struct TribeWinReward: Codable, Hashable, Sendable {
    /// Base Stride coin payout.
    let coins: Int
    /// Optional brand-coin grant (e.g. nike/apple/lulu).
    let brandId: String?
    let brandCoins: Int
    /// Extra perk granted alongside the coins (free streak freeze, raffle ticket, …).
    let perk: TribePerk?
    /// Short headline shown on the claim card.
    let headline: String

    static let football   = TribeWinReward(coins: 200, brandId: nil,     brandCoins: 0,  perk: nil,                  headline: "200 coins for backing the winning club")
    static let runCrew    = TribeWinReward(coins: 150, brandId: "nike",  brandCoins: 50, perk: .raffleTicket,        headline: "150 coins + 50 Nike coins + a free Vaporfly raffle ticket")
    static let wellness   = TribeWinReward(coins: 150, brandId: "lulu",  brandCoins: 40, perk: .streakFreeze,        headline: "150 coins + 40 Lulu coins + 1 streak freeze")
    static let workplace  = TribeWinReward(coins: 150, brandId: "apple", brandCoins: 30, perk: nil,                  headline: "150 coins + 30 Apple credit for the office crew")
    static let borough    = TribeWinReward(coins: 250, brandId: nil,     brandCoins: 0,  perk: .localCafeVoucher,    headline: "250 coins + a free Pret coffee on the postcode")
    static let university = TribeWinReward(coins: 175, brandId: nil,     brandCoins: 0,  perk: .mysteryBox,          headline: "175 coins + a mystery box for the campus")
}

nonisolated enum TribePerk: String, Codable, Hashable, Sendable {
    case streakFreeze     = "streak-freeze"
    case raffleTicket     = "free-raffle-ticket"
    case localCafeVoucher = "local-cafe"
    case mysteryBox       = "mystery-box"

    var label: String {
        switch self {
        case .streakFreeze:     return "+1 Streak Freeze"
        case .raffleTicket:     return "+1 Free Raffle Ticket"
        case .localCafeVoucher: return "+1 Pret Voucher"
        case .mysteryBox:       return "Mystery Box"
        }
    }
}

nonisolated struct Tribe: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let short: String
    let area: String
    let tagline: String
    let memberCount: Int
    let emoji: String
    let hex: String
    /// Group on the picker / leaderboard.
    let category: TribeCategory
    /// City scope. If nil, the tribe is "shared" — visible everywhere
    /// (e.g. Parkrun Posse, Marathon Build, Yoga Riders, NHS Walkers).
    let cityId: String?
    /// What every member of this tribe wins when they top the derby.
    let winReward: TribeWinReward

    init(id: String, name: String, short: String, area: String, tagline: String,
         memberCount: Int, emoji: String, hex: String,
         category: TribeCategory = .football,
         cityId: String? = nil,
         winReward: TribeWinReward = .football) {
        self.id = id; self.name = name; self.short = short; self.area = area
        self.tagline = tagline; self.memberCount = memberCount
        self.emoji = emoji; self.hex = hex
        self.category = category
        self.cityId = cityId
        self.winReward = winReward
    }
}

nonisolated struct Friend: Identifiable, Hashable, Sendable {
    let id: String
    let handle: String
    let name: String
    let avatarSeed: Int
    let coinsThisWeek: Int
    let isOnline: Bool
    let lastSeen: String
}

enum LeaderboardScope: String, CaseIterable, Sendable {
    case global = "Global"
    case friends = "Friends"
}

enum LeaderboardPeriod: String, CaseIterable, Sendable {
    case week = "Week"
    case month = "Month"
    case year = "Year"

    var resetsIn: String {
        switch self {
        case .week: "Resets in 2d 14h"
        case .month: "Resets in 11d"
        case .year: "Resets in 84d"
        }
    }
}
