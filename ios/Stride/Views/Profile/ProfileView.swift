import SwiftUI

struct ProfileView: View {
    let store: VaultStore
    @State private var showPaywall = false
    @State private var showExchange = false
    @State private var exchangeBrand: Brand?
    @State private var showStepGoal = false
    @State private var showNotifications = false
    @State private var showPrivacy = false
    @State private var showHelp = false
    @State private var showSignOutConfirm = false
    @State private var showTribes = false
    @State private var showSettings = false
    @State private var showCities = false

    private var level: Int { max(1, store.xp / 500 + 1) }
    private var xpInLevel: Int { store.xp % 500 }
    private var xpProgress: Double { Double(xpInLevel) / 500.0 }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                header
                statsGrid
                lifetimeCard
                brandWallets
                nearbyVaultsCard
                plusCard
                achievementsCard
                tribeCard
                cityCard
                settingsList
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Theme.bg)
        .sheet(isPresented: $showPaywall) { PaywallView() }
        .sheet(item: $exchangeBrand) { brand in
            ExchangeSheet(store: store, brand: brand)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showStepGoal) {
            StepGoalSheet(store: store).presentationDetents([.medium])
        }
        .sheet(isPresented: $showNotifications) {
            NotificationsSheet(store: store).presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $showPrivacy) {
            PrivacySheet().presentationDetents([.large])
        }
        .sheet(isPresented: $showHelp) {
            HelpSheet().presentationDetents([.large])
        }
        .sheet(isPresented: $showTribes) {
            TribesView(store: store)
        }
        .sheet(isPresented: $showSettings) {
            SettingsSheet(store: store).presentationDetents([.medium])
        }
        .sheet(isPresented: $showCities) {
            NavigationStack { CitiesView(store: store) }
        }
        .alert("Sign out?", isPresented: $showSignOutConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Sign Out", role: .destructive) { store.signOut() }
        } message: {
            Text("You'll need to sign back in to keep your coins, streak and vaults.")
        }
    }

    private var header: some View {
        VStack(spacing: 14) {
            HStack {
                Spacer()
                Button {
                    Haptics.tap(); showSettings = true
                } label: {
                    Image(systemName: "gearshape.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Theme.textMuted)
                        .frame(width: 36, height: 36)
                        .background(Theme.card)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
            .padding(.top, 8)

            ZStack {
                Circle()
                    .fill(Theme.goldBright.opacity(0.18))
                    .frame(width: 130, height: 130)
                    .blur(radius: 20)
                AvatarView(seed: 42, size: 104, initials: "YOU")
                    .overlay(Circle().stroke(Theme.goldBright, lineWidth: 3))
            }

            VStack(spacing: 4) {
                Text("@you")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                Text("Level \(level) · The Walker")
                    .font(.system(size: 12, weight: .heavy, design: .rounded))
                    .tracking(1.2)
                    .foregroundStyle(Theme.goldBright)
            }

            VStack(spacing: 6) {
                HStack {
                    Text("LEVEL \(level)")
                        .font(.system(size: 10, weight: .heavy, design: .rounded))
                        .tracking(1.2)
                        .foregroundStyle(Theme.textMuted)
                    Spacer()
                    Text("\(xpInLevel) / 500 XP")
                        .font(.system(size: 10, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.textMuted)
                        .monospacedDigit()
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Theme.card)
                        Capsule()
                            .fill(LinearGradient(
                                colors: [Theme.goldBright, Theme.gold],
                                startPoint: .leading, endPoint: .trailing))
                            .frame(width: max(8, geo.size.width * xpProgress))
                    }
                }
                .frame(height: 8)
            }
            .padding(.horizontal, 4)
        }
    }

    private var statsGrid: some View {
        HStack(spacing: 10) {
            StatTile(label: "COINS", value: "\(store.coins)", tint: Theme.goldBright, icon: "circle.hexagonpath.fill")
            StatTile(label: "STREAK", value: "\(store.streak)", tint: Theme.ruby, icon: "flame.fill")
            StatTile(label: "VAULTS", value: "\(store.claimedIDs.count)", tint: Theme.emerald, icon: "lock.open.fill")
        }
    }

    // MARK: - Lifetime steps card

    private var lifetimeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("LIFETIME")
                    .font(.system(size: 10, weight: .heavy, design: .rounded)).tracking(1.4)
                    .foregroundStyle(Theme.textMuted)
                Spacer()
                Image(systemName: "figure.walk.motion").foregroundStyle(Theme.emerald)
            }
            HStack(alignment: .bottom, spacing: 8) {
                Text("\(store.lifetimeSteps.formatted())")
                    .font(.system(size: 32, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .monospacedDigit()
                Text("steps")
                    .font(.system(size: 12, weight: .heavy)).foregroundStyle(Theme.textMuted)
                    .padding(.bottom, 6)
                Spacer()
            }
            HStack(spacing: 12) {
                MiniStat(label: "Today", value: "\(store.todaySteps.formatted())", tint: Theme.goldBright)
                MiniStat(label: "Goal", value: "\(store.stepGoal.formatted())", tint: Theme.emerald)
                MiniStat(label: "Distance", value: distanceLabel, tint: Theme.sapphire)
            }
            // Progress to today's goal
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.bg)
                    Capsule()
                        .fill(LinearGradient(colors: [Theme.emerald, Theme.goldBright],
                                             startPoint: .leading, endPoint: .trailing))
                        .frame(width: max(6, geo.size.width * todayProgress))
                }
            }
            .frame(height: 6)
        }
        .padding(16)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.border, lineWidth: 1))
    }

    private var todayProgress: Double {
        let p = Double(store.todaySteps) / Double(max(1, store.stepGoal))
        return min(1, max(0, p))
    }

    /// Approx distance: 0.762m per step.
    private var distanceLabel: String {
        let km = Double(store.lifetimeSteps) * 0.000762
        return String(format: "%.1fkm", km)
    }

    // MARK: - Brand wallets + Exchange

    private var brandWallets: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("BRAND COINS")
                    .font(.system(size: 10, weight: .heavy, design: .rounded)).tracking(1.4)
                    .foregroundStyle(Theme.textMuted)
                Spacer()
                Text("EXCHANGE")
                    .font(.system(size: 9, weight: .black, design: .rounded)).tracking(1)
                    .foregroundStyle(Theme.textMuted)
            }
            ForEach(AppData.brands) { brand in
                Button { Haptics.tap(); exchangeBrand = brand } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle().fill(brand.color).frame(width: 38, height: 38)
                            Text(brand.mark)
                                .font(.system(size: 18, weight: .black))
                                .foregroundStyle(brand.textOnColor)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(brand.name)
                                .font(.system(size: 14, weight: .heavy, design: .rounded))
                                .foregroundStyle(Theme.text)
                            Text("\(store.claimedCount(forBrand: brand.id)) vaults claimed")
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(Theme.textMuted)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(store.brandCoins[brand.id] ?? 0)")
                                .font(.system(size: 18, weight: .black, design: .rounded))
                                .foregroundStyle(brand.color)
                                .monospacedDigit()
                            Text(brand.short)
                                .font(.system(size: 9, weight: .black, design: .rounded)).tracking(1)
                                .foregroundStyle(Theme.textDim)
                        }
                        Image(systemName: "arrow.left.arrow.right")
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundStyle(Theme.textMuted)
                    }
                    .padding(12)
                    .background(Theme.card)
                    .clipShape(.rect(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(brand.color.opacity(0.3), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Nearby vaults

    private var nearbyVaultsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("NEARBY VAULTS")
                    .font(.system(size: 10, weight: .heavy, design: .rounded)).tracking(1.4)
                    .foregroundStyle(Theme.textMuted)
                Spacer()
                Image(systemName: "location.fill").foregroundStyle(Theme.sapphire)
            }
            ForEach(store.nearbyVaults(limit: 4)) { v in
                HStack(spacing: 12) {
                    let brand = AppData.brand(v.brandId)
                    ZStack {
                        Circle().fill((brand?.color ?? v.tier.color).opacity(0.25)).frame(width: 36, height: 36)
                        Image(systemName: v.symbol).font(.system(size: 14, weight: .heavy))
                            .foregroundStyle(brand?.color ?? v.tier.color)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(v.name)
                                .font(.system(size: 13, weight: .heavy, design: .rounded))
                                .foregroundStyle(Theme.text)
                            if let brand {
                                Text(brand.short)
                                    .font(.system(size: 8, weight: .black, design: .rounded)).tracking(0.8)
                                    .foregroundStyle(brand.textOnColor)
                                    .padding(.horizontal, 4).padding(.vertical, 1)
                                    .background(brand.color)
                                    .clipShape(Capsule())
                            }
                        }
                        Text(v.area).font(.system(size: 10, weight: .medium)).foregroundStyle(Theme.textMuted)
                    }
                    Spacer()
                    Text(store.distanceLabel(to: v))
                        .font(.system(size: 12, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                }
                .padding(.vertical, 6)
            }
        }
        .padding(14)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
    }

    private var plusCard: some View {
        Button {
            Haptics.tap()
            showPaywall = true
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(LinearGradient(colors: [Theme.goldBright, Theme.gold],
                                             startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: 44, height: 44)
                    Image(systemName: "sparkles")
                        .font(.system(size: 18, weight: .black))
                        .foregroundStyle(Theme.bg)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("UPGRADE TO PLUS")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .tracking(1.4)
                        .foregroundStyle(Theme.text)
                    Text("2× coins · branded vaults · ad-free")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(Theme.textMuted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(Theme.textMuted)
            }
            .padding(14)
            .background(
                LinearGradient(colors: [Theme.goldBright.opacity(0.12), Theme.card],
                               startPoint: .leading, endPoint: .trailing)
            )
            .clipShape(.rect(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.goldBright.opacity(0.4), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var achievementsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("ACHIEVEMENTS")
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .tracking(1.6)
                    .foregroundStyle(Theme.textMuted)
                Spacer()
                Text("3 / 24")
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    AchievementBadge(icon: "shoeprints.fill", label: "First Steps", unlocked: true, tint: Theme.emerald)
                    AchievementBadge(icon: "flame.fill", label: "3 Day Streak", unlocked: true, tint: Theme.ruby)
                    AchievementBadge(icon: "crown.fill", label: "Top 100", unlocked: true, tint: Theme.goldBright)
                    AchievementBadge(icon: "moon.stars.fill", label: "Night Owl", unlocked: false, tint: Theme.sapphire)
                    AchievementBadge(icon: "map.fill", label: "Borough Hopper", unlocked: false, tint: Theme.emerald)
                    AchievementBadge(icon: "bolt.fill", label: "Power Hour x10", unlocked: false, tint: Theme.goldBright)
                }
                .padding(.horizontal, 2)
            }
            .contentMargins(.horizontal, 0)
        }
        .padding(16)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.border, lineWidth: 1))
    }

    private var cityCard: some View {
        Button {
            Haptics.tap(); showCities = true
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Theme.goldBright.opacity(0.16)).frame(width: 44, height: 44)
                    Text(store.homeCity?.flag ?? "\u{1F310}")
                        .font(.system(size: 22))
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("YOUR CITY")
                        .font(.system(size: 10, weight: .heavy, design: .rounded)).tracking(1.4)
                        .foregroundStyle(Theme.textMuted)
                    if let home = store.homeCity {
                        Text(home.name)
                            .font(.system(size: 14, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.text)
                        Text(home.id == Cities.liveId
                             ? "Live now · hunt 1,100 vaults"
                             : "Rank #\(store.homeCityRank) on the waitlist")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundStyle(Theme.textMuted)
                    } else {
                        Text("Pick your city")
                            .font(.system(size: 14, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.text)
                        Text("Vote yours to open next")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundStyle(Theme.textMuted)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(Theme.textMuted)
            }
            .padding(14)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var tribeCard: some View {
        Button {
            Haptics.tap(); showTribes = true
        } label: {
            tribeCardContent
        }
        .buttonStyle(.plain)
    }

    private var tribeCardContent: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color(hue: 0.55, saturation: 0.7, brightness: 0.9))
                    .frame(width: 44, height: 44)
                Image(systemName: "person.3.fill")
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("BOROUGHS")
                    .font(.system(size: 12, weight: .heavy, design: .rounded))
                    .tracking(1.4)
                    .foregroundStyle(Theme.text)
                Text("9,088 members · Rank 142")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .heavy))
                .foregroundStyle(Theme.textMuted)
        }
        .padding(14)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
    }

    private var settingsList: some View {
        VStack(spacing: 8) {
            SettingsRow(icon: "bell.fill", label: "Notifications", tint: Theme.goldBright) {
                showNotifications = true
            }
            SettingsRow(icon: "figure.walk", label: "Step Goal", value: "\(store.stepGoal)", tint: Theme.emerald) {
                showStepGoal = true
            }
            SettingsRow(icon: "lock.shield.fill", label: "Privacy", tint: Theme.sapphire) {
                showPrivacy = true
            }
            SettingsRow(icon: "questionmark.circle.fill", label: "Help & Support", tint: Theme.textMuted) {
                showHelp = true
            }
            SettingsRow(icon: "rectangle.portrait.and.arrow.right", label: "Sign Out", tint: Theme.ruby, danger: true) {
                showSignOutConfirm = true
            }
        }
    }
}

