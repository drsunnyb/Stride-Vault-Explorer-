import SwiftUI

struct VaultDetailSheet: View {
    let vault: Vault
    let reward: VaultReward
    let isClaimed: Bool
    let canOpen: Bool
    let metersAway: Double
    let radius: Double
    let demoMode: Bool
    let onOpen: () -> Void
    let onWalkHere: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                VaultHeroImage(vault: vault, height: 280, cornerRadius: 0)
                    .overlay(alignment: .topLeading) {
                        TierBadge(tier: vault.tier).padding(16)
                    }
                    .overlay(alignment: .bottomLeading) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(vault.area.uppercased())
                                .font(.system(size: 11, weight: .heavy))
                                .tracking(1.6)
                                .foregroundStyle(.white.opacity(0.85))
                            Text(vault.name)
                                .font(.system(size: 32, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                        }
                        .padding(20)
                    }

                VStack(alignment: .leading, spacing: 22) {
                    Text(vault.blurb)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                        .lineSpacing(3)

                    rewardRow

                    if !isClaimed {
                        geofenceCard
                    }

                    primaryCTA

                    if !isClaimed && !canOpen && demoMode {
                        Button(action: onWalkHere) {
                            HStack(spacing: 8) {
                                Image(systemName: "figure.walk")
                                Text("WALK HERE (DEMO)")
                            }
                            .font(.system(size: 13, weight: .heavy, design: .rounded))
                            .tracking(1.4)
                            .foregroundStyle(Theme.textMuted)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(
                                Capsule().stroke(Theme.border, lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(22)
            }
        }
        .background(Theme.bg.ignoresSafeArea())
        .presentationDragIndicator(.visible)
        .presentationDetents([.medium, .large])
    }

    // MARK: - CTA

    @ViewBuilder
    private var primaryCTA: some View {
        Button(action: onOpen) {
            HStack(spacing: 10) {
                if isClaimed {
                    Image(systemName: "checkmark.seal.fill")
                    Text("ALREADY CLAIMED")
                } else if !canOpen {
                    Image(systemName: "location.slash.fill")
                    Text(walkCloserLabel)
                } else {
                    Image(systemName: "lock.open.fill")
                    Text("OPEN VAULT")
                }
            }
            .font(.system(size: 16, weight: .heavy, design: .rounded))
            .tracking(2)
            .foregroundStyle(ctaForeground)
            .frame(maxWidth: .infinity)
            .frame(height: 60)
            .background(
                Capsule().fill(
                    LinearGradient(
                        colors: ctaGradient,
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            )
            .shadow(color: vault.tier.glow.opacity(canOpen && !isClaimed ? 0.45 : 0), radius: 18, y: 8)
        }
        .buttonStyle(.plain)
        .disabled(isClaimed || !canOpen)
        .opacity((isClaimed || !canOpen) ? 0.7 : 1)
    }

    private var ctaForeground: Color {
        (isClaimed || !canOpen) ? Theme.textMuted : Theme.bg
    }

    private var ctaGradient: [Color] {
        if isClaimed || !canOpen { return [Theme.surface, Theme.border] }
        return vault.tier.gradient
    }

    private var walkCloserLabel: String {
        let m = metersAway
        if m < 1000 { return "WALK \(Int(m))m CLOSER" }
        return String(format: "WALK %.1fkm CLOSER", m / 1000)
    }

    // MARK: - Geofence card

    private var geofenceCard: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(canOpen ? Theme.emerald.opacity(0.18) : Theme.ruby.opacity(0.14))
                    .frame(width: 44, height: 44)
                Image(systemName: canOpen ? "location.fill" : "figure.walk")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(canOpen ? Theme.emerald : Theme.ruby)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(canOpen ? "You're in range" : "Walk closer to unlock")
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.text)
                Text(detailLine)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
        }
        .padding(14)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(canOpen ? Theme.emerald.opacity(0.4) : Theme.border, lineWidth: 1)
        )
    }

    private var detailLine: String {
        let r = Int(radius)
        if canOpen {
            return vault.brandId == nil
                ? "Within the \(r)m vault zone"
                : "At the brand store — inside \(r)m zone"
        }
        let away = metersAway < 1000
            ? "\(Int(metersAway))m away"
            : String(format: "%.1fkm away", metersAway / 1000)
        let req = vault.brandId == nil
            ? "Stand within \(r)m of the landmark"
            : "Must be at the brand's flagship (\(r)m)"
        return "\(away) · \(req)"
    }

    // MARK: - Reward row

    private var rewardRow: some View {
        HStack(spacing: 12) {
            statBlock(
                icon: AnyView(CoinIcon(size: 28)),
                value: "\(reward.coins)",
                label: "Coins",
                tint: Theme.goldBright
            )
            statBlock(
                icon: AnyView(
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(Theme.emerald)
                ),
                value: "\(reward.xp)",
                label: "XP",
                tint: Theme.emerald
            )
        }
    }

    private func statBlock(icon: AnyView, value: String, label: String, tint: Color) -> some View {
        HStack(spacing: 14) {
            icon
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(tint)
                Text(label.uppercased())
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(1.4)
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
        }
        .padding(16)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1)
        )
    }
}
