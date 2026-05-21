import Foundation

/// Lightweight Supabase REST client. Fetches the live admin-controlled
/// catalogues (brands, rewards, raffles, cities, app config) and exposes them
/// as `@Observable` snapshots so views re-render when the admin pushes
/// changes from the dashboard.
///
/// Reads are public (RLS `select for all`). Writes go through the admin
/// dashboard with the service-role key — the app itself never mutates the
/// catalogue tables.
@Observable
final class SupabaseService {
    static let shared = SupabaseService()

    private(set) var brands: [Brand] = []
    private(set) var rewards: [Reward] = []
    private(set) var raffles: [Raffle] = []
    private(set) var cities: [City] = []
    private(set) var exchangeRates: [String: Int] = [:]
    private(set) var config: [String: Any] = [:]
    private(set) var lastSyncedAt: Date?

    private var hasSupabase: Bool {
        !Config.EXPO_PUBLIC_SUPABASE_URL.isEmpty
            && !Config.EXPO_PUBLIC_SUPABASE_ANON_KEY.isEmpty
    }

    /// Fetch every catalogue in parallel. Safe to call on launch + on a
    /// background refresh timer. Silent on failure (we fall back to local seeds).
    func refreshAll() async {
        guard hasSupabase else { return }
        async let b: [BrandRow] = fetch("brands?active=eq.true&order=sort_order.asc")
        async let r: [RewardRow] = fetch("rewards?active=eq.true&order=sort_order.asc")
        async let f: [RaffleRow] = fetch("raffles?active=eq.true&order=sort_order.asc")
        async let c: [CityRow]   = fetch("cities?active=eq.true&order=sort_order.asc")
        async let cfg: [ConfigRow] = fetch("app_config?select=key,value")

        let (brandsRows, rewardsRows, rafflesRows, citiesRows, cfgRows) =
            await (b, r, f, c, cfg)

        if !brandsRows.isEmpty {
            brands = brandsRows.map { row in
                Brand(
                    id: row.id,
                    name: row.name,
                    coinName: row.coin_name,
                    short: row.short,
                    tagline: row.tagline ?? "",
                    mark: row.mark ?? "",
                    hex: row.color,
                    brightHex: row.color_bright,
                    invertedText: row.inverted_text ?? false
                )
            }
            var rates: [String: Int] = [:]
            for row in brandsRows { rates[row.id] = row.exchange_rate ?? 5 }
            exchangeRates = rates
        }

        if !rewardsRows.isEmpty {
            rewards = rewardsRows.map { row in
                Reward(
                    id: row.id,
                    title: row.title,
                    blurb: row.subtitle ?? "",
                    cost: row.brand_cost ?? row.coin_cost ?? 0,
                    brandId: row.brand,
                    emoji: row.emoji ?? "🎁",
                    category: .gift,
                    stock: nil
                )
            }
        }

        if !rafflesRows.isEmpty {
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let isoBasic = ISO8601DateFormatter()
            raffles = rafflesRows.map { row in
                let end = iso.date(from: row.ends_at)
                    ?? isoBasic.date(from: row.ends_at)
                    ?? Date().addingTimeInterval(86_400)
                return Raffle(
                    id: row.id,
                    title: row.title,
                    prize: row.prize,
                    prizeValueGbp: row.prize_value_gbp ?? 0,
                    emoji: row.emoji ?? "🎁",
                    entryCost: row.entry_cost,
                    maxEntriesPerUser: row.max_entries_per_user ?? 50,
                    endsAt: end,
                    winners: row.winners ?? 1,
                    totalEntries: row.total_entries ?? 0,
                    brandId: row.brand,
                    plusOnly: row.plus_only ?? false
                )
            }
        }

        if !citiesRows.isEmpty {
            cities = citiesRows.map { row in
                City(
                    id: row.id,
                    name: row.name,
                    country: row.country,
                    countryCode: row.country_code,
                    lat: row.lat,
                    lng: row.lng,
                    radiusKm: Double(row.radius_km),
                    status: row.status == "live" ? .live : .waitlist,
                    tagline: row.tagline ?? ""
                )
            }
        }

        if !cfgRows.isEmpty {
            var map: [String: Any] = [:]
            for row in cfgRows { map[row.key] = row.value }
            config = map
        }

        lastSyncedAt = Date()
    }

