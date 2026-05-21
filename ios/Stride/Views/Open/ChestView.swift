import SwiftUI

/// Stylised treasure chest. Tier-tinted, with separate lid + body for the open animation.
struct ChestView: View {
    let tier: Tier
    let lidOpen: Bool
    let shake: Bool

    var body: some View {
        ZStack {
            // Body
            chestBody
                .offset(x: shake ? -4 : 4)
                .animation(.spring(response: 0.18, dampingFraction: 0.3), value: shake)

            // Lid — pivots on its back edge and lifts up
            chestLid
                .rotation3DEffect(
                    .degrees(lidOpen ? -130 : 0),
                    axis: (x: 1, y: 0, z: 0),
                    anchor: .top,
                    perspective: 0.5
                )
                .offset(y: lidOpen ? -120 : -78)
                .animation(.spring(response: 0.55, dampingFraction: 0.55), value: lidOpen)
        }
        .frame(width: 220, height: 220)
    }

    // MARK: - Body

    private var chestBody: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 18)
                .fill(
                    LinearGradient(
                        colors: [tier.color, tier.color.opacity(0.7)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: 200, height: 140)
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(tier.glow.opacity(0.8), lineWidth: 2)
                )

            // Wood planks
            HStack(spacing: 0) {
                ForEach(0..<3) { i in
                    Rectangle()
                        .fill(Color.black.opacity(0.15))
                        .frame(width: 1)
                        .padding(.vertical, 18)
                        .offset(x: CGFloat(i) * 0)
                }
            }
            .frame(width: 200, height: 140)

            // Metal bands
            VStack(spacing: 16) {
                Capsule()
                    .fill(LinearGradient(colors: [Color.white.opacity(0.5), tier.glow], startPoint: .top, endPoint: .bottom))
                    .frame(width: 220, height: 10)
                Spacer()
                Capsule()
                    .fill(LinearGradient(colors: [tier.glow, Color.black.opacity(0.4)], startPoint: .top, endPoint: .bottom))
                    .frame(width: 220, height: 10)
            }
            .frame(width: 200, height: 140)

            // Lock
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: [tier.glow, tier.color], startPoint: .top, endPoint: .bottom))
                    .frame(width: 42, height: 42)
                    .overlay(Circle().stroke(Color.white.opacity(0.5), lineWidth: 1.5))
                    .shadow(color: tier.glow.opacity(0.8), radius: 8)
                Image(systemName: lidOpen ? "lock.open.fill" : "lock.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color.black.opacity(0.7))
                    .contentTransition(.symbolEffect(.replace))
            }
            .offset(y: -6)
        }
        .offset(y: 50)
    }

    // MARK: - Lid

    private var chestLid: some View {
        ZStack {
            // Curved top
            UnevenRoundedRectangle(
                topLeadingRadius: 80,
                bottomLeadingRadius: 8,
                bottomTrailingRadius: 8,
                topTrailingRadius: 80,
                style: .continuous
            )
            .fill(
                LinearGradient(
                    colors: [tier.glow, tier.color],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .frame(width: 200, height: 90)
            .overlay(
                UnevenRoundedRectangle(
                    topLeadingRadius: 80,
                    bottomLeadingRadius: 8,
                    bottomTrailingRadius: 8,
                    topTrailingRadius: 80,
                    style: .continuous
                )
                .stroke(tier.glow.opacity(0.9), lineWidth: 2)
            )

            // Centre emblem
            ZStack {
                Image(systemName: "diamond.fill")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(Color.black.opacity(0.55))
                Image(systemName: "diamond")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(Color.white.opacity(0.7))
            }
            .offset(y: 10)
        }
    }
}
