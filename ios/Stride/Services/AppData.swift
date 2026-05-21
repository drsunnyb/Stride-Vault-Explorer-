import Foundation

/// Static demo data so the leaderboard / friends / profile / tribes / rewards / events screens feel alive.
enum AppData {
    static let tribes: [Tribe] = [
        // ── London football ────────────────────────────────────────────
        .init(id: "arsenal", name: "Arsenal FC", short: "ARS", area: "North London",
              tagline: "Walk loud. Earn proud.", memberCount: 28_421, emoji: "🔴",
              hex: "#EF0107", category: .football, cityId: "london", winReward: .football),
        .init(id: "chelsea", name: "Chelsea FC", short: "CHE", area: "West London",
              tagline: "Blue is the colour. Coins are the currency.", memberCount: 22_904, emoji: "🔵",
              hex: "#034694", category: .football, cityId: "london", winReward: .football),
        .init(id: "spurs", name: "Tottenham", short: "TOT", area: "North London",
              tagline: "To dare is to walk.", memberCount: 18_211, emoji: "⚪️",
              hex: "#132257", category: .football, cityId: "london", winReward: .football),
        .init(id: "westham", name: "West Ham", short: "WHU", area: "East London",
              tagline: "Hammers stride forever.", memberCount: 12_088, emoji: "🟣",
              hex: "#7A263A", category: .football, cityId: "london", winReward: .football),
        .init(id: "fulham", name: "Fulham FC", short: "FUL", area: "West London",
              tagline: "Cottagers on the move.", memberCount: 8_344, emoji: "⚫️",
              hex: "#000000", category: .football, cityId: "london", winReward: .football),
        .init(id: "palace", name: "Crystal Palace", short: "CPL", area: "South London",
              tagline: "Eagles soar — coins pour.", memberCount: 9_550, emoji: "🦅",
              hex: "#1B458F", category: .football, cityId: "london", winReward: .football),

        // ── Manchester football ────────────────────────────────────────
        .init(id: "manutd", name: "Manchester United", short: "MUN", area: "Old Trafford",
              tagline: "Red Devils on the march.", memberCount: 31_204, emoji: "🔺",
              hex: "#DA291C", category: .football, cityId: "manchester", winReward: .football),
        .init(id: "mancity", name: "Manchester City", short: "MCI", area: "Etihad",
              tagline: "Citizens stride sky-blue.", memberCount: 24_882, emoji: "🟦",
              hex: "#6CABDD", category: .football, cityId: "manchester", winReward: .football),
        .init(id: "liverpool", name: "Liverpool", short: "LIV", area: "Anfield",
              tagline: "You'll never walk alone.", memberCount: 22_111, emoji: "🔴",
              hex: "#C8102E", category: .football, cityId: "manchester", winReward: .football),

        // ── New York football (soccer) ─────────────────────────────────
        .init(id: "nycfc", name: "New York City FC", short: "NYC", area: "Yankee Stadium",
              tagline: "Five boroughs, one club.", memberCount: 8_021, emoji: "🟦",
              hex: "#6CADDF", category: .football, cityId: "new-york", winReward: .football),
        .init(id: "nyredbulls", name: "NY Red Bulls", short: "NYRB", area: "Red Bull Arena",
              tagline: "Charge across the Hudson.", memberCount: 5_412, emoji: "🔴",
              hex: "#E32227", category: .football, cityId: "new-york", winReward: .football),

        // ── Paris football ─────────────────────────────────────────────
        .init(id: "psg", name: "Paris Saint-Germain", short: "PSG", area: "Parc des Princes",
              tagline: "Ici c'est Paris.", memberCount: 14_220, emoji: "🔵",
              hex: "#004170", category: .football, cityId: "paris", winReward: .football),

        // ── Run Crews → Nike-skewed (mostly shared) ────────────────────
        .init(id: "parkrun", name: "Parkrun Posse", short: "PRK", area: "Anywhere",
              tagline: "Saturday 9am tribe.", memberCount: 14_220, emoji: "🏃",
              hex: "#FA5400", category: .runCrew, winReward: .runCrew),
        .init(id: "londonmarathon", name: "Marathon Build", short: "M26", area: "Anywhere",
              tagline: "26.2 starts with a step.", memberCount: 11_055, emoji: "🏅",
              hex: "#E32636", category: .runCrew, winReward: .runCrew),
        .init(id: "trackmafia", name: "Track Mafia", short: "TKM", area: "Mile End",
              tagline: "Track til the lights go out.", memberCount: 7_902, emoji: "⚡️",
              hex: "#FF7A2C", category: .runCrew, cityId: "london", winReward: .runCrew),
        .init(id: "mcrtrack", name: "MCR Track Club", short: "MCR", area: "Sportcity",
              tagline: "Nor'wester laps.", memberCount: 3_512, emoji: "⚡️",
              hex: "#FF7A2C", category: .runCrew, cityId: "manchester", winReward: .runCrew),
        .init(id: "nyrr", name: "New York Road Runners", short: "NYRR", area: "Central Park",
              tagline: "Five-borough miles.", memberCount: 9_440, emoji: "🏞️",
              hex: "#FF7A2C", category: .runCrew, cityId: "new-york", winReward: .runCrew),

        // ── Wellness → Lulu-skewed (shared) ────────────────────────────
        .init(id: "yogariders", name: "Yoga Riders", short: "YGA", area: "Anywhere",
              tagline: "Breathe in. Walk on.", memberCount: 6_811, emoji: "🧘",
              hex: "#D62828", category: .wellness, winReward: .wellness),
        .init(id: "pilatesclub", name: "Pilates Club", short: "PIL", area: "Anywhere",
              tagline: "Core walkers unite.", memberCount: 4_298, emoji: "🌿",
              hex: "#FF4D4D", category: .wellness, winReward: .wellness),

        // ── Workplace → Apple credit ───────────────────────────────────
        .init(id: "techcrew", name: "Tech Crew", short: "TECH", area: "Shoreditch / King's X",
              tagline: "From standup to step count.", memberCount: 9_140, emoji: "💻",
              hex: "#C9CFDB", category: .workplace, cityId: "london", winReward: .workplace),
        .init(id: "citymile", name: "The City Mile", short: "CITY", area: "Bank / Canary Wharf",
              tagline: "Suits with sneakers.", memberCount: 7_822, emoji: "📈",
              hex: "#1F4E79", category: .workplace, cityId: "london", winReward: .workplace),
        .init(id: "nhscrew", name: "NHS Walkers", short: "NHS", area: "All UK",
              tagline: "Long shifts, longer streaks.", memberCount: 12_488, emoji: "💙",
              hex: "#005EB8", category: .workplace, winReward: .workplace),
        .init(id: "wallst", name: "Wall St Walkers", short: "WST", area: "Financial District",
              tagline: "Charge between the bells.", memberCount: 6_440, emoji: "📈",
              hex: "#1F4E79", category: .workplace, cityId: "new-york", winReward: .workplace),
        .init(id: "mediacity", name: "MediaCity Crew", short: "MCU", area: "Salford Quays",
              tagline: "Studio to street.", memberCount: 4_120, emoji: "📺",
              hex: "#C9CFDB", category: .workplace, cityId: "manchester", winReward: .workplace),

        // ── Boroughs → local cafe perks ────────────────────────────────
        // London
        .init(id: "hackney", name: "Hackney", short: "E8", area: "East London",
              tagline: "London Fields locals.", memberCount: 5_402, emoji: "🟢",
              hex: "#22C55E", category: .borough, cityId: "london", winReward: .borough),
        .init(id: "camden", name: "Camden", short: "NW1", area: "North London",
              tagline: "Lock to lock.", memberCount: 5_018, emoji: "🟠",
              hex: "#F97316", category: .borough, cityId: "london", winReward: .borough),
        .init(id: "brixton", name: "Brixton", short: "SW9", area: "South London",
              tagline: "Loud, loyal, on foot.", memberCount: 4_703, emoji: "🟡",
              hex: "#EAB308", category: .borough, cityId: "london", winReward: .borough),
        .init(id: "shoreditch", name: "Shoreditch", short: "EC2", area: "East London",
              tagline: "Espresso between vaults.", memberCount: 6_211, emoji: "⚫️",
              hex: "#0F172A", category: .borough, cityId: "london", winReward: .borough),
        // Manchester
        .init(id: "northern-quarter", name: "Northern Quarter", short: "NQ", area: "Manchester",
              tagline: "Coffee, vinyl, vaults.", memberCount: 3_812, emoji: "🎨",
              hex: "#F97316", category: .borough, cityId: "manchester", winReward: .borough),
        .init(id: "ancoats", name: "Ancoats", short: "ANC", area: "Manchester",
              tagline: "Brick to bistro.", memberCount: 2_905, emoji: "☕️",
              hex: "#22C55E", category: .borough, cityId: "manchester", winReward: .borough),
        .init(id: "didsbury", name: "Didsbury", short: "DID", area: "South Manchester",
              tagline: "Suburban strollers.", memberCount: 2_211, emoji: "🌳",
              hex: "#EAB308", category: .borough, cityId: "manchester", winReward: .borough),
        .init(id: "salford", name: "Salford", short: "SAL", area: "Greater Manchester",
              tagline: "Quays-side miles.", memberCount: 3_120, emoji: "🟣",
              hex: "#7C3AED", category: .borough, cityId: "manchester", winReward: .borough),
        // New York
        .init(id: "manhattan", name: "Manhattan", short: "MAN", area: "NYC",
              tagline: "Avenue grind.", memberCount: 9_330, emoji: "🏙️",
              hex: "#0F172A", category: .borough, cityId: "new-york", winReward: .borough),
        .init(id: "brooklyn", name: "Brooklyn", short: "BK", area: "NYC",
              tagline: "Bridge to Brighton.", memberCount: 8_120, emoji: "🌉",
              hex: "#22C55E", category: .borough, cityId: "new-york", winReward: .borough),
        .init(id: "queens", name: "Queens", short: "QNS", area: "NYC",
              tagline: "Globe in one borough.", memberCount: 6_011, emoji: "🟠",
              hex: "#F97316", category: .borough, cityId: "new-york", winReward: .borough),
        .init(id: "the-bronx", name: "The Bronx", short: "BX", area: "NYC",
              tagline: "Boogie down.", memberCount: 4_220, emoji: "🟡",
              hex: "#EAB308", category: .borough, cityId: "new-york", winReward: .borough),
        // Paris
        .init(id: "le-marais", name: "Le Marais", short: "MRS", area: "Paris",
              tagline: "Pavé perfection.", memberCount: 3_410, emoji: "🥖",
              hex: "#EF4444", category: .borough, cityId: "paris", winReward: .borough),
        .init(id: "montmartre", name: "Montmartre", short: "MMT", area: "Paris",
              tagline: "Climb to the basilica.", memberCount: 2_890, emoji: "🎨",
              hex: "#F97316", category: .borough, cityId: "paris", winReward: .borough),
        // Tokyo
        .init(id: "shibuya", name: "Shibuya", short: "SHB", area: "Tokyo",
              tagline: "Scramble squad.", memberCount: 5_220, emoji: "🟥",
              hex: "#EF4444", category: .borough, cityId: "tokyo", winReward: .borough),
        .init(id: "shinjuku", name: "Shinjuku", short: "SHJ", area: "Tokyo",
              tagline: "Neon midnight miles.", memberCount: 4_110, emoji: "🌆",
              hex: "#7C3AED", category: .borough, cityId: "tokyo", winReward: .borough),

        // ── Universities → mystery boxes ───────────────────────────────
        // London
        .init(id: "ucl", name: "UCL", short: "UCL", area: "Bloomsbury",
              tagline: "Disraeli to Dishoom.", memberCount: 3_290, emoji: "🟣",
              hex: "#500778", category: .university, cityId: "london", winReward: .university),
        .init(id: "kcl", name: "King's College", short: "KCL", area: "Strand",
              tagline: "Strand strollers.", memberCount: 2_980, emoji: "🔴",
              hex: "#E2231A", category: .university, cityId: "london", winReward: .university),
        .init(id: "imperial", name: "Imperial", short: "ICL", area: "South Ken",
              tagline: "Lab coats & laces.", memberCount: 2_701, emoji: "🔵",
              hex: "#003E74", category: .university, cityId: "london", winReward: .university),
        .init(id: "lse", name: "LSE", short: "LSE", area: "Holborn",
              tagline: "Walkers of the world unite.", memberCount: 2_204, emoji: "⚫️",
              hex: "#7C2855", category: .university, cityId: "london", winReward: .university),
        // Manchester
        .init(id: "uom", name: "Univ of Manchester", short: "UoM", area: "Oxford Rd",
              tagline: "Curry mile to campus.", memberCount: 4_120, emoji: "🟣",
              hex: "#660066", category: .university, cityId: "manchester", winReward: .university),
        .init(id: "mmu", name: "Manchester Met", short: "MMU", area: "All Saints",
              tagline: "Met steps stack.", memberCount: 3_290, emoji: "🟡",
              hex: "#FFCC00", category: .university, cityId: "manchester", winReward: .university),
        // New York
        .init(id: "nyu", name: "NYU", short: "NYU", area: "Greenwich Village",
              tagline: "Washington Square laps.", memberCount: 4_980, emoji: "🟣",
              hex: "#57068C", category: .university, cityId: "new-york", winReward: .university),
        .init(id: "columbia", name: "Columbia", short: "CU", area: "Morningside Heights",
              tagline: "Up the heights.", memberCount: 4_120, emoji: "🔵",
              hex: "#75B2DD", category: .university, cityId: "new-york", winReward: .university),
        // Paris
        .init(id: "sorbonne", name: "Sorbonne", short: "SBN", area: "Latin Quarter",
              tagline: "Quartier latin laps.", memberCount: 2_620, emoji: "⚫️",
              hex: "#7C2855", category: .university, cityId: "paris", winReward: .university)
    ]

