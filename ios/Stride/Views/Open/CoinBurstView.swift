import SwiftUI

/// Renders the radiating coin shower for the vault open reveal.
struct CoinBurstView: View {
    let particles: [CoinParticle]
    /// 0…1 — drives the whole burst.
    let progress: Double

    var body: some View {
        ZStack {
            ForEach(particles) { p in
                CoinParticleView(particle: p, progress: progress)
            }
        }
        .allowsHitTesting(false)
    }
}

private struct CoinParticleView: View {
    let particle: CoinParticle
    let progress: Double

    var body: some View {
        let local = max(0, min(1, (progress - particle.delay) / particle.duration))
        let eased = easeOut(local)
        let dx = cos(particle.angle) * particle.distance * CGFloat(eased)
        // Coins fly out then drop with gravity.
        let dyRadial = sin(particle.angle) * particle.distance * CGFloat(eased)
        let gravity = pow(CGFloat(eased), 2) * 280 - CGFloat(eased) * particle.arcHeight
        let dy = dyRadial + gravity
        let fade = 1 - pow(local, 3)

        CoinIcon(size: particle.size)
            .rotationEffect(.degrees(particle.rotation * eased))
            .offset(x: dx, y: dy)
            .opacity(local > 0 ? fade : 0)
            .scaleEffect(local > 0 ? 1 : 0.2)
    }

    private func easeOut(_ t: Double) -> Double {
        1 - pow(1 - t, 3)
    }
}
