import SwiftUI
import Combine

/// Stride+ paywall — full feature parity with the Expo plus.tsx screen,
/// rebuilt as a native SwiftUI experience.
struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var plan: PlusPlan = .annual
    @State private var hookIdx: Int = 0
    @State private var shimmerX: CGFloat = -1
    @State private var hookOpacity: Double = 1

    private let hookTimer = Timer.publish(every: 3.0, on: .main, in: .common).autoconnect()

    // MARK: - Plus economy constants (mirrors expo/constants/plus.ts)
    enum PlusEcon {
        static let monthlyGbp: Double = 4.99
        static let annualGbp: Double = 39
        static let annualSavingsPct: Int = 35
        static let payoutBonusPct: Int = 25
        static let freeDailyCap: Int = 10
        static let plusDailyCap: Int = 14
        static let freeBrandFracPct: Int = 35
        static let plusBrandFracPct: Int = 50
        static let respawnFasterPct: Int = 25
        static let welcomeCoins: Int = 1000
        static let earlyAccessHours: Int = 48
    }

    enum PlusPlan: String, Identifiable {
        case annual, monthly
        var id: String { rawValue }
    }

    private struct Hook {
        let icon: String
        let headline: String
        let sub: String
        let tint: Color
    }

    private var hooks: [Hook] {
        [
            Hook(icon: "bitcoinsign.circle.fill",
                 headline: "Earn more on every step",
                 sub: "+\(PlusEcon.payoutBonusPct)% coins on every claim · \(PlusEcon.plusBrandFracPct - PlusEcon.freeBrandFracPct)% bigger brand bonuses",
                 tint: Color(red: 0.957, green: 0.816, blue: 0.247)),
            Hook(icon: "trophy.fill",
                 headline: "Unlock exclusive raffles",
                 sub: "Members-only draws · 1 free entry every week",
                 tint: Color(red: 1.0, green: 0.478, blue: 0.271)),
            Hook(icon: "bolt.fill",
                 headline: "Walk more, claim more",
                 sub: "\(PlusEcon.plusDailyCap) daily vaults · \(PlusEcon.respawnFasterPct)% faster respawn",
                 tint: Color(red: 1.0, green: 0.784, blue: 0.341))
        ]
    }

    private struct Perk: Identifiable {
        let id = UUID()
        let icon: String
        let title: String
        let sub: String
    }

    private var perks: [Perk] {
        [
            Perk(icon: "bitcoinsign.circle.fill",
                 title: "+\(PlusEcon.payoutBonusPct)% coins per vault",
                 sub: "Stacks on top of your Stride Status multiplier"),
            Perk(icon: "sparkles",
                 title: "Daily cap raised to \(PlusEcon.plusDailyCap)",
                 sub: "Free players cap at \(PlusEcon.freeDailyCap) claims/day"),
            Perk(icon: "figure.walk",
                 title: "\(PlusEcon.respawnFasterPct)% faster respawn",
                 sub: "Claimed vaults reopen quicker — more loops per day"),
            Perk(icon: "ticket.fill",
                 title: "1 free raffle entry every week",
                 sub: "On any live raffle, Stride Coins entries only"),
            Perk(icon: "trophy.fill",
                 title: "Members-only raffles",
                 sub: "Exclusive draws normally locked to Platinum+ only"),
            Perk(icon: "flame.fill",
                 title: "1 streak freeze every week",
                 sub: "Miss a day without breaking your run"),
            Perk(icon: "clock.fill",
                 title: "\(PlusEcon.earlyAccessHours)h early access",
                 sub: "New vaults and partner drops, before everyone else"),
            Perk(icon: "crown.fill",
                 title: "+\(PlusEcon.welcomeCoins.formatted()) welcome bonus",
                 sub: "One-time, paid the moment you start")
        ]
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    header
                    Text("WHAT YOU GET")
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .tracking(2)
                        .foregroundStyle(Theme.text)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 20)
                        .padding(.top, 28)
                        .padding(.bottom, 12)

                    perksList

                    Text("CHOOSE A PLAN")
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .tracking(2)
                        .foregroundStyle(Theme.text)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 20)
                        .padding(.top, 28)
                        .padding(.bottom, 12)

                    planRow

                    Text("Renews automatically. Cancel anytime. No refunds for partial periods. Plus perks apply immediately on subscribe — welcome bonus paid once per account.")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(Theme.textDim)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                        .padding(.top, 18)
                        .padding(.bottom, 200)
                }
            }
            .scrollIndicators(.hidden)
            .ignoresSafeArea(edges: .top)

            ctaBar
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.hidden)
        .onReceive(hookTimer) { _ in
            advanceHook()
        }
    }

    // MARK: - Header
    private var header: some View {
        ZStack(alignment: .top) {
            LinearGradient(
                colors: [
                    Color(red: 1.0, green: 0.784, blue: 0.341),
                    Color(red: 1.0, green: 0.478, blue: 0.271),
                    Color(red: 0.102, green: 0.039, blue: 0.0)
                ],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )

            // Sweeping shimmer
            GeometryReader { geo in
                LinearGradient(
                    colors: [.clear, Color.white.opacity(0.55), .clear],
                    startPoint: .leading, endPoint: .trailing
                )
                .frame(width: geo.size.width * 0.55)
                .offset(x: shimmerX * geo.size.width)
                .blendMode(.plusLighter)
                .allowsHitTesting(false)
            }
            .onAppear {
                withAnimation(.easeInOut(duration: 2.6).repeatForever(autoreverses: false)) {
                    shimmerX = 1.2
                }
            }

            VStack(spacing: 0) {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 11, weight: .black))
                        Text("STRIDE+")
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .tracking(1.6)
                    }
                    .foregroundStyle(Color(red: 0.102, green: 0.039, blue: 0.0))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.85))
                    .clipShape(Capsule())

                    Spacer()

                    Button {
                        Haptics.tap()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .heavy))
                            .foregroundStyle(Color(red: 0.102, green: 0.039, blue: 0.0))
                            .frame(width: 34, height: 34)
                            .background(Color.white.opacity(0.85))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 20)
                .padding(.top, 60)

                let hook = hooks[hookIdx]
                VStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(hook.tint.opacity(0.22))
                            .frame(width: 64, height: 64)
                        Image(systemName: hook.icon)
                            .font(.system(size: 26, weight: .black))
                            .foregroundStyle(Color(red: 0.102, green: 0.039, blue: 0.0))
                    }
                    .padding(.bottom, 4)

                    Text(hook.headline)
                        .font(.system(size: 26, weight: .black, design: .rounded))
                        .foregroundStyle(Color(red: 0.039, green: 0.020, blue: 0.0))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 16)

                    Text(hook.sub)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 0.102, green: 0.039, blue: 0.0).opacity(0.78))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)

                    HStack(spacing: 6) {
                        ForEach(0..<hooks.count, id: \.self) { i in
                            Capsule()
                                .fill(i == hookIdx
                                      ? Color(red: 0.102, green: 0.039, blue: 0.0)
                                      : Color(red: 0.102, green: 0.039, blue: 0.0).opacity(0.25))
                                .frame(width: i == hookIdx ? 28 : 18, height: 4)
                                .animation(.snappy, value: hookIdx)
                        }
                    }
                    .padding(.top, 10)
                }
                .opacity(hookOpacity)
                .padding(.top, 28)
                .padding(.bottom, 8)
                .padding(.horizontal, 20)
            }
        }
        .frame(height: 380)
        .clipShape(.rect(bottomLeadingRadius: 24, bottomTrailingRadius: 24))
    }

    private func advanceHook() {
        withAnimation(.easeIn(duration: 0.2)) { hookOpacity = 0 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
            hookIdx = (hookIdx + 1) % hooks.count
            withAnimation(.easeOut(duration: 0.42)) { hookOpacity = 1 }
        }
    }

    // MARK: - Perks
    private var perksList: some View {
        VStack(spacing: 6) {
            ForEach(perks) { perk in
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(Theme.goldBright.opacity(0.13))
                            .overlay(Circle().stroke(Theme.gold.opacity(0.55), lineWidth: 1))
                            .frame(width: 22, height: 22)
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .black))
                            .foregroundStyle(Theme.goldBright)
                    }
                    ZStack {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Theme.surface)
                            .frame(width: 30, height: 30)
                        Image(systemName: perk.icon)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(Theme.goldBright)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(perk.title)
                            .font(.system(size: 14, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.text)
                        Text(perk.sub)
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundStyle(Theme.textDim)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(Theme.card)
                .clipShape(.rect(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Theme.border.opacity(0.7), lineWidth: 1)
                )
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Plan picker
    private var planRow: some View {
        HStack(spacing: 10) {
            planCard(
                planFor: .annual,
                title: "ANNUAL",
                priceMain: "£\(Int(PlusEcon.annualGbp))",
                pricePer: String(format: "£%.2f / mo", PlusEcon.annualGbp / 12),
                badge: "SAVE \(PlusEcon.annualSavingsPct)%",
                highlight: true
            )
            planCard(
                planFor: .monthly,
                title: "MONTHLY",
                priceMain: String(format: "£%.2f", PlusEcon.monthlyGbp),
                pricePer: "per month",
                badge: nil,
                highlight: false
            )
        }
        .padding(.horizontal, 16)
    }

    private func planCard(planFor: PlusPlan,
                          title: String,
                          priceMain: String,
                          pricePer: String,
                          badge: String?,
                          highlight: Bool) -> some View {
        let active = plan == planFor
        return Button {
            Haptics.tap()
            withAnimation(.snappy) { plan = planFor }
        } label: {
            ZStack(alignment: .topTrailing) {
                if highlight {
                    LinearGradient(
                        colors: [Theme.gold.opacity(0.18), .clear],
                        startPoint: .top, endPoint: .bottom
                    )
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .tracking(1.6)
                        .foregroundStyle(active ? Theme.goldBright : Theme.textMuted)
                    Text(priceMain)
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.text)
                        .padding(.top, 4)
                    Text(pricePer)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.textDim)
                    Spacer(minLength: 24)
                    HStack {
                        Spacer()
                        ZStack {
                            Circle()
                                .stroke(active ? Theme.goldBright : Theme.border, lineWidth: 2)
                                .frame(width: 20, height: 20)
                            if active {
                                Circle().fill(Theme.goldBright).frame(width: 20, height: 20)
                                Image(systemName: "checkmark")
                                    .font(.system(size: 10, weight: .black))
                                    .foregroundStyle(Color(red: 0.102, green: 0.039, blue: 0.0))
                            }
                        }
                    }
                }
                .padding(16)

                if let badge {
                    Text(badge)
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .tracking(1.2)
                        .foregroundStyle(Color(red: 0.102, green: 0.039, blue: 0.0))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Theme.gold)
                        .clipShape(.rect(cornerRadius: 4))
                        .padding(10)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 140, alignment: .topLeading)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(active ? Theme.gold : Theme.border.opacity(0.7),
                            lineWidth: active ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Bottom CTA
    private var ctaBar: some View {
        VStack(spacing: 10) {
            Button {
                Haptics.success()
                dismiss()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 16, weight: .black))
                    Text("START STRIDE+ · \(plan == .annual ? "£\(Int(PlusEcon.annualGbp))/yr" : String(format: "£%.2f/mo", PlusEcon.monthlyGbp))")
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .tracking(1.4)
                }
                .foregroundStyle(Color(red: 0.102, green: 0.039, blue: 0.0))
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(
                    LinearGradient(
                        colors: [
                            Color(red: 1.0, green: 0.784, blue: 0.341),
                            Color(red: 1.0, green: 0.478, blue: 0.271)
                        ],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .clipShape(.rect(cornerRadius: 16))
                .shadow(color: Color(red: 1.0, green: 0.553, blue: 0.271).opacity(0.45), radius: 18, y: 10)
            }
            .buttonStyle(.plain)

            HStack(spacing: 8) {
                Button("Restore") { Haptics.tap() }
                Text("·").foregroundStyle(Theme.textDim)
                Button("Terms") { Haptics.tap() }
                Text("·").foregroundStyle(Theme.textDim)
                Button("Privacy") { Haptics.tap() }
            }
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundStyle(Theme.textMuted)
            .padding(.top, 4)
        }
        .padding(.horizontal, 20)
        .padding(.top, 36)
        .padding(.bottom, 28)
        .background(
            LinearGradient(
                colors: [Theme.bg.opacity(0), Theme.bg.opacity(0.96), Theme.bg],
                startPoint: .top, endPoint: .bottom
            )
            .ignoresSafeArea()
        )
    }
}

#Preview {
    PaywallView()
}
