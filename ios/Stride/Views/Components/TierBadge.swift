import SwiftUI

struct TierBadge: View {
    let tier: Tier

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(LinearGradient(colors: tier.gradient, startPoint: .top, endPoint: .bottom))
                .frame(width: 8, height: 8)
                .shadow(color: tier.glow.opacity(0.8), radius: 4)
            Text(tier.label.uppercased())
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .tracking(1.2)
                .foregroundStyle(tier.glow)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(
            Capsule().fill(tier.color.opacity(0.12))
        )
        .overlay(
            Capsule().stroke(tier.color.opacity(0.35), lineWidth: 1)
        )
    }
}