// MARK: - Exchange sheet

private struct ExchangeSheet: View {
    let store: VaultStore
    let brand: Brand
    @Environment(\.dismiss) private var dismiss
    @State private var amount: Int = 100

    private var canSubmit: Bool {
        store.coins >= amount && amount >= VaultStore.exchangeRateStrideToBrand
    }

    private var receiveAmount: Int {
        amount / VaultStore.exchangeRateStrideToBrand
    }

    var body: some View {
        VStack(spacing: 18) {
            HStack(spacing: 10) {
                ZStack {
                    Circle().fill(brand.color).frame(width: 44, height: 44)
                    Text(brand.mark).font(.system(size: 22, weight: .black)).foregroundStyle(brand.textOnColor)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("Exchange \(brand.name) Coins")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.text)
                    Text("Rate: \(VaultStore.exchangeRateStrideToBrand) Stride → 1 \(brand.short)")
                        .font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.textMuted)
                }
                Spacer()
            }
            .padding(.top, 8)

            // Amount card
            VStack(spacing: 10) {
                HStack {
                    Text("You pay").font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.textMuted)
                    Spacer()
                    Text("Balance: \(store.coins)")
                        .font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.textMuted)
                }
                HStack(spacing: 8) {
                    Text("\(amount)")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.text)
                        .monospacedDigit()
                    Spacer()
                    Text("STRIDE")
                        .font(.system(size: 13, weight: .black, design: .rounded)).tracking(1.4)
                        .foregroundStyle(Theme.goldBright)
                }
                HStack(spacing: 8) {
                    ForEach([50, 100, 250, 500], id: \.self) { preset in
                        Button { Haptics.tap(); amount = preset } label: {
                            Text("\(preset)")
                                .font(.system(size: 12, weight: .heavy, design: .rounded))
                                .foregroundStyle(amount == preset ? Theme.bg : Theme.text)
                                .frame(maxWidth: .infinity).frame(height: 36)
                                .background(amount == preset ? Theme.goldBright : Theme.card)
                                .clipShape(Capsule())
                        }.buttonStyle(.plain)
                    }
                }
            }
            .padding(14).background(Theme.card).clipShape(.rect(cornerRadius: 14))

            HStack {
                Text("You receive").font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.textMuted)
                Spacer()
                Text("\(receiveAmount) \(brand.short)")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundStyle(brand.color)
                    .monospacedDigit()
            }

            HStack(spacing: 6) {
                Image(systemName: "lock.fill").font(.system(size: 10))
                Text("\(brand.short) coins only spend on \(brand.name) rewards")
                    .font(.system(size: 11, weight: .heavy))
            }
            .foregroundStyle(brand.bright)

            Button {
                let ok = store.exchangeStrideToBrand(brand.id, strideAmount: amount)
                if ok { dismiss() }
            } label: {
                Text("EXCHANGE")
                    .font(.system(size: 14, weight: .black, design: .rounded)).tracking(1.6)
                    .foregroundStyle(canSubmit ? Theme.bg : Theme.textDim)
                    .frame(maxWidth: .infinity).frame(height: 52)
                    .background(canSubmit ? brand.color : Theme.card)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(!canSubmit)

            Spacer()
        }
        .padding(.horizontal, 20)
        .background(Theme.bg.ignoresSafeArea())
    }

}