    /// Integer value from `app_config` (admin-controlled tunables).
    func configInt(_ key: String, default fallback: Int) -> Int {
        if let n = config[key] as? Int { return n }
        if let n = config[key] as? NSNumber { return n.intValue }
        if let s = config[key] as? String, let n = Int(s) { return n }
        return fallback
    }

    /// Double value from `app_config`.
    func configDouble(_ key: String, default fallback: Double) -> Double {
        if let n = config[key] as? Double { return n }
        if let n = config[key] as? NSNumber { return n.doubleValue }
        if let s = config[key] as? String, let n = Double(s) { return n }
        return fallback
    }

    // MARK: - REST helper

    private func fetch<T: Decodable & Sendable>(_ path: String) async -> [T] {
        guard hasSupabase,
              let url = URL(string: "\(Config.EXPO_PUBLIC_SUPABASE_URL)/rest/v1/\(path)")
        else { return [] }
        var req = URLRequest(url: url)
        req.setValue(Config.EXPO_PUBLIC_SUPABASE_ANON_KEY, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(Config.EXPO_PUBLIC_SUPABASE_ANON_KEY)", forHTTPHeaderField: "Authorization")
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
                return []
            }
            return try JSONDecoder().decode([T].self, from: data)
        } catch {
            return []
        }
    }
}

// MARK: - Row DTOs (mirror Postgres column names)

nonisolated struct BrandRow: Decodable, Sendable {
    let id: String
    let name: String
    let short: String
    let coin_name: String
    let color: String
    let color_bright: String
    let color_dim: String
    let tagline: String?
    let mark: String?
    let inverted_text: Bool?
    let exchange_rate: Int?
}

nonisolated struct RewardRow: Decodable, Sendable {
    let id: String
    let brand: String?
    let title: String
    let subtitle: String?
    let badge: String?
    let coin_cost: Int?
    let brand_cost: Int?
    let redeem_at: String?
    let emoji: String?
    let value_gbp: Int?
    let in_store_only: Bool?
}

nonisolated struct RaffleRow: Decodable, Sendable {
    let id: String
    let title: String
    let prize: String
    let prize_value_gbp: Int?
    let emoji: String?
    let entry_cost: Int
    let brand_entry_cost: Int?
    let max_entries_per_user: Int?
    let winners: Int?
    let ends_at: String
    let total_entries: Int?
    let brand: String?
    let plus_only: Bool?
}

nonisolated struct CityRow: Decodable, Sendable {
    let id: String
    let name: String
    let country: String
    let country_code: String
    let lat: Double
    let lng: Double
    let radius_km: Int
    let status: String
    let tagline: String?
    let votes: Int?
}

nonisolated struct ConfigRow: Decodable, Sendable {
    let key: String
    /// Stored as jsonb — decode as a permissive JSONValue we coerce later.
    let value: AnyDecodable

    var rawValue: Any { value.value }
}

/// Tiny `Decodable` wrapper that captures any JSON scalar.
nonisolated struct AnyDecodable: Decodable, Sendable {
    let value: Any

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let n = try? c.decode(Int.self) { value = n; return }
        if let n = try? c.decode(Double.self) { value = n; return }
        if let b = try? c.decode(Bool.self) { value = b; return }
        if let s = try? c.decode(String.self) { value = s; return }
        value = NSNull()
    }
}

extension ConfigRow {
    enum CodingKeys: String, CodingKey { case key, value }
}

// Helper used in ConfigRow loop
extension Dictionary where Key == String, Value == Any {
    mutating func setConfig(row: ConfigRow) {
        self[row.key] = row.rawValue
    }
}
