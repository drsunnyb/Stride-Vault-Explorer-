import SwiftUI

struct RewardsView: View {
    let store: VaultStore
    @State private var tab: Tab = .browse
    @State private var rewardSource: RewardSource = .all
    @State private var selectedCategory: Reward.Category? = nil
    @State private var selectedReward: Reward?
    @State private var selectedRaffle: Raffle?
    @State private var selectedChallenge: Challenge?
    @State private var selectedRedemption: Redemption?
    @State private var showPredict = false
    @State private var showTribes = false
    @State private var exchangeBrand: Brand?
    @State private var showPaywall = false
    @State private var showCities = false

    enum Tab: Hashable { case browse, codes, entries }

    /// All / Stride-only / per-brand source filter sitting above category filters.
    enum RewardSource: Hashable {
        case all
        case stride
        case brand(String)
    }

    /// 30-day expiry on redemption codes — mirrors Expo.
    private static let expirySeconds: TimeInterval = 30 * 24 * 60 * 60

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    if onWaitlist { waitlistBanner }
                    tabBar
                    switch tab {
                    case .browse:   browseTab
                    case .codes:    codesTab
                    case .entries:  entriesTab
                    }
                }
                .padding(.bottom, 32)
            }
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("Rewards")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(item: $selectedReward) { r in RewardDetailView(store: store, reward: r) }
            .sheet(item: $selectedRaffle) { r in RaffleDetailView(store: store, raffle: r) }
            .sheet(item: $selectedChallenge) { c in ChallengeDetailView(store: store, challenge: c) }
            .sheet(item: $selectedRedemption) { red in
                if let reward = AppData.rewards.first(where: { $0.id == red.rewardId }) {
                    RewardDetailView(store: store, reward: reward)
                }
            }
            .sheet(isPresented: $showPredict) { PredictView(store: store) }
            .sheet(isPresented: $showTribes) { TribesView(store: store) }
            .sheet(item: $exchangeBrand) { brand in BrandExchangeSheet(store: store, brand: brand) }
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .sheet(isPresented: $showCities) { CitiesView(store: store) }
        }
    }

    // MARK: - Waitlist preview

    private var onWaitlist: Bool {
        if let id = store.homeCityId { return id != Cities.liveId }
        return false
    }

    private var waitlistBanner: some View {
        let city = store.homeCity
        let cityName = city?.name ?? "your city"
        let rank = store.homeCityRank
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "eye.fill").font(.system(size: 10, weight: .bold))
                    Text("PREVIEW MODE").tracking(1.4)
                }
                .font(.system(size: 10, weight: .black, design: .rounded))
                .foregroundStyle(Theme.goldBright)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Theme.goldBright.opacity(0.16))
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Theme.goldBright.opacity(0.5), lineWidth: 1))
                Spacer()
                if let flag = city?.flag { Text(flag).font(.system(size: 24)) }
            }
            Text("Coins are minting in \(cityName) — spending unlocks when your city is live.")
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
                .fixedSize(horizontal: false, vertical: true)
            Text("Browse the catalogue, see exactly what your steps will buy. Codes & raffles activate the moment \(cityName) hits #1 on the waitlist\(rank > 0 ? " (currently #\(rank))" : "").")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Theme.textMuted)
                .fixedSize(horizontal: false, vertical: true)
            VStack(spacing: 10) {
                Button {
                    Haptics.tap(); showPaywall = true
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(Color(red: 26/255, green: 10/255, blue: 0/255))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("SKIP THE LINE WITH STRIDE+")
                                .font(.system(size: 12, weight: .black, design: .rounded)).tracking(1.2)
                                .foregroundStyle(Color(red: 26/255, green: 10/255, blue: 0/255))
                            Text("3× city votes · 1.5× step value · weekly free votes")
                                .font(.system(size: 11, weight: .heavy, design: .rounded))
                                .foregroundStyle(Color(red: 58/255, green: 36/255, blue: 0/255))
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 14).padding(.vertical, 12)
                    .background(Theme.goldBright)
                    .clipShape(.rect(cornerRadius: 14))
                }
                .buttonStyle(.plain)

                Button {
                    Haptics.tap(); showCities = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "bolt.fill")
                        Text("RALLY MY CITY").tracking(1.4)
                    }
                    .font(.system(size: 11, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.emerald)
                    .frame(maxWidth: .infinity).padding(.vertical, 11)
                    .background(Theme.emerald.opacity(0.14))
                    .clipShape(.rect(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.emerald.opacity(0.55), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
            HStack(spacing: 8) {
                footChip(icon: "sparkles", text: "Coins keep minting", tint: Theme.goldBright)
                footChip(icon: "lock.fill", text: "Spend locked until live", tint: Theme.textMuted)
                Spacer(minLength: 0)
            }
        }
        .padding(18)
        .background(
            ZStack {
                Theme.bgElev
                LinearGradient(colors: [Theme.goldBright.opacity(0.18), .clear],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        )
        .clipShape(.rect(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.goldBright.opacity(0.5), lineWidth: 1))
        .padding(.horizontal, 16)
    }

    private func footChip(icon: String, text: String, tint: Color) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.system(size: 9, weight: .bold))
            Text(text)
        }
        .font(.system(size: 10, weight: .heavy, design: .rounded)).tracking(0.4)
        .foregroundStyle(tint)
        .padding(.horizontal, 9).padding(.vertical, 5)
        .background(Color.white.opacity(0.04))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
    }

    // MARK: - Tab bar

    private var claimedCount: Int { store.redemptionHistory.count }
    private var entryCount: Int { store.raffleEntries.values.filter { $0 > 0 }.count }

    private var tabBar: some View {
        HStack(spacing: 4) {
            tabButton(.browse, icon: "ticket.fill", label: "BROWSE", badge: nil)
            tabButton(.codes, icon: "doc.text.fill", label: "CODES", badge: claimedCount)
            tabButton(.entries, icon: "trophy.fill", label: "ENTRIES", badge: entryCount)
        }
        .padding(4)
        .background(Theme.card)
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private func tabButton(_ t: Tab, icon: String, label: String, badge: Int?) -> some View {
        let active = tab == t
        return Button {
            Haptics.tap()
            withAnimation(.snappy) { tab = t }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(active ? Theme.bg : Theme.textMuted)
                Text(label)
                    .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.2)
                    .foregroundStyle(active ? Theme.bg : Theme.textMuted)
                if let b = badge, b > 0 {
                    Text("\(b)")
                        .font(.system(size: 10, weight: .black, design: .rounded))
                        .foregroundStyle(active ? Theme.goldBright : Theme.bg)
                        .padding(.horizontal, 5).padding(.vertical, 2)
                        .background(active ? Theme.bg : Theme.goldBright)
                        .clipShape(Capsule())
                }
            }
            .frame(maxWidth: .infinity).padding(.vertical, 10)
            .background(active ? Theme.goldBright : Color.clear)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Browse tab

    private var browseTab: some View {
        VStack(alignment: .leading, spacing: 22) {
            walletCard
            quickActions
            LiveEventsStrip(events: AppData.liveEvents)
            challengesSection
            rafflesSection
            rewardsSection
        }
    }

    private var walletCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("WALLET")
                .font(.system(size: 11, weight: .black, design: .rounded)).tracking(2)
                .foregroundStyle(Theme.textMuted)
            HStack(alignment: .bottom, spacing: 8) {
                CoinIcon(size: 32)
                Text("\(store.coins)")
                    .font(.system(size: 44, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.goldBright)
                    .contentTransition(.numericText())
                    .monospacedDigit()
                Text("STRIDE")
                    .font(.system(size: 12, weight: .heavy, design: .rounded)).tracking(2)
                    .foregroundStyle(Theme.textMuted)
                    .padding(.bottom, 8)
                Spacer()
            }
            HStack(spacing: 10) {
                ForEach(AppData.brands) { brand in
                    Button {
                        Haptics.tap()
                        exchangeBrand = brand
                    } label: {
                        BrandWalletChip(brand: brand, balance: store.brandCoins[brand.id] ?? 0)
                    }
                    .buttonStyle(.plain)
                }
            }
            HStack(spacing: 6) {
                Image(systemName: "arrow.left.arrow.right").font(.system(size: 10, weight: .black))
                Text("TAP A BRAND TO EXCHANGE COINS")
                    .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.4)
            }
            .foregroundStyle(Theme.textMuted)
            .padding(.top, 2)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            ZStack {
                Theme.bgElev
                LinearGradient(colors: [Theme.goldBright.opacity(0.2), .clear],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        )
        .clipShape(.rect(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.border, lineWidth: 1))
        .padding(.horizontal, 16)
    }

    private var quickActions: some View {
        HStack(spacing: 10) {
            actionPill(icon: "target", label: "PREDICT", tint: Theme.sapphire) { showPredict = true }
            actionPill(icon: "flag.fill", label: "TRIBES", tint: Theme.ruby) { showTribes = true }
        }
        .padding(.horizontal, 16)
    }

    private func actionPill(icon: String, label: String, tint: Color, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap(); action()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 14, weight: .bold))
                Text(label).font(.system(size: 12, weight: .black, design: .rounded)).tracking(1.4)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity).frame(height: 48)
            .background(tint)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private var challengesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader("CHALLENGES", "Stake coins, win bigger.")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(AppData.challenges) { c in
                        Button { selectedChallenge = c } label: {
                            ChallengeCard(challenge: c, joined: store.joinedChallenges.contains(c.id))
                        }.buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private var rafflesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader("RAFFLES", "Drop your coins. Win the prize.")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(AppData.raffles) { r in
                        Button { selectedRaffle = r } label: {
                            RaffleCard(raffle: r, entries: store.raffleEntries[r.id] ?? 0)
                        }.buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private var rewardsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader("REWARDS", "Spend coins on real things.")

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    sourcePill("ALL", tint: Theme.goldBright, active: rewardSource == .all) {
                        rewardSource = .all
                    }
                    sourcePill("STRIDE", tint: Theme.emerald, active: rewardSource == .stride) {
                        rewardSource = .stride
                    }
                    ForEach(AppData.brands) { brand in
                        sourcePill(brand.short, tint: brand.color, active: rewardSource == .brand(brand.id)) {
                            rewardSource = .brand(brand.id)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    categoryPill("All", active: selectedCategory == nil) { selectedCategory = nil }
                    ForEach(Reward.Category.allCases, id: \.self) { cat in
                        categoryPill(cat.rawValue, active: selectedCategory == cat) { selectedCategory = cat }
                    }
                }
                .padding(.horizontal, 16)
            }

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                ForEach(filteredRewards) { r in
                    Button { selectedReward = r } label: {
                        RewardCard(reward: r, owned: store.ownedRewards.contains(r.id))
                    }.buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)

            if filteredRewards.isEmpty {
                Text("No rewards in this filter yet.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Theme.textMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 24)
            }
        }
    }

    private var filteredRewards: [Reward] {
        var pool = AppData.rewards
        switch rewardSource {
        case .all: break
        case .stride: pool = pool.filter { $0.brandId == nil }
        case .brand(let id): pool = pool.filter { $0.brandId == id }
        }
        if let c = selectedCategory { pool = pool.filter { $0.category == c } }
        return pool
    }

    // MARK: - Codes tab

    private var codesTab: some View {
        Group {
            if store.redemptionHistory.isEmpty {
                emptyCard(
                    icon: "doc.text",
                    title: "No claimed codes yet",
                    sub: "Codes you redeem from the rewards catalogue will appear here, ready to show at the till."
                )
            } else {
                VStack(alignment: .leading, spacing: 18) {
                    ForEach(groupedRedemptions, id: \.label) { g in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(g.label)
                                .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.8)
                                .foregroundStyle(Theme.textMuted)
                            ForEach(g.items) { red in
                                Button {
                                    Haptics.tap()
                                    selectedRedemption = red
                                } label: {
                                    ClaimedRow(redemption: red)
                                }.buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 4)
            }
        }
    }

    private var groupedRedemptions: [(label: String, items: [Redemption])] {
        let fmt = DateFormatter()
        fmt.dateFormat = "LLLL yyyy"
        var order: [String] = []
        var dict: [String: [Redemption]] = [:]
        for r in store.redemptionHistory {
            let key = fmt.string(from: r.redeemedAt).uppercased()
            if dict[key] == nil { order.append(key) }
            dict[key, default: []].append(r)
        }
        return order.map { ($0, dict[$0] ?? []) }
    }

    // MARK: - Entries tab

    private var entriesTab: some View {
        Group {
            let entered = AppData.raffles
                .filter { (store.raffleEntries[$0.id] ?? 0) > 0 }
                .sorted { a, b in
                    let aEnded = a.endsAt < store.now
                    let bEnded = b.endsAt < store.now
                    if aEnded != bEnded { return !aEnded }
                    return a.endsAt < b.endsAt
                }
            if entered.isEmpty {
                emptyCard(
                    icon: "trophy",
                    title: "No raffle entries yet",
                    sub: "Spend Stride Coins on a live raffle to enter — more entries means better odds."
                )
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(entered) { r in
                        Button {
                            Haptics.tap()
                            selectedRaffle = r
                        } label: {
                            EntryRow(raffle: r,
                                     now: store.now,
                                     myEntries: store.raffleEntries[r.id] ?? 0)
                        }.buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 4)
            }
        }
    }

    private func emptyCard(icon: String, title: String, sub: String) -> some View {
        VStack(spacing: 10) {
            ZStack {
                Circle().fill(Theme.bgElev)
                    .frame(width: 56, height: 56)
                    .overlay(Circle().stroke(Theme.border, lineWidth: 1))
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(Theme.textMuted)
            }
            .padding(.bottom, 4)
            Text(title)
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Text(sub)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.border, lineWidth: 1))
        .padding(.horizontal, 16)
        .padding(.top, 24)
    }

    // MARK: - Reusable

    private func sectionHeader(_ title: String, _ sub: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.system(size: 13, weight: .black, design: .rounded)).tracking(2).foregroundStyle(Theme.text)
            Text(sub).font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.textMuted)
        }
        .padding(.horizontal, 16)
    }

    private func sourcePill(_ label: String, tint: Color, active: Bool, action: @escaping () -> Void) -> some View {
        Button { Haptics.tap(); withAnimation(.snappy) { action() } } label: {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.4)
                .foregroundStyle(active ? Theme.bg : Theme.text)
                .padding(.horizontal, 14).padding(.vertical, 9)
                .background(active ? tint : Theme.card)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(active ? tint : Theme.border, lineWidth: 1))
        }.buttonStyle(.plain)
    }

    private func categoryPill(_ label: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap(); withAnimation(.snappy) { action() }
        } label: {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .heavy, design: .rounded)).tracking(1.0)
                .foregroundStyle(active ? Theme.bg : Theme.textMuted)
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(active ? Theme.goldBright.opacity(0.9) : Color.clear)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(active ? Theme.goldBright : Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Claimed row

private struct ClaimedRow: View {
    let redemption: Redemption

    private static let expirySeconds: TimeInterval = 30 * 24 * 60 * 60

    var body: some View {
        let reward = AppData.rewards.first(where: { $0.id == redemption.rewardId })
        let brand = AppData.brand(reward?.brandId)
        let expiresAt = redemption.redeemedAt.addingTimeInterval(Self.expirySeconds)
        let expired = Date() > expiresAt
        let daysLeft = max(0, Int(ceil(expiresAt.timeIntervalSinceNow / 86400)))
        let accent = brand?.color ?? Theme.emerald

        let dateFmt: DateFormatter = {
            let f = DateFormatter(); f.dateFormat = "d MMM"; return f
        }()

        return HStack(spacing: 12) {
            ZStack {
                Color(.secondarySystemBackground)
                Text(reward?.emoji ?? "🎟️").font(.system(size: 28)).allowsHitTesting(false)
            }
            .frame(width: 52, height: 52)
            .clipShape(.rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(accent.opacity(0.5), lineWidth: 1))

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    if let brand {
                        Text(brand.short)
                            .font(.system(size: 8, weight: .black, design: .rounded)).tracking(1.2)
                            .foregroundStyle(brand.textOnColor)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(brand.color).clipShape(Capsule())
                    } else {
                        Text("STRIDE")
                            .font(.system(size: 8, weight: .black, design: .rounded)).tracking(1.2)
                            .foregroundStyle(Theme.bg)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Theme.goldBright).clipShape(Capsule())
                    }
                    Spacer()
                    Text(dateFmt.string(from: redemption.redeemedAt))
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundStyle(Theme.textMuted)
                }
                Text(reward?.title ?? "Reward")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .lineLimit(1)
                HStack(spacing: 8) {
                    Text(redemption.code)
                        .font(.system(size: 12, weight: .black, design: .monospaced)).tracking(2)
                        .foregroundStyle(Theme.text)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Theme.bgElev)
                        .clipShape(.rect(cornerRadius: 6))
                        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.border, lineWidth: 1))
                    if expired {
                        statusPill(icon: "clock", label: "EXPIRED", color: Theme.textMuted)
                    } else {
                        statusPill(icon: "checkmark.circle.fill", label: "\(daysLeft)d LEFT", color: Theme.emerald)
                    }
                }
            }
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Theme.textMuted)
        }
        .padding(12)
        .background(
            ZStack {
                Theme.card
                LinearGradient(colors: [accent.opacity(0.18), .clear],
                               startPoint: .leading, endPoint: .trailing)
            }
        )
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(accent.opacity(0.4), lineWidth: 1))
    }

    private func statusPill(icon: String, label: String, color: Color) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon).font(.system(size: 9, weight: .bold))
            Text(label).font(.system(size: 9, weight: .black, design: .rounded)).tracking(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 6).padding(.vertical, 2)
        .background(color.opacity(0.15))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(color.opacity(0.5), lineWidth: 1))
    }
}