private struct MiniStat: View {
    let label: String
    let value: String
    let tint: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.system(size: 9, weight: .black, design: .rounded)).tracking(1)
                .foregroundStyle(Theme.textDim)
            Text(value)
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundStyle(tint)
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct StatTile: View {
    let label: String
    let value: String
    let tint: Color
    let icon: String
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(tint)
            Text(value)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
                .monospacedDigit()
                .contentTransition(.numericText())
            Text(label)
                .font(.system(size: 10, weight: .heavy, design: .rounded))
                .tracking(1.2)
                .foregroundStyle(Theme.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
    }
}

private struct AchievementBadge: View {
    let icon: String
    let label: String
    let unlocked: Bool
    let tint: Color
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(unlocked ? tint.opacity(0.18) : Theme.bg)
                    .frame(width: 64, height: 64)
                Circle()
                    .stroke(unlocked ? tint : Theme.border, lineWidth: 1.5)
                    .frame(width: 64, height: 64)
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundStyle(unlocked ? tint : Theme.textDim)
                if !unlocked {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(Theme.textMuted)
                        .padding(4)
                        .background(Theme.bg)
                        .clipShape(Circle())
                        .offset(x: 22, y: 22)
                }
            }
            Text(label)
                .font(.system(size: 10, weight: .heavy, design: .rounded))
                .foregroundStyle(unlocked ? Theme.text : Theme.textMuted)
                .frame(width: 80)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
    }
}