    static var tribesByCategory: [(TribeCategory, [Tribe])] {
        TribeCategory.allCases.map { cat in (cat, tribes.filter { $0.category == cat }) }
    }

    static func tribe(_ id: String?) -> Tribe? {
        guard let id else { return nil }
        return tribes.first(where: { $0.id == id })
    }

    /// Tribes visible to a player in `cityId`. Returns shared tribes plus any
    /// scoped to that city. Falls back to London if nil so brand-new users
    /// always see a populated picker.
    static func tribes(forCity cityId: String?) -> [Tribe] {
        let effective = cityId ?? "london"
        return tribes.filter { $0.cityId == nil || $0.cityId == effective }
    }

    static func tribesByCategory(forCity cityId: String?) -> [(TribeCategory, [Tribe])] {
        let list = tribes(forCity: cityId)
        return TribeCategory.allCases.map { cat in (cat, list.filter { $0.category == cat }) }
            .filter { !$0.1.isEmpty }
    }

    /// Global Stride ladder.
    static let globalLadder: [Player] = [
        .init(id: "p1", handle: "@kai.mercer", name: "Kai Mercer", avatarSeed: 11, coins: 48_210, streak: 41, tribe: "Marathoners"),
        .init(id: "p2", handle: "@sable", name: "Sable Quinn", avatarSeed: 4, coins: 44_120, streak: 27, tribe: "Night Owls"),
        .init(id: "p3", handle: "@junopark", name: "Juno Park", avatarSeed: 7, coins: 41_005, streak: 33, tribe: "Sunrise Club"),
        .init(id: "p4", handle: "@rune", name: "Rune Aalto", avatarSeed: 2, coins: 38_440, streak: 19, tribe: "Trailblazers"),
        .init(id: "p5", handle: "@novavance", name: "Nova Vance", avatarSeed: 9, coins: 35_220, streak: 22, tribe: "Boroughs"),
        .init(id: "p6", handle: "@odettel", name: "Odette L.", avatarSeed: 1, coins: 31_900, streak: 14, tribe: "Sunrise Club"),
        .init(id: "p7", handle: "@calder", name: "Calder Reeve", avatarSeed: 5, coins: 28_310, streak: 11, tribe: "Marathoners"),
        .init(id: "p8", handle: "@miraly", name: "Mira Lyn", avatarSeed: 8, coins: 25_770, streak: 9, tribe: "Night Owls"),
        .init(id: "p9", handle: "@theo.h", name: "Theo Hale", avatarSeed: 3, coins: 22_640, streak: 17, tribe: "Trailblazers"),
        .init(id: "p10", handle: "@ines", name: "Inès Roux", avatarSeed: 6, coins: 19_802, streak: 6, tribe: "Boroughs"),
        .init(id: "p11", handle: "@lior", name: "Lior Adams", avatarSeed: 10, coins: 18_404, streak: 8, tribe: "Boroughs"),
        .init(id: "p12", handle: "@zara.k", name: "Zara Kapoor", avatarSeed: 12, coins: 17_222, streak: 12, tribe: "Sunrise Club"),
        .init(id: "p13", handle: "@anika", name: "Anika Patel", avatarSeed: 13, coins: 15_988, streak: 5, tribe: "Marathoners"),
        .init(id: "p14", handle: "@solomon", name: "Solomon Bach", avatarSeed: 14, coins: 14_550, streak: 21, tribe: "Trailblazers"),
        .init(id: "p15", handle: "@yuki.t", name: "Yuki Tanaka", avatarSeed: 15, coins: 13_220, streak: 4, tribe: "Night Owls")
    ]