// MARK: - Entry row

private struct EntryRow: View {
    let raffle: Raffle
    let now: Date
    let myEntries: Int

    var body: some View {
        let ended = raffle.endsAt < now
        let brand = AppData.brand(raffle.brandId)
        let accent = brand?.color ?? Theme.goldBright
        let totalEntries = raffle.totalEntries + myEntries
        let myOdds: String = {
            guard !ended, totalEntries > 0, myEntries > 0 else { return "" }
            let v = max(1, Int(round(Double(totalEntries) / Double(max(1, myEntries)) / Double(max(1, raffle.winners)))))
            return "1 in \(v)"
        }()

        return HStack(spacing: 12) {
            ZStack {
                Color(.secondarySystemBackground)
                Text(raffle.emoji).font(.system(size: 28)).allowsHitTesting(false)
            }
            .frame(width: 56, height: 56)
            .clipShape(.rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(accent.opacity(0.5), lineWidth: 1))

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    if let brand {
                        Text(brand.short)
                            .font(.system(size: 8, weight: .black, design: .rounded)).tracking(1.2)
                            .foregroundStyle(brand.textOnColor)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(brand.color).clipShape(Capsule())
                    } else {
                        Text("STRIDE")
                            .font(.system(size: 8, weight: .black, design: .rounded)).tracking(1.2)
                            .foregroundStyle(Theme.bg)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Theme.goldBright).clipShape(Capsule())
                    }
                    Spacer()
                    HStack(spacing: 3) {
                        Image(systemName: "hourglass").font(.system(size: 9, weight: .bold))
                        Text(ended ? "DRAWN" : countdown(raffle.endsAt.timeIntervalSince(now)))
                            .font(.system(size: 9, weight: .black, design: .rounded)).tracking(1)
                    }
                    .foregroundStyle(ended ? Theme.textMuted : accent)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Theme.bgElev)
                    .clipShape(.rect(cornerRadius: 4))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(accent.opacity(ended ? 0.2 : 0.6), lineWidth: 1))
                }
                Text(raffle.title)
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .lineLimit(1)
                HStack(spacing: 6) {
                    HStack(spacing: 4) {
                        Image(systemName: "ticket.fill").font(.system(size: 9, weight: .bold))
                        Text("\(myEntries) ENTRIES")
                            .font(.system(size: 10, weight: .black, design: .rounded)).tracking(0.8)
                    }
                    .foregroundStyle(accent)
                    .padding(.horizontal, 6).padding(.vertical, 3)
                    .background(accent.opacity(0.15))
                    .clipShape(.rect(cornerRadius: 4))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(accent.opacity(0.5), lineWidth: 1))

                    HStack(spacing: 4) {
                        Image(systemName: "person.2.fill").font(.system(size: 9, weight: .bold))
                        Text("\(totalEntries)")
                            .font(.system(size: 10, weight: .black, design: .rounded)).tracking(0.8)
                    }
                    .foregroundStyle(Theme.textMuted)
                    .padding(.horizontal, 6).padding(.vertical, 3)
                    .background(Theme.bgElev)
                    .clipShape(.rect(cornerRadius: 4))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.border, lineWidth: 1))

                    if !myOdds.isEmpty {
                        Text(myOdds)
                            .font(.system(size: 10, weight: .black, design: .rounded)).tracking(0.6)
                            .foregroundStyle(Theme.emerald)
                    }
                }
            }
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Theme.textMuted)
        }
        .padding(12)
        .background(
            ZStack {
                Theme.card
                LinearGradient(colors: [accent.opacity(ended ? 0.08 : 0.18), .clear],
                               startPoint: .leading, endPoint: .trailing)
            }
        )
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(
            ended ? Theme.border : accent.opacity(0.5), lineWidth: 1
        ))
    }

    private func countdown(_ ms: TimeInterval) -> String {
        let s = max(0, Int(ms))
        let d = s / 86400
        let h = (s % 86400) / 3600
        let m = (s % 3600) / 60
        if d > 0 { return "\(d)d \(h)h" }
        if h > 0 { return "\(h)h \(m)m" }
        return "\(m)m"
    }
}

