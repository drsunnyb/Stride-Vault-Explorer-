import SwiftUI

/// Stride cinematic theme — midnight navy + jewel-tone accents.
enum Theme {
    static let bg = Color(red: 0.024, green: 0.027, blue: 0.051)
    static let bgElev = Color(red: 0.047, green: 0.059, blue: 0.102)
    static let card = Color(red: 0.075, green: 0.094, blue: 0.149)
    static let surface = Color(red: 0.106, green: 0.133, blue: 0.200)
    static let border = Color(red: 0.141, green: 0.188, blue: 0.286)

    static let text = Color(red: 0.960, green: 0.968, blue: 0.984)
    static let textMuted = Color(red: 0.604, green: 0.639, blue: 0.722)
    static let textDim = Color(red: 0.353, green: 0.388, blue: 0.470)

    static let gold = Color(red: 0.831, green: 0.686, blue: 0.216)
    static let goldBright = Color(red: 0.957, green: 0.816, blue: 0.247)
    static let emerald = Color(red: 0.063, green: 0.725, blue: 0.506)
    static let ruby = Color(red: 0.937, green: 0.267, blue: 0.267)
    static let sapphire = Color(red: 0.231, green: 0.510, blue: 0.965)
}

enum Tier: String, CaseIterable, Codable, Sendable {
    case bronze, silver, gold, platinum

    var label: String { rawValue.capitalized }

    var color: Color {
        switch self {
        case .bronze: Color(red: 0.804, green: 0.498, blue: 0.196)
        case .silver: Color(red: 0.788, green: 0.812, blue: 0.859)
        case .gold: Color(red: 0.831, green: 0.686, blue: 0.216)
        case .platinum: Color(red: 0.490, green: 0.827, blue: 0.988)
        }
    }

    var glow: Color {
        switch self {
        case .bronze: Color(red: 0.902, green: 0.620, blue: 0.353)
        case .silver: Color(red: 0.910, green: 0.929, blue: 0.961)
        case .gold: Color(red: 0.957, green: 0.816, blue: 0.247)
        case .platinum: Color(red: 0.729, green: 0.902, blue: 0.992)
        }
    }

    var gradient: [Color] {
        [color.opacity(0.95), glow]
    }

    /// Random reward range per tier — v3 (raffles-only era): cut ~25% so weekly
    /// coin supply lines up with a £500–£1,500 raffle outlay.
    var rewardRange: ClosedRange<Int> {
        switch self {
        case .bronze: 26...45
        case .silver: 60...105
        case .gold: 135...195
        case .platinum: 270...390
        }
    }

    var xpRange: ClosedRange<Int> {
        switch self {
        case .bronze: 25...40
        case .silver: 55...80
        case .gold: 120...180
        case .platinum: 240...320
        }
    }
}
