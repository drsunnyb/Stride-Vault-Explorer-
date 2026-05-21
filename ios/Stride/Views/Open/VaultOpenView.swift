import SwiftUI

/// The EPIC vault opening ceremony.
///
/// Phases:
///   .intro     — vault appears with shimmer, locks
///   .building  — chest shakes, rays form, "TAP TO OPEN" pulses
///   .crack     — flash, lid blows off, coins shower
///   .reveal    — reward card slides up, sparkles continuing
///   .done      — Continue button
struct VaultOpenView: View {
    let vault: Vault
    let onClaim: () -> VaultReward
    let onDone: (VaultReward) -> Void

    @State private var phase: Phase = .intro
    @State private var reward: VaultReward?
    @State private var shake = false
    @State private var lidOpen = false
    @State private var rayRotation: Double = 0
    @State private var burstProgress: Double = 0
    @State private var coinsCounter: Int = 0
    @State private var brandCoinsCounter: Int = 0
    @State private var particles: [CoinParticle] = CoinParticle.burst(count: 32)
    @State private var pressDown = false
    @State private var brandRainActive = false

    enum Phase {
        case intro, building, crack, reveal, done
    }

    private var brand: Brand? { AppData.brand(vault.brandId) }

    var body: some View {
        ZStack {
            background

            rays
                .scaleEffect(rayScale)
                .opacity(rayOpacity)
                .rotationEffect(.degrees(rayRotation))
                .animation(.linear(duration: 18).repeatForever(autoreverses: false), value: rayRotation)

            SparkleField(count: 28)
                .opacity(phase == .intro ? 0 : 1)
                .animation(.easeIn(duration: 0.6), value: phase)

            chestStage

            CoinBurstView(particles: particles, progress: burstProgress)
                .offset(y: -10)
                .opacity(phase == .crack || phase == .reveal || phase == .done ? 1 : 0)

            // Branded particle rain — Nike trainers, Apple logos, Lulu leaves
            if let brandId = vault.brandId {
                BrandedRain(brandId: brandId, isActive: brandRainActive)
            }

            if let reward, phase == .reveal || phase == .done {
                RewardCard(
                    vault: vault,
                    brand: brand,
                    reward: reward,
                    coinsDisplay: coinsCounter,
                    brandCoinsDisplay: brandCoinsCounter,
                    onDone: { onDone(reward) }
                )
                .transition(.scale(scale: 0.6).combined(with: .opacity).combined(with: .move(edge: .bottom)))
            }
        }
        .preferredColorScheme(.dark)
        .onAppear { startIntro() }
    }

    // MARK: - Background

    private var background: some View {
        ZStack {
            LinearGradient(
                colors: [Theme.bg, Color.black],
                startPoint: .top,
                endPoint: .bottom
            )
            // Brand-tinted glow if branded; otherwise tier-coloured
            RadialGradient(
                colors: [(brand?.color ?? vault.tier.color).opacity(rayOpacity * 0.55), .clear],
                center: .center,
                startRadius: 20,
                endRadius: 380
            )
        }
        .ignoresSafeArea()
    }

    // MARK: - Rays

    private var rays: some View {
        let rayColor = brand?.bright ?? vault.tier.glow
        return ZStack {
            ForEach(0..<12, id: \.self) { i in
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [rayColor.opacity(0.0), rayColor.opacity(0.55), .clear],
                            startPoint: .center,
                            endPoint: .top
                        )
                    )
                    .frame(width: 90, height: 700)
                    .blendMode(.plusLighter)
                    .rotationEffect(.degrees(Double(i) * 30))
            }
        }
    }

    private var rayScale: CGFloat {
        switch phase {
        case .intro: 0.6
        case .building: 1.0
        case .crack: 1.4
        case .reveal, .done: 1.2
        }
    }

    private var rayOpacity: Double {
        switch phase {
        case .intro: 0.2
        case .building: 0.55
        case .crack: 1.0
        case .reveal, .done: 0.7
        }
    }

    // MARK: - Chest

    private var chestStage: some View {
        VStack(spacing: 20) {
            Spacer()

            ZStack {
                Ellipse()
                    .fill((brand?.color ?? vault.tier.glow).opacity(0.55))
                    .frame(width: 280, height: 60)
                    .blur(radius: 30)
                    .offset(y: 130)

                ChestView(
                    tier: vault.tier,
                    lidOpen: lidOpen,
                    shake: shake
                )
                .scaleEffect(chestScale)
                .rotation3DEffect(
                    .degrees(phase == .crack || phase == .reveal ? 6 : 0),
                    axis: (x: 1, y: 0, z: 0),
                    anchor: .bottom,
                    perspective: 0.4
                )

                if let brand, phase == .intro || phase == .building {
                    Text(brand.short)
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .tracking(2)
                        .foregroundStyle(brand.textOnColor)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(brand.color)
                        .clipShape(Capsule())
                        .offset(y: -80)
                        .scaleEffect(chestScale)
                }
            }
            .frame(height: 320)
            .onTapGesture {
                if phase == .building { triggerOpen() }
            }
            .scaleEffect(pressDown ? 0.96 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.6), value: pressDown)

            if phase == .building {
                Text(brand == nil ? "TAP THE VAULT" : "TAP TO UNLOCK \(brand!.short)")
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                    .tracking(3)
                    .foregroundStyle(brand?.bright ?? vault.tier.glow)
                    .shadow(color: (brand?.color ?? vault.tier.glow).opacity(0.6), radius: 8)
                    .symbolEffect(.pulse)
                    .transition(.opacity)
            }

            Spacer()
        }
    }

    private var chestScale: CGFloat {
        switch phase {
        case .intro: 0.5
        case .building: 1.0
        case .crack: 1.15
        case .reveal, .done: 0.55
        }
    }

    // MARK: - Phase machine

    private func startIntro() {
        rayRotation = 360
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            withAnimation(.spring(response: 0.7, dampingFraction: 0.55)) {
                phase = .building
            }
            Haptics.soft()
            startShakeLoop()
        }
    }

    private func startShakeLoop() {
        guard phase == .building else { return }
        withAnimation(.spring(response: 0.18, dampingFraction: 0.3)) {
            shake.toggle()
        } completion: {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                if phase == .building { startShakeLoop() }
            }
        }
    }

    private func triggerOpen() {
        let r = onClaim()
        reward = r
        Haptics.heavy()

        pressDown = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
            pressDown = false

            withAnimation(.spring(response: 0.35, dampingFraction: 0.55)) {
                phase = .crack
                lidOpen = true
            }
            Haptics.success()

            // Trigger branded rain at the moment of opening
            if vault.brandId != nil {
                brandRainActive = true
            }

            withAnimation(.linear(duration: 1.4)) {
                burstProgress = 1.0
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                withAnimation(.spring(response: 0.55, dampingFraction: 0.7)) {
                    phase = .reveal
                }
                animateCoinCounter(to: r.coins, target: \.coinsCounter)
                if r.brandCoins > 0 {
                    animateCoinCounter(to: r.brandCoins, target: \.brandCoinsCounter, delay: 0.3)
                }
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                withAnimation(.smooth) { phase = .done }
            }
        }
    }

    private func animateCoinCounter(to target: Int, target keyPath: ReferenceWritableKeyPath<VaultOpenView, Int>? = nil, delay: Double = 0) {
        // Note: SwiftUI can't write to a struct via keypath; we just animate both counters explicitly
        let steps = 28
        let stepDuration: Double = 0.04
        for i in 1...steps {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay + Double(i) * stepDuration) {
                let progress = Double(i) / Double(steps)
                let eased = 1 - pow(1 - progress, 3)
                let v = Int(Double(target) * eased)
                if keyPath == nil {
                    coinsCounter = i == steps ? target : v
                } else {
                    brandCoinsCounter = i == steps ? target : v
                }
                if i % 4 == 0 { Haptics.selection() }
            }
        }
    }
}