// MARK: - Existing browse-row primitives (unchanged)

private struct BrandWalletChip: View {
    let brand: Brand
    let balance: Int
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text(brand.mark).font(.system(size: 12, weight: .black))
                Text(brand.short).font(.system(size: 9, weight: .black, design: .rounded)).tracking(1)
            }
            .foregroundStyle(brand.textOnColor)
            Text("\(balance)")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(brand.textOnColor)
                .monospacedDigit()
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(brand.color)
        .clipShape(.rect(cornerRadius: 10))
    }
}

private struct RewardCard: View {
    let reward: Reward
    let owned: Bool
    var body: some View {
        let brand = AppData.brand(reward.brandId)
        return VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topTrailing) {
                Color(.secondarySystemBackground)
                    .frame(height: 100)
                    .overlay {
                        Text(reward.emoji).font(.system(size: 50)).allowsHitTesting(false)
                    }
                if owned {
                    Text("OWNED")
                        .font(.system(size: 9, weight: .black)).tracking(1)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6).padding(.vertical, 3)
                        .background(Theme.emerald).clipShape(Capsule())
                        .padding(8)
                } else if let brand {
                    Text(brand.short)
                        .font(.system(size: 9, weight: .black)).tracking(1)
                        .foregroundStyle(brand.textOnColor)
                        .padding(.horizontal, 6).padding(.vertical, 3)
                        .background(brand.color).clipShape(Capsule())
                        .padding(8)
                }
            }
            .clipShape(.rect(cornerRadius: 14))
            Text(reward.title).font(.system(size: 13, weight: .black, design: .rounded)).foregroundStyle(Theme.text).lineLimit(2)
            HStack(spacing: 4) {
                CoinIcon(size: 12)
                Text("\(reward.cost)").font(.system(size: 12, weight: .heavy, design: .rounded))
                    .foregroundStyle(brand?.color ?? Theme.goldBright)
            }
        }
        .padding(10)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
    }
}