// MARK: - Settings sheets

private struct StepGoalSheet: View {
    let store: VaultStore
    @Environment(\.dismiss) private var dismiss
    @State private var draft: Int = 8000
    private let options: [Int] = [3000, 5000, 8000, 10000, 15000]

    var body: some View {
        VStack(spacing: 18) {
            Capsule().fill(Theme.border).frame(width: 36, height: 4).padding(.top, 8)
            Text("DAILY STEP GOAL")
                .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.6)
                .foregroundStyle(Theme.textMuted)
            Text("\(draft)")
                .font(.system(size: 56, weight: .black, design: .rounded))
                .foregroundStyle(Theme.emerald)
                .monospacedDigit()
                .contentTransition(.numericText())
            Text("Most walkers pick 8,000").font(.system(size: 12, weight: .medium)).foregroundStyle(Theme.textMuted)
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { opt in
                    Button {
                        Haptics.tap(); withAnimation(.snappy) { draft = opt }
                    } label: {
                        Text("\(opt / 1000)k")
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .foregroundStyle(draft == opt ? Theme.bg : Theme.text)
                            .frame(maxWidth: .infinity).frame(height: 44)
                            .background(draft == opt ? Theme.emerald : Theme.card)
                            .clipShape(Capsule())
                    }.buttonStyle(.plain)
                }
            }
            Button {
                Haptics.tap(); store.setStepGoal(draft); dismiss()
            } label: {
                Text("SAVE")
                    .font(.system(size: 14, weight: .black, design: .rounded)).tracking(1.6)
                    .foregroundStyle(Theme.bg)
                    .frame(maxWidth: .infinity).frame(height: 52)
                    .background(Theme.goldBright).clipShape(Capsule())
            }.buttonStyle(.plain)
            Spacer()
        }
        .padding(.horizontal, 20)
        .background(Theme.bg.ignoresSafeArea())
        .onAppear { draft = store.stepGoal }
    }
}

