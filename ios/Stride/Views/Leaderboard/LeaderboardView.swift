import SwiftUI

struct LeaderboardView: View {
    let store: VaultStore
    @State private var scope: LeaderboardScope = .global
    @State private var period: LeaderboardPeriod = .week
    /// nil → Stride global. Otherwise brand id.
    @State private var brandFilter: String? = nil

    private var brand: Brand? { AppData.brand(brandFilter) }

    private var ladder: [Player] {
        if scope == .friends {
            return AppData.friends.map {
                Player(id: $0.id, handle: $0.handle, name: $0.name, avatarSeed: $0.avatarSeed,
                       coins: $0.coinsThisWeek, streak: 0, tribe: "Friends")
            }.sorted { $0.coins > $1.coins }
        }
        return AppData.ladder(forBrand: brandFilter, period: period)
    }

    private var podium: [Player] { Array(ladder.prefix(3)) }
    private var rest: [Player] { Array(ladder.dropFirst(3)) }

    private var accent: Color { brand?.color ?? Theme.goldBright }
    private var accentBright: Color { brand?.bright ?? Theme.goldBright }
    private var coinsLabel: String { brand?.short ?? "COINS" }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                header
                brandPicker
                periodTabs
                scopeToggle
                brandBanner
                podiumView
                resetsCountdown
                prizesCard
                rankList
                yourRank
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Theme.bg)
        .animation(.snappy, value: brandFilter)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("LADDER")
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .tracking(2.4)
                    .foregroundStyle(Theme.textMuted)
                Text(brand == nil ? "Climb the ranks" : "\(brand!.name) Ladder")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
            }
            Spacer()
            Image(systemName: "trophy.fill")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(accentBright)
        }
        .padding(.top, 8)
    }

    /// Horizontal pill row — STRIDE (global) + one per brand.
    private var brandPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                BrandPill(label: "STRIDE", tint: Theme.goldBright, active: brandFilter == nil) {
                    withAnimation(.snappy) { brandFilter = nil }
                }
                ForEach(AppData.brands) { brand in
                    BrandPill(label: brand.short, tint: brand.color, active: brandFilter == brand.id) {
                        withAnimation(.snappy) { brandFilter = brand.id }
                    }
                }
            }
        }
        .scrollClipDisabled()
    }

    private var periodTabs: some View {
        HStack(spacing: 8) {
            ForEach(LeaderboardPeriod.allCases, id: \.self) { p in
                Button {
                    Haptics.tap()
                    withAnimation(.snappy) { period = p }
                } label: {
                    Text(p.rawValue.uppercased())
                        .font(.system(size: 12, weight: .heavy, design: .rounded))
                        .tracking(1.4)
                        .foregroundStyle(period == p ? Theme.bg : Theme.textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                        .background(period == p ? accentBright : Theme.card)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var scopeToggle: some View {
        HStack(spacing: 4) {
            ForEach(LeaderboardScope.allCases, id: \.self) { s in
                Button {
                    Haptics.tap()
                    withAnimation(.snappy) { scope = s }
                } label: {
                    Text(s.rawValue.uppercased())
                        .font(.system(size: 11, weight: .heavy, design: .rounded))
                        .tracking(1.2)
                        .foregroundStyle(scope == s ? Theme.text : Theme.textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 32)
                        .background(scope == s ? Theme.surface : Color.clear)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(Theme.card)
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
    }

    @ViewBuilder
    private var brandBanner: some View {
        if let brand {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(brand.color).frame(width: 36, height: 36)
                    Text(brand.mark).font(.system(size: 18, weight: .black)).foregroundStyle(brand.textOnColor)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(brand.name) walkers only")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.text)
                    Text(brand.tagline)
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(Theme.textMuted)
                        .lineLimit(2)
                }
                Spacer()
            }
            .padding(12)
            .background(LinearGradient(colors: [brand.color.opacity(0.18), Theme.card],
                                       startPoint: .leading, endPoint: .trailing))
            .clipShape(.rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(brand.color.opacity(0.4), lineWidth: 1))
        }
    }

    private var podiumView: some View {
        HStack(alignment: .bottom, spacing: 10) {
            if podium.count >= 2 { PodiumColumn(player: podium[1], rank: 2, height: 110, accent: accentBright) }
            if podium.count >= 1 { PodiumColumn(player: podium[0], rank: 1, height: 140, accent: accentBright) }
            if podium.count >= 3 { PodiumColumn(player: podium[2], rank: 3, height: 90, accent: accentBright) }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .id("\(brandFilter ?? "stride")-\(period.rawValue)-\(scope.rawValue)")
        .transition(.opacity)
    }

    private var resetsCountdown: some View {
        HStack(spacing: 8) {
            Image(systemName: "clock.fill").font(.system(size: 12, weight: .bold))
            Text(period.resetsIn.uppercased())
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .tracking(1.2)
        }
        .foregroundStyle(Theme.textMuted)
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(Theme.card)
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
    }

    private var prizesCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(brand == nil ? "WHAT YOU WIN" : "\(brand!.name.uppercased()) PERKS")
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .tracking(1.6)
                    .foregroundStyle(Theme.textMuted)
                Spacer()
                Image(systemName: "gift.fill").foregroundStyle(accentBright)
            }

            if let brand {
                PrizeRow(rank: "Champ", tint: brand.color, reward: "1,500 \(brand.short) coins + exclusive drop")
                PrizeRow(rank: "Podium", tint: brand.bright, reward: "750 \(brand.short) coins + early access")
                PrizeRow(rank: "Top 10", tint: Theme.sapphire, reward: "300 \(brand.short) coins")
                PrizeRow(rank: "Top 50", tint: Theme.emerald, reward: "100 \(brand.short) coins")
                Text("Redeemable only at \(brand.name) partners.")
                    .font(.system(size: 10, weight: .medium)).foregroundStyle(Theme.textDim)
            } else {
                PrizeRow(rank: "1st", tint: Theme.goldBright, reward: "5,000 coins · 10 raffle entries · 1.5× next period")
                PrizeRow(rank: "2nd", tint: Color(red: 0.78, green: 0.80, blue: 0.85), reward: "2,500 coins · 5 raffle entries")
                PrizeRow(rank: "3rd", tint: Color(red: 0.80, green: 0.49, blue: 0.19), reward: "1,000 coins · 3 raffle entries")
                PrizeRow(rank: "Top 10", tint: Theme.sapphire, reward: "500 coins")
                PrizeRow(rank: "Top 50", tint: Theme.emerald, reward: "150 coins")
            }
        }
        .padding(16)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.border, lineWidth: 1))
    }

    private var rankList: some View {
        VStack(spacing: 8) {
            ForEach(Array(rest.enumerated()), id: \.element.id) { idx, player in
                LadderRow(rank: idx + 4, player: player, leader: ladder.first?.coins ?? 0,
                          accent: accentBright, coinsLabel: coinsLabel)
            }
        }
    }

    private var yourRank: some View {
        HStack(spacing: 12) {
            Text("#142")
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.text)
                .frame(width: 52, alignment: .leading)
            AvatarView(seed: 42, size: 36, initials: "YOU")
            VStack(alignment: .leading, spacing: 2) {
                Text("You")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.text)
                Text("4,200 to climb")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
            HStack(spacing: 4) {
                CoinIcon(size: 14)
                Text(brandFilter == nil ? "\(store.coins)" : "\(store.brandCoins[brandFilter!] ?? 0)")
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(accentBright)
                    .monospacedDigit()
            }
        }
        .padding(14)
        .background(Theme.surface)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(accentBright.opacity(0.4), lineWidth: 1.5))
    }
}