private struct RaffleCard: View {
    let raffle: Raffle
    let entries: Int
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(raffle.emoji).font(.system(size: 36))
                Spacer()
                if raffle.plusOnly {
                    Text("PLUS").font(.system(size: 9, weight: .black)).tracking(1)
                        .foregroundStyle(Theme.bg).padding(.horizontal, 6).padding(.vertical, 3)
                        .background(Theme.goldBright).clipShape(Capsule())
                }
            }
            Text(raffle.title).font(.system(size: 14, weight: .black, design: .rounded)).foregroundStyle(Theme.text).lineLimit(2)
            Text("£\(raffle.prizeValueGbp)").font(.system(size: 12, weight: .heavy)).foregroundStyle(Theme.textMuted)
            HStack(spacing: 4) {
                CoinIcon(size: 12)
                Text("\(raffle.entryCost) / entry").font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.goldBright)
            }
            if entries > 0 {
                Text("\(entries) entries").font(.system(size: 10, weight: .heavy)).foregroundStyle(Theme.emerald)
            }
        }
        .padding(14)
        .frame(width: 200, alignment: .leading)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
    }
}

private struct ChallengeCard: View {
    let challenge: Challenge
    let joined: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(challenge.emoji).font(.system(size: 28))
            Text(challenge.title).font(.system(size: 14, weight: .black, design: .rounded)).foregroundStyle(Theme.text)
            Text(challenge.blurb).font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.textMuted).lineLimit(2)
            HStack(spacing: 4) {
                CoinIcon(size: 12)
                Text("\(challenge.stake) → \(challenge.reward)")
                    .font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.goldBright)
            }
            if joined {
                Text("JOINED").font(.system(size: 9, weight: .black)).tracking(1)
                    .foregroundStyle(Theme.emerald)
            }
        }
        .padding(14)
        .frame(width: 200, alignment: .leading)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
    }
}
