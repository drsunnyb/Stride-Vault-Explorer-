import Foundation
import CoreLocation

/// Global city expansion / waitlist. London is the only live city — every
/// other major metro is "waitlist". Users outside London pick their city and
/// rally votes (steps + shares) so theirs opens next. Mirrors
/// `expo/constants/cities.ts` 1:1 so the leaderboard is identical across apps.
nonisolated struct City: Identifiable, Hashable, Sendable {
    enum Status: String, Codable, Sendable { case live, waitlist }
    let id: String
    let name: String
    let country: String
    /// ISO 3166-1 alpha-2 country code — drives the flag emoji.
    let countryCode: String
    let lat: Double
    let lng: Double
    /// Approx radius (km) used to detect whether the user is "in" this city.
    let radiusKm: Double
    let status: Status
    /// One-liner shown under the name in the leaderboard.
    let tagline: String

    var flag: String {
        countryCode.uppercased().unicodeScalars
            .compactMap { Unicode.Scalar(127397 + Int($0.value)) }
            .map(String.init).joined()
    }
}

nonisolated enum Cities {
    static let liveId = "london"

    static let all: [City] = [
        // Live
        // ~25mi radius — Greater London + commuter belt is auto-granted.
        City(id: "london", name: "London", country: "UK", countryCode: "GB",
             lat: 51.5074, lng: -0.1278, radiusKm: 40, status: .live,
             tagline: "1,100 vaults · live now"),
        // Europe
        City(id: "paris", name: "Paris", country: "France", countryCode: "FR",
             lat: 48.8566, lng: 2.3522, radiusKm: 30, status: .waitlist,
             tagline: "Vault the boulevards"),
        City(id: "amsterdam", name: "Amsterdam", country: "Netherlands", countryCode: "NL",
             lat: 52.3676, lng: 4.9041, radiusKm: 20, status: .waitlist,
             tagline: "Canals · cafés · coins"),
        City(id: "berlin", name: "Berlin", country: "Germany", countryCode: "DE",
             lat: 52.5200, lng: 13.4050, radiusKm: 30, status: .waitlist,
             tagline: "Mitte → Kreuzberg sprints"),
        City(id: "barcelona", name: "Barcelona", country: "Spain", countryCode: "ES",
             lat: 41.3851, lng: 2.1734, radiusKm: 25, status: .waitlist,
             tagline: "Ramblas to the beach"),
        City(id: "madrid", name: "Madrid", country: "Spain", countryCode: "ES",
             lat: 40.4168, lng: -3.7038, radiusKm: 25, status: .waitlist,
             tagline: "Plaza-hop for loot"),
        City(id: "rome", name: "Rome", country: "Italy", countryCode: "IT",
             lat: 41.9028, lng: 12.4964, radiusKm: 25, status: .waitlist,
             tagline: "Vaults at every fountain"),
        City(id: "milan", name: "Milan", country: "Italy", countryCode: "IT",
             lat: 45.4642, lng: 9.1900, radiusKm: 20, status: .waitlist,
             tagline: "Fashion-district drops"),
        City(id: "lisbon", name: "Lisbon", country: "Portugal", countryCode: "PT",
             lat: 38.7223, lng: -9.1393, radiusKm: 20, status: .waitlist,
             tagline: "Hills · tiles · coins"),
        City(id: "dublin", name: "Dublin", country: "Ireland", countryCode: "IE",
             lat: 53.3498, lng: -6.2603, radiusKm: 20, status: .waitlist,
             tagline: "Liffey loop"),
        City(id: "edinburgh", name: "Edinburgh", country: "UK", countryCode: "GB",
             lat: 55.9533, lng: -3.1883, radiusKm: 20, status: .waitlist,
             tagline: "Royal Mile run"),
        City(id: "manchester", name: "Manchester", country: "UK", countryCode: "GB",
             lat: 53.4808, lng: -2.2426, radiusKm: 20, status: .waitlist,
             tagline: "Northern Quarter quest"),
        City(id: "stockholm", name: "Stockholm", country: "Sweden", countryCode: "SE",
             lat: 59.3293, lng: 18.0686, radiusKm: 25, status: .waitlist,
             tagline: "Island-hop the archipelago"),
        City(id: "copenhagen", name: "Copenhagen", country: "Denmark", countryCode: "DK",
             lat: 55.6761, lng: 12.5683, radiusKm: 20, status: .waitlist,
             tagline: "Bike-lane bounty"),
        City(id: "vienna", name: "Vienna", country: "Austria", countryCode: "AT",
             lat: 48.2082, lng: 16.3738, radiusKm: 25, status: .waitlist,
             tagline: "Imperial ring runs"),
        City(id: "warsaw", name: "Warsaw", country: "Poland", countryCode: "PL",
             lat: 52.2297, lng: 21.0122, radiusKm: 25, status: .waitlist,
             tagline: "Old Town to Praga"),
        City(id: "istanbul", name: "Istanbul", country: "Turkey", countryCode: "TR",
             lat: 41.0082, lng: 28.9784, radiusKm: 40, status: .waitlist,
             tagline: "Bosphorus to Bazaar"),
        // North America
        City(id: "new-york", name: "New York", country: "USA", countryCode: "US",
             lat: 40.7128, lng: -74.0060, radiusKm: 35, status: .waitlist,
             tagline: "Five boroughs of loot"),
        City(id: "los-angeles", name: "Los Angeles", country: "USA", countryCode: "US",
             lat: 34.0522, lng: -118.2437, radiusKm: 50, status: .waitlist,
             tagline: "Sunset Strip to Venice"),
        City(id: "san-francisco", name: "San Francisco", country: "USA", countryCode: "US",
             lat: 37.7749, lng: -122.4194, radiusKm: 25, status: .waitlist,
             tagline: "7×7 of coin-fuelled hills"),
        City(id: "chicago", name: "Chicago", country: "USA", countryCode: "US",
             lat: 41.8781, lng: -87.6298, radiusKm: 35, status: .waitlist,
             tagline: "Lakefront loop"),
        City(id: "miami", name: "Miami", country: "USA", countryCode: "US",
             lat: 25.7617, lng: -80.1918, radiusKm: 30, status: .waitlist,
             tagline: "Beach drops + Wynwood walls"),
        City(id: "austin", name: "Austin", country: "USA", countryCode: "US",
             lat: 30.2672, lng: -97.7431, radiusKm: 25, status: .waitlist,
             tagline: "SXSW sprint"),
        City(id: "toronto", name: "Toronto", country: "Canada", countryCode: "CA",
             lat: 43.6532, lng: -79.3832, radiusKm: 30, status: .waitlist,
             tagline: "CN to King West"),
        City(id: "vancouver", name: "Vancouver", country: "Canada", countryCode: "CA",
             lat: 49.2827, lng: -123.1207, radiusKm: 25, status: .waitlist,
             tagline: "Seawall to Stanley"),
        City(id: "mexico-city", name: "Mexico City", country: "Mexico", countryCode: "MX",
             lat: 19.4326, lng: -99.1332, radiusKm: 40, status: .waitlist,
             tagline: "Roma to Reforma"),
        // South America
        City(id: "sao-paulo", name: "São Paulo", country: "Brazil", countryCode: "BR",
             lat: -23.5505, lng: -46.6333, radiusKm: 45, status: .waitlist,
             tagline: "Avenida Paulista pace"),
        City(id: "rio", name: "Rio de Janeiro", country: "Brazil", countryCode: "BR",
             lat: -22.9068, lng: -43.1729, radiusKm: 30, status: .waitlist,
             tagline: "Copacabana → Christ"),
        City(id: "buenos-aires", name: "Buenos Aires", country: "Argentina", countryCode: "AR",
             lat: -34.6037, lng: -58.3816, radiusKm: 30, status: .waitlist,
             tagline: "Palermo nightline"),
        // Asia
        City(id: "tokyo", name: "Tokyo", country: "Japan", countryCode: "JP",
             lat: 35.6762, lng: 139.6503, radiusKm: 40, status: .waitlist,
             tagline: "Shibuya · Shinjuku · loot"),
        City(id: "seoul", name: "Seoul", country: "South Korea", countryCode: "KR",
             lat: 37.5665, lng: 126.9780, radiusKm: 30, status: .waitlist,
             tagline: "Han River relay"),
        City(id: "singapore", name: "Singapore", country: "Singapore", countryCode: "SG",
             lat: 1.3521, lng: 103.8198, radiusKm: 25, status: .waitlist,
             tagline: "Tiny island, huge prizes"),
        City(id: "hong-kong", name: "Hong Kong", country: "Hong Kong", countryCode: "HK",
             lat: 22.3193, lng: 114.1694, radiusKm: 25, status: .waitlist,
             tagline: "Central to Kowloon"),
        City(id: "bangkok", name: "Bangkok", country: "Thailand", countryCode: "TH",
             lat: 13.7563, lng: 100.5018, radiusKm: 30, status: .waitlist,
             tagline: "Sukhumvit street game"),
        City(id: "mumbai", name: "Mumbai", country: "India", countryCode: "IN",
             lat: 19.0760, lng: 72.8777, radiusKm: 35, status: .waitlist,
             tagline: "Marine Drive miles"),
        City(id: "delhi", name: "Delhi", country: "India", countryCode: "IN",
             lat: 28.6139, lng: 77.2090, radiusKm: 40, status: .waitlist,
             tagline: "Old Delhi to Hauz Khas"),
        City(id: "dubai", name: "Dubai", country: "UAE", countryCode: "AE",
             lat: 25.2048, lng: 55.2708, radiusKm: 30, status: .waitlist,
             tagline: "Marina · Downtown · gold"),
        // Oceania + Africa
        City(id: "sydney", name: "Sydney", country: "Australia", countryCode: "AU",
             lat: -33.8688, lng: 151.2093, radiusKm: 35, status: .waitlist,
             tagline: "Harbour bridge laps"),
        City(id: "melbourne", name: "Melbourne", country: "Australia", countryCode: "AU",
             lat: -37.8136, lng: 144.9631, radiusKm: 30, status: .waitlist,
             tagline: "Laneway hunts"),
        City(id: "auckland", name: "Auckland", country: "New Zealand", countryCode: "NZ",
             lat: -36.8485, lng: 174.7633, radiusKm: 25, status: .waitlist,
             tagline: "City of sails"),
        City(id: "cape-town", name: "Cape Town", country: "South Africa", countryCode: "ZA",
             lat: -33.9249, lng: 18.4241, radiusKm: 30, status: .waitlist,
             tagline: "Table to Sea Point"),
        City(id: "johannesburg", name: "Johannesburg", country: "South Africa", countryCode: "ZA",
             lat: -26.2041, lng: 28.0473, radiusKm: 35, status: .waitlist,
             tagline: "Sandton to Maboneng"),
        City(id: "lagos", name: "Lagos", country: "Nigeria", countryCode: "NG",
             lat: 6.5244, lng: 3.3792, radiusKm: 35, status: .waitlist,
             tagline: "Lekki sprint"),
        City(id: "nairobi", name: "Nairobi", country: "Kenya", countryCode: "KE",
             lat: -1.2921, lng: 36.8219, radiusKm: 30, status: .waitlist,
             tagline: "Westlands warmup"),
    ]

    static let byId: [String: City] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    /// Closest city to the given coordinate, or nil if more than 1.5× the
    /// nearest city's radius away.
    static func detect(lat: Double, lng: Double) -> City? {
        var best: (city: City, d: Double)?
        for c in all {
            let d = haversineKm(lat1: lat, lng1: lng, lat2: c.lat, lng2: c.lng)
            if d <= c.radiusKm * 1.5, best == nil || d < best!.d {
                best = (c, d)
            }
        }
        return best?.city
    }

    /// True if the given coordinate is within the London live radius (~25mi).
    static func isInLondon(lat: Double, lng: Double) -> Bool {
        guard let london = byId[liveId] else { return false }
        return haversineKm(lat1: lat, lng1: lng, lat2: london.lat, lng2: london.lng) <= london.radiusKm
    }

    private static func haversineKm(lat1: Double, lng1: Double, lat2: Double, lng2: Double) -> Double {
        let R = 6371.0
        let dLat = (lat2 - lat1) * .pi / 180
        let dLng = (lng2 - lng1) * .pi / 180
        let a = sin(dLat / 2) * sin(dLat / 2)
            + cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180)
            * sin(dLng / 2) * sin(dLng / 2)
        return 2 * R * asin(min(1, sqrt(a)))
    }

    // ── Seeded vote baselines so the board feels alive on day one. ─────
    private static let bigCities: Set<String> = [
        "new-york", "tokyo", "paris", "los-angeles", "mumbai", "sao-paulo",
        "delhi", "istanbul", "mexico-city", "seoul", "bangkok",
    ]
    private static let midCities: Set<String> = [
        "berlin", "barcelona", "madrid", "amsterdam", "milan", "toronto",
        "sydney", "chicago", "dubai", "hong-kong", "singapore", "lagos",
        "manchester", "rio", "buenos-aires", "miami",
    ]

    /// Deterministic baseline vote count — same on every device, with slow
    /// daily creep so the board moves between sessions.
    static func seededVotes(_ city: City, now: Date = Date()) -> Int {
        guard city.status == .waitlist else { return 0 }
        let tier: Int = bigCities.contains(city.id) ? 3
                      : midCities.contains(city.id) ? 2 : 1
        let base = tier == 3 ? 4200 : tier == 2 ? 1900 : 620
        let h = fnv1a(city.id)
        let jitter = Double(h % 800) * 0.6
        let dayIndex = Int(now.timeIntervalSince1970 / 86_400)
        let drift = dayIndex * (tier == 3 ? 11 : tier == 2 ? 5 : 2)
        return Int(Double(base) + jitter + Double(drift % Int(Double(base) * 0.2)))
    }

    private static func fnv1a(_ s: String) -> Int {
        var h: UInt32 = 2166136261
        for b in s.utf8 {
            h ^= UInt32(b)
            h = h &* 16777619
        }
        return Int(h)
    }
}

nonisolated enum CityWaitlistConfig {
    /// Votes minted per N steps walked toward the home city.
    static let stepsPerVote: Int = 1000
    /// Bonus votes minted per share toward the home city.
    static let sharePerVote: Int = 5
    /// Bonus votes minted when a referred friend signs up.
    static let referralPerVote: Int = 50
}
