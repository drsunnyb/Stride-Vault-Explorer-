import Foundation
import CoreLocation

nonisolated struct Vault: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let area: String
    let blurb: String
    let lat: Double
    let lng: Double
    let tier: Tier
    let symbol: String
    /// Remote hero image (Unsplash photo IDs picked for each landmark).
    let imageURL: URL?
    /// Optional branded sponsor — drives branded vault opening FX & branded reward currency.
    let brandId: String?

    init(id: String, name: String, area: String, blurb: String,
         lat: Double, lng: Double, tier: Tier, symbol: String,
         imageURL: URL?, brandId: String? = nil) {
        self.id = id; self.name = name; self.area = area; self.blurb = blurb
        self.lat = lat; self.lng = lng; self.tier = tier; self.symbol = symbol
        self.imageURL = imageURL; self.brandId = brandId
    }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }

    func distanceMeters(from origin: CLLocationCoordinate2D) -> Double {
        let a = CLLocation(latitude: lat, longitude: lng)
        let b = CLLocation(latitude: origin.latitude, longitude: origin.longitude)
        return a.distance(from: b)
    }
}

nonisolated struct VaultReward: Hashable, Sendable {
    let coins: Int
    let xp: Int
    /// If branded, the branded currency name (e.g. "Nike Coins") credited in addition.
    let brandId: String?
    let brandCoins: Int

    init(coins: Int, xp: Int, brandId: String? = nil, brandCoins: Int = 0) {
        self.coins = coins; self.xp = xp; self.brandId = brandId; self.brandCoins = brandCoins
    }
}
