import Foundation

nonisolated struct Reward: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let blurb: String
    let cost: Int
    let brandId: String?
    let emoji: String
    let category: Category
    let stock: Int?

    enum Category: String, CaseIterable, Sendable {
        case shoes = "Shoes"
        case apparel = "Apparel"
        case food = "Food & Drink"
        case tech = "Tech"
        case experience = "Experiences"
        case gift = "Gift Cards"
    }
}

nonisolated struct Raffle: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let prize: String
    let prizeValueGbp: Int
    let emoji: String
    let entryCost: Int
    let maxEntriesPerUser: Int
    let endsAt: Date
    let winners: Int
    let totalEntries: Int
    let brandId: String?
    let plusOnly: Bool
}

nonisolated struct Challenge: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let blurb: String
    let stake: Int
    let reward: Int
    let participants: Int
    let endsAt: Date
    let emoji: String
}

nonisolated struct Prediction: Identifiable, Hashable, Sendable {
    let id: String
    let pickPlayerId: String
    let pickName: String
    let stake: Int
    let placedAt: Date
    let result: Result

    enum Result: String, Sendable { case pending, won, lost }
}