    /// Brand-specific ladders — different rankings per brand based on who walks Nike vs Apple etc.
    static func ladder(forBrand brandId: String?, period: LeaderboardPeriod) -> [Player] {
        guard let brandId else { return shiftedLadder(globalLadder, period: period) }
        // Per-brand: shuffle by seeded permutation of the global ladder so each brand has different leaders.
        let seed = brandId.hashValue ^ period.rawValue.hashValue
        var rng = SeededRandom(seed: seed)
        var pool = globalLadder
        // Fisher-Yates style for first 8 ranks
        for i in 0..<min(pool.count, 8) {
            let j = i + Int(rng.next() % UInt64(pool.count - i))
            pool.swapAt(i, j)
        }
        // Decay coins to feel brand-specific
        return pool.enumerated().map { idx, p in
            let factor = 0.45 + (1.0 - Double(idx) / Double(pool.count)) * 0.6
            let shifted = Int(Double(p.coins) * factor)
            return Player(id: p.id, handle: p.handle, name: p.name, avatarSeed: p.avatarSeed,
                          coins: shifted, streak: p.streak, tribe: p.tribe)
        }
    }

    /// Period-shift the global ladder for week/month/year scope so totals shift dynamically.
    private static func shiftedLadder(_ players: [Player], period: LeaderboardPeriod) -> [Player] {
        let scale: Double = {
            switch period {
            case .week: return 0.25
            case .month: return 0.7
            case .year: return 1.0
            }
        }()
        let seed = period.rawValue.hashValue
        var rng = SeededRandom(seed: seed)
        // Shuffle top 5 a little so weekly winners differ from monthly/annual
        var pool = players.enumerated().map { idx, p in
            Player(id: p.id, handle: p.handle, name: p.name, avatarSeed: p.avatarSeed,
                   coins: Int(Double(p.coins) * scale * (0.85 + Double(rng.next() % 30) / 100.0)),
                   streak: p.streak, tribe: p.tribe)
        }
        if period == .week {
            pool.shuffle(using: &rng)
        }
        return pool.sorted { $0.coins > $1.coins }
    }