private struct NotificationsSheet: View {
    let store: VaultStore
    @Environment(\.dismiss) private var dismiss
    @State private var enabled: Bool = false
    @State private var working = false
    @State private var testSent = false

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Capsule().fill(Theme.border).frame(width: 36, height: 4)
                .frame(maxWidth: .infinity).padding(.top, 8)
            Text("NOTIFICATIONS")
                .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.6)
                .foregroundStyle(Theme.textMuted)
            Text("Stay in the loop on drops, streaks and Power Hours.")
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.text)

            VStack(spacing: 10) {
                infoRow("flame.fill", "Streak warnings", "10pm if you haven't walked yet")
                infoRow("bolt.fill", "Power Hour", "30 min before 2× kicks in")
                infoRow("sparkles", "Hot Vaults", "6am daily drop")
                infoRow("trophy.fill", "Raffles & predictions", "When they end")
            }

            Button {
                Task {
                    Haptics.tap(); working = true
                    if enabled {
                        store.disableNotifications(); enabled = false
                    } else {
                        let ok = await store.enableNotifications(); enabled = ok
                    }
                    working = false
                }
            } label: {
                Text(enabled ? "TURN OFF" : "ENABLE NOTIFICATIONS")
                    .font(.system(size: 14, weight: .black, design: .rounded)).tracking(1.6)
                    .foregroundStyle(enabled ? Theme.ruby : Theme.bg)
                    .frame(maxWidth: .infinity).frame(height: 52)
                    .background(enabled ? Theme.card : Theme.goldBright)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(enabled ? Theme.ruby.opacity(0.5) : .clear, lineWidth: 1))
            }.buttonStyle(.plain).disabled(working)

            if enabled {
                Button {
                    Task {
                        Haptics.tap()
                        await NotificationService.scheduleTestNotification()
                        withAnimation(.snappy) { testSent = true }
                        try? await Task.sleep(for: .seconds(3))
                        withAnimation(.snappy) { testSent = false }
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: testSent ? "checkmark.circle.fill" : "paperplane.fill")
                            .font(.system(size: 12, weight: .heavy))
                        Text(testSent ? "SENT — BACKGROUND THE APP" : "SEND TEST NOTIFICATION")
                            .font(.system(size: 12, weight: .black, design: .rounded)).tracking(1.4)
                    }
                    .foregroundStyle(testSent ? Theme.emerald : Theme.text)
                    .frame(maxWidth: .infinity).frame(height: 44)
                    .background(Theme.card)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(testSent ? Theme.emerald.opacity(0.5) : Theme.border, lineWidth: 1))
                }.buttonStyle(.plain)
            }

            Text(enabled
                 ? "Test fires in ~5s. Banners only show when the app is backgrounded — swipe home after tapping."
                 : "To change permission later, open iOS Settings → Stride → Notifications.")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
            Spacer()
        }
        .padding(.horizontal, 20)
        .background(Theme.bg.ignoresSafeArea())
        .onAppear { enabled = store.notificationsEnabled }
    }

    private func infoRow(_ icon: String, _ title: String, _ sub: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Theme.goldBright)
                .frame(width: 32, height: 32)
                .background(Theme.goldBright.opacity(0.14))
                .clipShape(.rect(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 13, weight: .heavy, design: .rounded)).foregroundStyle(Theme.text)
                Text(sub).font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.textMuted)
            }
            Spacer()
        }
    }
}