private struct BrandPill: View {
    let label: String
    let tint: Color
    let active: Bool
    let action: () -> Void
    var body: some View {
        Button { Haptics.tap(); action() } label: {
            Text(label)
                .font(.system(size: 11, weight: .black, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(active ? Theme.bg : Theme.text)
                .padding(.horizontal, 14).padding(.vertical, 9)
                .background(active ? tint : Theme.card)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(active ? tint : Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

private struct PodiumColumn: View {
    let player: Player
    let rank: Int
    let height: CGFloat
    let accent: Color
    @State private var shimmer = false

    private var tint: Color {
        switch rank {
        case 1: accent
        case 2: Color(red: 0.78, green: 0.80, blue: 0.85)
        default: Color(red: 0.80, green: 0.49, blue: 0.19)
        }
    }

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(tint.opacity(0.18))
                    .frame(width: rank == 1 ? 74 : 60, height: rank == 1 ? 74 : 60)
                    .blur(radius: 14)
                AvatarView(
                    seed: player.avatarSeed,
                    size: rank == 1 ? 64 : 52,
                    initials: String(player.name.prefix(2)).uppercased()
                )
                .overlay(alignment: .topTrailing) {
                    if rank == 1 {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 14, weight: .heavy))
                            .foregroundStyle(accent)
                            .padding(4)
                            .background(Theme.bg)
                            .clipShape(Circle())
                            .offset(x: 4, y: -4)
                    }
                }
            }
            Text(player.handle)
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.text)
                .lineLimit(1)
            HStack(spacing: 3) {
                CoinIcon(size: 11)
                Text("\(player.coins)")
                    .font(.system(size: 12, weight: .heavy, design: .rounded))
                    .foregroundStyle(tint)
                    .monospacedDigit()
                    .contentTransition(.numericText())
            }

            ZStack(alignment: .top) {
                LinearGradient(colors: [tint.opacity(0.9), tint.opacity(0.4)],
                               startPoint: .top, endPoint: .bottom)
                if rank == 1 {
                    LinearGradient(colors: [.clear, .white.opacity(0.4), .clear],
                                   startPoint: .leading, endPoint: .trailing)
                        .frame(width: 40)
                        .offset(x: shimmer ? 60 : -60)
                        .blendMode(.plusLighter)
                }
                Text("\(rank)")
                    .font(.system(size: 32, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.bg)
                    .padding(.top, 8)
            }
            .frame(height: height)
            .clipShape(.rect(cornerRadii: .init(topLeading: 10, topTrailing: 10)))
        }
        .frame(maxWidth: .infinity)
        .onAppear {
            if rank == 1 {
                withAnimation(.linear(duration: 2.0).repeatForever(autoreverses: false)) {
                    shimmer = true
                }
            }
        }
    }
}

private struct PrizeRow: View {
    let rank: String
    let tint: Color
    let reward: String
    var body: some View {
        HStack(spacing: 12) {
            Text(rank.uppercased())
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .tracking(1.0)
                .foregroundStyle(tint)
                .frame(width: 60, alignment: .leading)
            Text(reward)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.textMuted)
            Spacer()
        }
    }
}