    static let friends: [Friend] = [
        .init(id: "f1", handle: "@sable", name: "Sable Quinn", avatarSeed: 4, coinsThisWeek: 8_420, isOnline: true, lastSeen: "Active now"),
        .init(id: "f2", handle: "@rune", name: "Rune Aalto", avatarSeed: 2, coinsThisWeek: 6_110, isOnline: true, lastSeen: "Active now"),
        .init(id: "f3", handle: "@junopark", name: "Juno Park", avatarSeed: 7, coinsThisWeek: 5_805, isOnline: false, lastSeen: "12m ago"),
        .init(id: "f4", handle: "@miraly", name: "Mira Lyn", avatarSeed: 8, coinsThisWeek: 4_290, isOnline: false, lastSeen: "2h ago"),
        .init(id: "f5", handle: "@calder", name: "Calder Reeve", avatarSeed: 5, coinsThisWeek: 3_410, isOnline: true, lastSeen: "Active now"),
        .init(id: "f6", handle: "@ines", name: "Inès Roux", avatarSeed: 6, coinsThisWeek: 2_055, isOnline: false, lastSeen: "yesterday")
    ]

    static let brands: [Brand] = [
        .init(id: "nike", name: "Nike", coinName: "Nike Coins", short: "NIKE",
              tagline: "Earn at Nike vaults. Redeem at Nike stores.",
              mark: "✓", hex: "#FA5400", brightHex: "#FF7A2C", invertedText: false),
        .init(id: "apple", name: "Apple", coinName: "Apple Credit", short: "APPLE",
              tagline: "Earn at Apple vaults. Spend at Apple Store.",
              mark: "", hex: "#C9CFDB", brightHex: "#F2F4F8", invertedText: true),
        .init(id: "lulu", name: "Lululemon", coinName: "Lulu Coins", short: "LULU",
              tagline: "Move better. Earn premium.",
              mark: "ω", hex: "#D62828", brightHex: "#FF4D4D", invertedText: false)
    ]