private struct PrivacySheet: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    privacyBlock("Steps stay on your device",
                                 "Your step counts come from the iOS Motion sensor. We only ever upload aggregated daily totals so leaderboards work.")
                    privacyBlock("Location is approximate",
                                 "We use 'when in use' location to check if you're near a vault. Coordinates are rounded to ~150m before leaving the device.")
                    privacyBlock("No selling, ever",
                                 "Stride does not sell your data. Brand partners only see anonymised redemption counts, never individual users.")
                    privacyBlock("Delete anytime",
                                 "Email support@stride.app to delete your account and all associated data within 7 days.")
                }
                .padding(20)
            }
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("Privacy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }.foregroundStyle(Theme.goldBright)
                }
            }
        }
    }
    private func privacyBlock(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.system(size: 15, weight: .black, design: .rounded)).foregroundStyle(Theme.text)
            Text(body).font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.textMuted)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 14))
    }
}

private struct HelpSheet: View {
    @Environment(\.dismiss) private var dismiss
    private let faqs: [(String, String)] = [
        ("Why didn't my steps update?", "Pedometer data refreshes when the app is open. Open Stride at least once a day to record steps from the previous 7 days."),
        ("How do I claim a vault?", "Walk within 50m of the pin on the map, then tap 'Claim'. Vaults respawn every 4–24h depending on tier."),
        ("What is Plus?", "2× coin rate, branded vaults, full streak ladder to 1.75×, exclusive raffles. £4.99/mo or £39/yr with a 7-day free trial."),
        ("Can I cancel anytime?", "Yes — manage your subscription in iOS Settings → Apple ID → Subscriptions."),
        ("Where do brand coins come from?", "Branded vaults pay both Stride coins and that brand's coins. You can also exchange Stride coins into brand coins at 5:1.")
    ]
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(faqs, id: \.0) { q, a in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(q).font(.system(size: 14, weight: .black, design: .rounded)).foregroundStyle(Theme.text)
                            Text(a).font(.system(size: 12, weight: .medium)).foregroundStyle(Theme.textMuted)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.card)
                        .clipShape(.rect(cornerRadius: 14))
                    }
                    Link(destination: URL(string: "mailto:support@stride.app")!) {
                        HStack {
                            Image(systemName: "envelope.fill")
                            Text("Email support@stride.app")
                                .font(.system(size: 13, weight: .heavy, design: .rounded))
                            Spacer()
                            Image(systemName: "chevron.right")
                        }
                        .foregroundStyle(Theme.goldBright)
                        .padding(14)
                        .background(Theme.card)
                        .clipShape(.rect(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.goldBright.opacity(0.4), lineWidth: 1))
                    }
                }
                .padding(20)
            }
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("Help")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }.foregroundStyle(Theme.goldBright)
                }
            }
        }
    }
}

