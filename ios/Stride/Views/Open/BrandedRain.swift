import SwiftUI

/// Branded particle rain shown during the vault open ceremony for sponsored vaults.
/// Nike → big swoosh-styled trainers raining slowly with branded swoosh confetti.
/// Apple → falling Apple logos. Lulu → omega leaves & water drops.
struct BrandedRain: View {
    let brandId: String
    let isActive: Bool

    @State private var drops: [Drop] = []
    @State private var animateOn = false

    struct Drop: Identifiable {
        let id = UUID()
        var x: CGFloat           // 0..1 horizontal position
        var startY: CGFloat
        var endY: CGFloat
        var rotation: Double
        var rotationDelta: Double
        var scale: CGFloat
        var delay: Double
        var duration: Double
        var kind: Kind
    }

    enum Kind { case shoe, swoosh, sparkle, apple, watch, headphones, leaf, drop, om }

    private var tint: Color {
        AppData.brand(brandId)?.color ?? Theme.goldBright
    }

    private var brightTint: Color {
        AppData.brand(brandId)?.bright ?? Theme.goldBright
    }

    private var pool: [Kind] {
        switch brandId {
        case "nike":
            // Heavy on shoes — that's the hero — with swooshes interleaved
            return [.shoe, .shoe, .shoe, .shoe, .swoosh, .shoe, .sparkle, .swoosh]
        case "apple":
            return [.apple, .apple, .watch, .headphones, .apple, .sparkle]
        case "lulu":
            return [.leaf, .drop, .om, .leaf, .drop, .sparkle]
        default:
            return [.sparkle]
        }
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Brand-tinted vignette so the screen washes with the colour
                RadialGradient(
                    colors: [tint.opacity(0.0), tint.opacity(0.28)],
                    center: .center, startRadius: 60, endRadius: max(geo.size.width, geo.size.height)
                )
                .ignoresSafeArea()
                .opacity(animateOn ? 1 : 0)

                ForEach(drops) { drop in
                    BrandShape(kind: drop.kind, tint: tint, bright: brightTint)
                        .scaleEffect(drop.scale)
                        .rotationEffect(.degrees(animateOn ? drop.rotation + drop.rotationDelta : drop.rotation))
                        .position(
                            x: drop.x * geo.size.width,
                            y: animateOn ? drop.endY : drop.startY
                        )
                        .opacity(animateOn ? 1 : 0)
                        .shadow(color: tint.opacity(0.55), radius: 10)
                        .animation(
                            .easeIn(duration: drop.duration).delay(drop.delay),
                            value: animateOn
                        )
                }
            }
            .onAppear {
                if drops.isEmpty { drops = makeDrops(width: geo.size.width, height: geo.size.height) }
            }
            .onChange(of: isActive) { _, newValue in
                if newValue {
                    if drops.isEmpty {
                        drops = makeDrops(width: geo.size.width, height: geo.size.height)
                    }
                    // Tiny delay to ensure drops are mounted at their startY before we trigger the fall
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.02) {
                        animateOn = true
                    }
                } else {
                    animateOn = false
                }
            }
        }
        .allowsHitTesting(false)
    }

    private func makeDrops(width: CGFloat, height: CGFloat) -> [Drop] {
        // More particles + slower fall = a luxurious shower instead of a quick splash
        let count = 38
        let p = pool
        return (0..<count).map { i in
            let frac = Double(i) / Double(count)
            let kind = p[i % p.count]
            // Shoes are the hero — make them bigger and slower than the confetti
            let isHero = (kind == .shoe || kind == .apple || kind == .om)
            return Drop(
                x: CGFloat(Double.random(in: 0.04...0.96)),
                startY: -CGFloat.random(in: 80...360),
                endY: height + CGFloat.random(in: 60...160),
                rotation: Double.random(in: -25...25),
                rotationDelta: Double.random(in: 90...360) * (Bool.random() ? 1 : -1),
                scale: isHero ? CGFloat.random(in: 0.95...1.45) : CGFloat.random(in: 0.55...0.95),
                delay: frac * 1.4 + Double.random(in: 0...0.35),
                duration: isHero ? Double.random(in: 3.6...5.2) : Double.random(in: 2.4...3.6),
                kind: kind
            )
        }
    }
}

// MARK: - Branded shape primitives

/// Wraps a single particle so the right glyph + accent renders without an emoji.
/// Uses native SF Symbols for crisp scaling and tint control.
private struct BrandShape: View {
    let kind: BrandedRain.Kind
    let tint: Color
    let bright: Color

    var body: some View {
        switch kind {
        case .shoe:
            NikeShoe(tint: tint, bright: bright)
        case .swoosh:
            Swoosh(color: bright)
                .frame(width: 38, height: 16)
        case .apple:
            Image(systemName: "applelogo")
                .font(.system(size: 38, weight: .black))
                .foregroundStyle(LinearGradient(colors: [.white, .white.opacity(0.85)],
                                                startPoint: .top, endPoint: .bottom))
        case .watch:
            Image(systemName: "applewatch")
                .font(.system(size: 30, weight: .heavy))
                .foregroundStyle(.white)
        case .headphones:
            Image(systemName: "airpodspro")
                .font(.system(size: 30, weight: .heavy))
                .foregroundStyle(.white)
        case .leaf:
            Image(systemName: "leaf.fill")
                .font(.system(size: 26, weight: .black))
                .foregroundStyle(bright)
        case .drop:
            Image(systemName: "drop.fill")
                .font(.system(size: 22, weight: .black))
                .foregroundStyle(bright)
        case .om:
            Text("ω")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(bright)
        case .sparkle:
            Image(systemName: "sparkle")
                .font(.system(size: 16, weight: .black))
                .foregroundStyle(bright)
        }
    }
}

/// Stylised Nike-style trainer composed of SF Symbols layered on a tinted plate.
/// Uses `shoe.fill` as the hero glyph with a swoosh badge — no copyrighted artwork.
private struct NikeShoe: View {
    let tint: Color
    let bright: Color

    var body: some View {
        ZStack {
            // Shoe silhouette plate
            Image(systemName: "shoe.fill")
                .font(.system(size: 48, weight: .black))
                .foregroundStyle(
                    LinearGradient(colors: [.white, .white.opacity(0.85)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .shadow(color: .black.opacity(0.5), radius: 6, y: 3)

            // Coloured midsole stripe
            Capsule()
                .fill(tint)
                .frame(width: 44, height: 5)
                .offset(y: 13)
                .blendMode(.multiply)

            // Swoosh accent
            Swoosh(color: tint)
                .frame(width: 22, height: 9)
                .offset(x: -2, y: 2)
        }
        .compositingGroup()
    }
}

/// Hand-drawn swoosh-style arc — a simple curved tick that reads as a sporty mark.
private struct Swoosh: Shape, @unchecked Sendable {
    var color: Color = .black
    func path(in rect: CGRect) -> Path {
        var p = Path()
        // Long swoosh curve from upper-left dipping then rising sharply
        p.move(to: CGPoint(x: rect.minX, y: rect.maxY * 0.55))
        p.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.minY),
            control: CGPoint(x: rect.maxX * 0.55, y: rect.maxY * 1.25)
        )
        p.addLine(to: CGPoint(x: rect.maxX * 0.78, y: rect.minY + 3))
        p.addQuadCurve(
            to: CGPoint(x: rect.minX + 2, y: rect.maxY * 0.65),
            control: CGPoint(x: rect.maxX * 0.55, y: rect.maxY * 0.95)
        )
        p.closeSubpath()
        return p
    }
}

extension Swoosh: View {
    var body: some View {
        self.fill(color)
    }
}