    static func brand(_ id: String?) -> Brand? {
        guard let id else { return nil }
        return brands.first { $0.id == id }
    }

    static let rewards: [Reward] = [
        .init(id: "r1", title: "£10 Nike Voucher", blurb: "Use on nike.com or any Nike store.",
              cost: 1500, brandId: "nike", emoji: "👟", category: .shoes, stock: 42),
        .init(id: "r2", title: "Nike Pegasus 41", blurb: "Pick your size — ships in 3 days.",
              cost: 14000, brandId: "nike", emoji: "🏃", category: .shoes, stock: 8),
        .init(id: "r3", title: "AirPods 4", blurb: "USB-C. Active Noise Cancellation.",
              cost: 18000, brandId: "apple", emoji: "🎧", category: .tech, stock: 5),
        .init(id: "r4", title: "£5 Apple Store Credit", blurb: "Drops into your Apple ID.",
              cost: 750, brandId: "apple", emoji: "🍎", category: .tech, stock: nil),
        .init(id: "r5", title: "Lululemon Align Tank", blurb: "Buttery soft. Earned harder.",
              cost: 8500, brandId: "lulu", emoji: "🧘", category: .apparel, stock: 14),
        .init(id: "r11", title: "Lululemon Belt Bag", blurb: "The cult belt bag, on us.",
              cost: 5500, brandId: "lulu", emoji: "👜", category: .apparel, stock: 22),
        .init(id: "r12", title: "Nike Dri-FIT Tee", blurb: "Pick colour, pick size.",
              cost: 2200, brandId: "nike", emoji: "👕", category: .apparel, stock: 60),
        .init(id: "r13", title: "Apple Watch Band", blurb: "Sport Loop, any colour.",
              cost: 2800, brandId: "apple", emoji: "⌚️", category: .tech, stock: 30),
        .init(id: "r6", title: "Pret Coffee", blurb: "Any size, any blend.",
              cost: 220, brandId: nil, emoji: "☕️", category: .food, stock: nil),
        .init(id: "r7", title: "Pret Sandwich", blurb: "Includes the avocado one.",
              cost: 580, brandId: nil, emoji: "🥪", category: .food, stock: nil),
        .init(id: "r8", title: "Cinema Ticket", blurb: "Vue or Odeon, any screening.",
              cost: 1100, brandId: nil, emoji: "🎬", category: .experience, stock: 60),
        .init(id: "r9", title: "Climbing Day Pass", blurb: "VauxWall, BlocFit & Substation.",
              cost: 1400, brandId: nil, emoji: "🧗", category: .experience, stock: 25),
        .init(id: "r10", title: "Amazon £10", blurb: "Standard digital giftcard.",
              cost: 1600, brandId: nil, emoji: "🎁", category: .gift, stock: nil)
    ]