private struct SettingsSheet: View {
    let store: VaultStore
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                row("figure.walk", "Demo walk mode", trailing: AnyView(
                    Toggle("", isOn: Binding(get: { store.demoMode }, set: { store.demoMode = $0 }))
                        .labelsHidden().tint(Theme.emerald)
                ))
                row("info.circle", "App version", trailing: AnyView(
                    Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.textMuted)
                ))
                Spacer()
            }
            .padding(20)
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }.foregroundStyle(Theme.goldBright)
                }
            }
        }
    }
    private func row(_ icon: String, _ label: String, trailing: AnyView) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Theme.goldBright)
                .frame(width: 28, height: 28)
                .background(Theme.goldBright.opacity(0.14))
                .clipShape(.rect(cornerRadius: 8))
            Text(label).font(.system(size: 14, weight: .heavy, design: .rounded)).foregroundStyle(Theme.text)
            Spacer()
            trailing
        }
        .padding(14)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 14))
    }
}

private struct SettingsRow: View {
    let icon: String
    let label: String
    var value: String? = nil
    let tint: Color
    var danger: Bool = false
    var action: () -> Void = {}
    var body: some View {
        Button {
            Haptics.tap(); action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(tint)
                    .frame(width: 28, height: 28)
                    .background(tint.opacity(0.14))
                    .clipShape(.rect(cornerRadius: 8))
                Text(label)
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(danger ? Theme.ruby : Theme.text)
                Spacer()
                if let value {
                    Text(value)
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.textMuted)
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(Theme.textMuted)
            }
            .padding(14)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }
}
