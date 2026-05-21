import Foundation
import CoreLocation
import Observation

/// Lightweight CoreLocation wrapper that publishes the user's current coordinate
/// and authorisation status. Used by the map to centre on the user and to
/// power "nearby vaults" calculations.
@Observable
final class LocationService: NSObject, CLLocationManagerDelegate {
    static let shared = LocationService()

    private let manager = CLLocationManager()

    /// Latest known coordinate. `nil` until the OS returns a fix.
    var coordinate: CLLocationCoordinate2D?
    var authorization: CLAuthorizationStatus = .notDetermined
    var didReceiveFix: Bool = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.distanceFilter = 25
        authorization = manager.authorizationStatus
    }

    /// Request When-In-Use permission and start streaming locations.
    func start() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        default:
            break
        }
    }

    func stop() {
        manager.stopUpdatingLocation()
    }

    // MARK: - CLLocationManagerDelegate

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authorization = status
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                manager.startUpdatingLocation()
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        let coord = loc.coordinate
        Task { @MainActor in
            self.coordinate = coord
            self.didReceiveFix = true
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Non-fatal — keep last known coord.
    }
}