    static let raffles: [Raffle] = [
        .init(id: "iphone-17", title: "Stride+ Exclusive · iPhone 17 Pro",
              prize: "iPhone 17 Pro (256GB)", prizeValueGbp: 1199, emoji: "📱",
              entryCost: 300, maxEntriesPerUser: 30, endsAt: Date().addingTimeInterval(10*86400),
              winners: 1, totalEntries: 612, brandId: nil, plusOnly: true),
        .init(id: "macbook", title: "MacBook Air M4 Giveaway",
              prize: "MacBook Air M4 (13\", 512GB)", prizeValueGbp: 1199, emoji: "💻",
              entryCost: 250, maxEntriesPerUser: 50, endsAt: Date().addingTimeInterval(7*86400),
              winners: 1, totalEntries: 4318, brandId: "apple", plusOnly: false),
        .init(id: "vaporfly", title: "Nike Vaporfly 3 Drop",
              prize: "Nike Vaporfly 3 (pick your size)", prizeValueGbp: 270, emoji: "👟",
              entryCost: 150, maxEntriesPerUser: 30, endsAt: Date().addingTimeInterval(3*86400),
              winners: 3, totalEntries: 2107, brandId: "nike", plusOnly: false),
        .init(id: "airpods", title: "AirPods Pro 2",
              prize: "AirPods Pro 2 (USB-C)", prizeValueGbp: 229, emoji: "🎧",
              entryCost: 120, maxEntriesPerUser: 25, endsAt: Date().addingTimeInterval(5*86400),
              winners: 2, totalEntries: 1854, brandId: "apple", plusOnly: false)
    ]

