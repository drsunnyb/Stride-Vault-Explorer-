import SwiftUI

/// A single coin emitted during the vault opening burst.
struct CoinParticle: Identifiable {
    let id = UUID()
    let angle: Double          // launch angle in radians
    let distance: CGFloat      // final radial distance
    let size: CGFloat
    let delay: Double
    let duration: Double
    let rotation: Double
    let arcHeight: CGFloat
}

extension CoinParticle {
    static func burst(count: Int) -> [CoinParticle] {
        (0..<count).map { i in
            let progress = Double(i) / Double(count)
            let baseAngle = progress * .pi * 2
            let jitter = Double.random(in: -0.18...0.18)
            return CoinParticle(
                angle: baseAngle + jitter,
                distance: CGFloat.random(in: 140...260),
                size: CGFloat.random(in: 14...30),
                delay: Double.random(in: 0...0.18),
                duration: Double.random(in: 0.95...1.45),
                rotation: Double.random(in: 360...920),
                arcHeight: CGFloat.random(in: 60...130)
            )
        }
    }
}