// MARK: - Reward Card

private struct RewardCard: View {
    let vault: Vault
    let brand: Brand?
    let reward: VaultReward
    let coinsDisplay: Int
    let brandCoinsDisplay: Int
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Spacer()

            VStack(spacing: 14) {
                if let brand {
                    HStack(spacing: 6) {
                        Text(brand.mark).font(.system(size: 12, weight: .black))
                        Text(brand.name.uppercased()).font(.system(size: 11, weight: .black, design: .rounded)).tracking(2)
                    }
                    .foregroundStyle(brand.textOnColor)
                    .padding(.horizontal, 12).padding(.vertical, 5)
                    .background(brand.color)
                    .clipShape(Capsule())
                } else {
                    TierBadge(tier: vault.tier)
                }

                Text("VAULT CLAIMED")
                    .font(.system(size: 12, weight: .heavy, design: .rounded))
                    .tracking(3)
                    .foregroundStyle(Theme.textMuted)

                Text(vault.name)
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .multilineTextAlignment(.center)

                HStack(spacing: 12) {
                    CoinIcon(size: 38)
                    Text("\(coinsDisplay)")
                        .font(.system(size: 56, weight: .black, design: .rounded))
                        .foregroundStyle(
                            LinearGradient(colors: [Theme.goldBright, Theme.gold], startPoint: .top, endPoint: .bottom)
                        )
                        .contentTransition(.numericText())
                        .monospacedDigit()
                }
                .padding(.top, 4)

                if let brand, reward.brandCoins > 0 {
                    HStack(spacing: 8) {
                        Text(brand.mark).font(.system(size: 16, weight: .black))
                        Text("+\(brandCoinsDisplay) \(brand.short)")
                            .font(.system(size: 17, weight: .black, design: .rounded))
                            .monospacedDigit()
                            .contentTransition(.numericText())
                    }
                    .foregroundStyle(brand.textOnColor)
                    .padding(.horizontal, 14).padding(.vertical, 7)
                    .background(brand.color)
                    .clipShape(Capsule())
                }

                Text("+\(reward.xp) XP")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.emerald)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Theme.emerald.opacity(0.15)))
                    .overlay(Capsule().stroke(Theme.emerald.opacity(0.3), lineWidth: 1))
            }
            .padding(.vertical, 26)
            .padding(.horizontal, 28)
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    colors: [Theme.card, Theme.bgElev],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke((brand?.color ?? vault.tier.color).opacity(0.5), lineWidth: 1)
            )
            .clipShape(.rect(cornerRadius: 24))
            .shadow(color: (brand?.color ?? vault.tier.glow).opacity(0.35), radius: 30, y: 12)
            .padding(.horizontal, 24)

            Button(action: {
                Haptics.tap()
                onDone()
            }) {
                Text("CONTINUE")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .tracking(2)
                    .foregroundStyle(Theme.bg)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(
                        Capsule().fill(
                            LinearGradient(colors: [Theme.goldBright, Theme.gold], startPoint: .top, endPoint: .bottom)
                        )
                    )
                    .shadow(color: Theme.gold.opacity(0.45), radius: 16, y: 8)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }
}