private struct LadderRow: View {
    let rank: Int
    let player: Player
    let leader: Int
    let accent: Color
    let coinsLabel: String

    private var progress: Double {
        guard leader > 0 else { return 0 }
        return Double(player.coins) / Double(leader)
    }

    var body: some View {
        HStack(spacing: 12) {
            Text("#\(rank)")
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.textMuted)
                .frame(width: 38, alignment: .leading)
                .monospacedDigit()
            AvatarView(seed: player.avatarSeed, size: 36,
                       initials: String(player.name.prefix(2)).uppercased())
            VStack(alignment: .leading, spacing: 4) {
                Text(player.handle)
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.text)
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Theme.bg)
                        Capsule()
                            .fill(LinearGradient(
                                colors: [accent, accent.opacity(0.7)],
                                startPoint: .leading, endPoint: .trailing))
                            .frame(width: geo.size.width * progress)
                    }
                }
                .frame(height: 4)
            }
            VStack(alignment: .trailing, spacing: 1) {
                HStack(spacing: 4) {
                    CoinIcon(size: 12)
                    Text("\(player.coins)")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(accent)
                        .monospacedDigit()
                        .contentTransition(.numericText())
                }
                Text(coinsLabel)
                    .font(.system(size: 8, weight: .black, design: .rounded)).tracking(0.8)
                    .foregroundStyle(Theme.textDim)
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(Theme.card.opacity(0.6))
        .clipShape(.rect(cornerRadius: 14))
    }
}