    static let challenges: [Challenge] = [
        .init(id: "c1", title: "8k by 8pm", blurb: "Hit 8,000 steps by tonight, double up.",
              stake: 200, reward: 400, participants: 1224,
              endsAt: Date().addingTimeInterval(6*3600), emoji: "⚡️"),
        .init(id: "c2", title: "Weekend Warrior", blurb: "30k steps across Sat + Sun.",
              stake: 500, reward: 1500, participants: 612,
              endsAt: Date().addingTimeInterval(2*86400), emoji: "💪"),
        .init(id: "c3", title: "Morning Streak", blurb: "5k before 9am — 5 days running.",
              stake: 300, reward: 900, participants: 488,
              endsAt: Date().addingTimeInterval(5*86400), emoji: "🌅"),
        .init(id: "c4", title: "Vault Hunter", blurb: "Claim 3 vaults in one day.",
              stake: 250, reward: 750, participants: 901,
              endsAt: Date().addingTimeInterval(24*3600), emoji: "🗝️")
    ]

    /// Live now / starting soon events — fuels the home strip & rewards screen.
    static let liveEvents: [LiveEvent] = [
        .init(id: "e1", kind: .powerHour, title: "Power Hour", subtitle: "2× coins on every vault",
              startsAt: Date().addingTimeInterval(-15*60), endsAt: Date().addingTimeInterval(45*60),
              brandId: nil, emoji: "⚡️"),
        .init(id: "e2", kind: .hotVault, title: "Hot Vault: NikeTown", subtitle: "Triple Nike Coins · 1 hour",
              startsAt: Date().addingTimeInterval(-5*60), endsAt: Date().addingTimeInterval(55*60),
              brandId: "nike", emoji: "🔥"),
        .init(id: "e3", kind: .raffleEnding, title: "Vaporfly Raffle", subtitle: "Ends in 3 days",
              startsAt: Date().addingTimeInterval(-86400), endsAt: Date().addingTimeInterval(3*86400),
              brandId: "nike", emoji: "👟"),
        .init(id: "e4", kind: .brandDrop, title: "Apple Drop", subtitle: "New vault unlocked at Regent St",
              startsAt: Date(), endsAt: Date().addingTimeInterval(4*3600),
              brandId: "apple", emoji: "🍎"),
        .init(id: "e5", kind: .streakBonus, title: "Streak Bonus", subtitle: "+50% if you hit 8k today",
              startsAt: Date(), endsAt: Calendar.current.startOfDay(for: Date().addingTimeInterval(86400)),
              brandId: nil, emoji: "🔥")
    ]

