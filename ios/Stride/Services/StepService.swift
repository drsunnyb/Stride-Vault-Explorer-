import Foundation
import CoreMotion
import Observation

/// CoreMotion-backed step counter. Mirrors `expo/lib/pedometer.ts` behaviour:
/// seeds today's count from the OS pedometer, then live-updates while in the
/// foreground. Falls back gracefully on simulator / unavailable devices.
@Observable
final class StepService {
    private let pedometer = CMPedometer()
    private(set) var available: Bool = false

    /// `(today, lifetimeDelta)` callback fired on every pedometer update.
    var onUpdate: ((Int, Int) -> Void)?

    private var sessionLast: Int = 0

    func start() {
        guard CMPedometer.isStepCountingAvailable() else { return }
        available = true

        // Seed today's count.
        let cal = Calendar.current
        let startOfDay = cal.startOfDay(for: Date())
        pedometer.queryPedometerData(from: startOfDay, to: Date()) { [weak self] data, _ in
            guard let self, let d = data else { return }
            let today = d.numberOfSteps.intValue
            Task { @MainActor in self.onUpdate?(today, 0) }
        }

        // Live updates.
        pedometer.startUpdates(from: startOfDay) { [weak self] data, _ in
            guard let self, let d = data else { return }
            let total = d.numberOfSteps.intValue
            let added = max(0, total - self.sessionLast)
            self.sessionLast = total
            Task { @MainActor in self.onUpdate?(total, added) }
        }
    }

    func stop() {
        pedometer.stopUpdates()
    }
}
