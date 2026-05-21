import SwiftUI

/// Twinkling stars in the background during the open ceremony.
struct SparkleField: View {
    let count: Int
    @State private var seeds: [Sparkle] = []
    @State private var twinkle = false

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(seeds) { s in
                    Image(systemName: "sparkle")
                        .font(.system(size: s.size))
                        .foregroundStyle(Theme.goldBright)
                        .opacity(twinkle ? s.maxOpacity : 0.05)
                        .position(x: s.x * geo.size.width, y: s.y * geo.size.height)
                        .animation(
                            .easeInOut(duration: s.duration)
                                .repeatForever(autoreverses: true)
                                .delay(s.delay),
                            value: twinkle
                        )
                }
            }
            .onAppear {
                if seeds.isEmpty {
                    seeds = (0..<count).map { _ in Sparkle.random() }
                }
                twinkle = true
            }
        }
    }
}

private struct Sparkle: Identifiable {
    let id = UUID()
    let x: CGFloat
    let y: CGFloat
    let size: CGFloat
    let maxOpacity: Double
    let duration: Double
    let delay: Double

    static func random() -> Sparkle {
        Sparkle(
            x: .random(in: 0.04...0.96),
            y: .random(in: 0.04...0.96),
            size: .random(in: 8...22),
            maxOpacity: .random(in: 0.5...1.0),
            duration: .random(in: 0.9...2.2),
            delay: .random(in: 0...1.5)
        )
    }
}