    /// Weekly stake — a friends-only weekly challenge that headlines the Friends tab.
    static let weeklyStake: WeeklyStake = WeeklyStake(
        id: "ws-w42",
        title: "Weekly Stake",
        subtitle: "Top step-count among friends takes the pot.",
        stake: 500,
        pot: 3_500,
        endsAt: Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date().addingTimeInterval(7*86400),
        entrants: [
            .init(id: "f1", handle: "@sable", name: "Sable Quinn", avatarSeed: 4, steps: 62_410),
            .init(id: "f2", handle: "@rune", name: "Rune Aalto", avatarSeed: 2, steps: 58_220),
            .init(id: "f3", handle: "@junopark", name: "Juno Park", avatarSeed: 7, steps: 51_405),
            .init(id: "f4", handle: "@miraly", name: "Mira Lyn", avatarSeed: 8, steps: 47_990),
            .init(id: "f5", handle: "@calder", name: "Calder Reeve", avatarSeed: 5, steps: 39_220),
            .init(id: "f6", handle: "@ines", name: "Inès Roux", avatarSeed: 6, steps: 32_440),
            .init(id: "me", handle: "@you", name: "You", avatarSeed: 42, steps: 28_312)
        ]
    )
}

// MARK: - Event & stake models

nonisolated enum LiveEventKind: String, Codable, Sendable {
    case powerHour, hotVault, raffleEnding, brandDrop, streakBonus
}

nonisolated struct LiveEvent: Identifiable, Hashable, Sendable {
    let id: String
    let kind: LiveEventKind
    let title: String
    let subtitle: String
    let startsAt: Date
    let endsAt: Date
    let brandId: String?
    let emoji: String

    var isLive: Bool {
        let now = Date()
        return startsAt <= now && now <= endsAt
    }
}

nonisolated struct WeeklyStakeEntrant: Identifiable, Hashable, Sendable {
    let id: String
    let handle: String
    let name: String
    let avatarSeed: Int
    let steps: Int
}

nonisolated struct WeeklyStake: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let subtitle: String
    let stake: Int
    let pot: Int
    let endsAt: Date
    let entrants: [WeeklyStakeEntrant]
}

// MARK: - Shared deterministic RNG

nonisolated struct SeededRandom {
    var state: UInt64
    init(seed: Int) { self.state = UInt64(bitPattern: Int64(seed)) &+ 0x9E3779B97F4A7C15 }
    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
    mutating func int(in range: ClosedRange<Int>) -> Int {
        let span = UInt64(range.upperBound - range.lowerBound + 1)
        return range.lowerBound + Int(next() % span)
    }
}

extension Array {
    mutating func shuffle(using rng: inout SeededRandom) {
        for i in stride(from: count - 1, through: 1, by: -1) {
            let j = Int(rng.next() % UInt64(i + 1))
            swapAt(i, j)
        }
    }
}
