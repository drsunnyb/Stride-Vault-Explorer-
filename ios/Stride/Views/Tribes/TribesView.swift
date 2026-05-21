import SwiftUI

struct TribesView: View {
    let store: VaultStore
    @Environment(\.dismiss) private var dismiss

    @State private var claimMessage: String?
    @State private var showClaimAlert = false

    /// Only tribes for the player's home city (+ shared global crews).
    private var visibleBoard: [(tribe: Tribe, coins: Int, isYours: Bool)] {
        let visibleIds = Set(AppData.tribes(forCity: store.homeCityId).map(\.id))
        return store.tribeBoard().filter { visibleIds.contains($0.tribe.id) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    derbyCard
                    redemptionCard
                    claimCard

                    Text("LIVE STANDINGS")
                        .font(.system(size: 12, weight: .black, design: .rounded)).tracking(1.6)
                        .foregroundStyle(Theme.text)
                        .padding(.horizontal, 16).padding(.top, 8)
                    VStack(spacing: 8) {
                        ForEach(Array(visibleBoard.prefix(8).enumerated()), id: \.element.tribe.id) { i, row in
                            standingRow(rank: i + 1, tribe: row.tribe, coins: row.coins, isMine: row.isYours)
                        }
                    }
                    .padding(.horizontal, 16)

                    Text("PICK YOUR TRIBE")
                        .font(.system(size: 12, weight: .black, design: .rounded)).tracking(1.6)
                        .foregroundStyle(Theme.text)
                        .padding(.horizontal, 16).padding(.top, 12)

                    ForEach(AppData.tribesByCategory(forCity: store.homeCityId), id: \.0) { cat, list in
                        categorySection(category: cat, tribes: list)
                    }

                    Text("You can change tribes once a week. Past coins stay where they were earned.")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.textDim)
                        .padding(.horizontal, 16).padding(.top, 8)
                    Spacer(minLength: 40)
                }
                .padding(.top, 12)
            }
            .background(Theme.bg)
            .navigationTitle("Tribes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: { Image(systemName: "xmark").foregroundStyle(Theme.textMuted) }
                }
            }
            .alert("Tribe", isPresented: $showClaimAlert) {
                Button("OK") { showClaimAlert = false }
            } message: {
                Text(claimMessage ?? "")
            }
        }
    }

    // MARK: - Redemption (soft loss consequence)

    @ViewBuilder
    private var redemptionCard: some View {
        if store.tribeLossRedemptionActive, let tribe = store.tribe {
            let tint = Color(hex: tribe.hex)
            HStack(spacing: 10) {
                Image(systemName: "flame.fill")
                    .foregroundStyle(tint)
                VStack(alignment: .leading, spacing: 4) {
                    Text("REDEMPTION WEEK")
                        .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.6)
                        .foregroundStyle(tint)
                    Text("\(tribe.name) lost last week's derby — every claim pays +10% this week to bring it back.")
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundStyle(Theme.text).lineLimit(3)
                }
                Spacer()
            }
            .padding(14)
            .background(tint.opacity(0.14))
            .clipShape(.rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(tint.opacity(0.5), lineWidth: 1))
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Derby

    private var derbyCard: some View {
        Group {
            if let pair = store.derbyPair(),
               let a = AppData.tribe(pair.0), let b = AppData.tribe(pair.1) {
                HStack(spacing: 10) {
                    Image(systemName: "sparkles").foregroundStyle(Theme.ruby)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("DERBY WEEK")
                            .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.6)
                            .foregroundStyle(Theme.ruby)
                        Text("\(a.name) vs \(b.name) — doubled stakes for both fanbases.")
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundStyle(Theme.text).lineLimit(2)
                    }
                    Spacer()
                }
                .padding(14)
                .background(Theme.ruby.opacity(0.14))
                .clipShape(.rect(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.ruby.opacity(0.4), lineWidth: 1))
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: - Claim last week's bonus

    @ViewBuilder
    private var claimCard: some View {
        if let myTribe = AppData.tribe(store.tribeId) {
            Button(action: claim) {
                HStack(spacing: 12) {
                    Image(systemName: "gift.fill")
                        .font(.system(size: 18, weight: .heavy))
                        .foregroundStyle(.white)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("CLAIM LAST WEEK'S TRIBE BONUS")
                            .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.4)
                            .foregroundStyle(.white)
                        Text(myTribe.winReward.headline)
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundStyle(Color.white.opacity(0.92))
                            .multilineTextAlignment(.leading)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                        .foregroundStyle(.white.opacity(0.85))
                }
                .padding(14)
                .background(
                    LinearGradient(colors: [Color(hex: myTribe.hex), Color(hex: myTribe.hex).opacity(0.55)],
                                   startPoint: .leading, endPoint: .trailing)
                )
                .clipShape(.rect(cornerRadius: 14))
                .padding(.horizontal, 16)
            }
            .buttonStyle(.plain)
        }
    }

    private func claim() {
        switch store.claimTribeBonus() {
        case .ok(let reward):
            var msg = "+\(reward.coins) coins"
            if let brand = reward.brandId, reward.brandCoins > 0,
               let b = AppData.brand(brand) {
                msg += " · +\(reward.brandCoins) \(b.short)"
            }
            if let perk = reward.perk { msg += " · \(perk.label)" }
            claimMessage = "Tribe bonus paid · \(msg)"
        case .alreadyClaimed:
            claimMessage = "You already claimed this week's tribe bonus."
        case .didntWin:
            claimMessage = "Your tribe didn't top last week's derby. Walk harder next week."
        case .noTribe:
            claimMessage = "Pick a tribe first."
        }
        showClaimAlert = true
    }

    // MARK: - Standings row

    private func standingRow(rank: Int, tribe: Tribe, coins: Int, isMine: Bool) -> some View {
        Button {
            Haptics.tap(); store.tribeId = tribe.id
        } label: {
            HStack(spacing: 10) {
                Text("#\(rank)")
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(rank == 1 ? Theme.goldBright : Theme.textMuted)
                    .frame(width: 28, alignment: .leading)
                ZStack {
                    Circle().fill(Color(hex: tribe.hex)).frame(width: 32, height: 32)
                    Text(tribe.emoji).font(.system(size: 14))
                }
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(tribe.name).font(.system(size: 13, weight: .heavy)).foregroundStyle(Theme.text)
                        if isMine {
                            Text("· YOUR TRIBE").font(.system(size: 10, weight: .black)).tracking(1).foregroundStyle(Theme.emerald)
                        }
                    }
                    Text(tribe.category.title.capitalized)
                        .font(.system(size: 9, weight: .black, design: .rounded)).tracking(1.2)
                        .foregroundStyle(Color(hex: tribe.hex).opacity(0.95))
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(coins.formatted())
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                    Text("COINS · WK").font(.system(size: 8, weight: .black)).tracking(1.2).foregroundStyle(Theme.textDim)
                }
            }
            .padding(12)
            .background(isMine ? Color(hex: tribe.hex).opacity(0.16) : Theme.card)
            .clipShape(.rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(isMine ? Color(hex: tribe.hex) : Theme.border, lineWidth: isMine ? 1.5 : 1))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Category sections (Football / Run Crew / etc.)

    private func categorySection(category: TribeCategory, tribes: [Tribe]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(category.title)
                    .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.4)
                    .foregroundStyle(Theme.text)
                Text("·").foregroundStyle(Theme.textDim)
                Text(category.caption)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Theme.textMuted)
                Spacer()
            }
            .padding(.horizontal, 16).padding(.top, 6)

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(tribes) { t in
                    Button {
                        Haptics.tap()
                        withAnimation(.snappy) { store.tribeId = t.id }
                    } label: {
                        let mine = store.tribeId == t.id
                        HStack(spacing: 6) {
                            Text(t.emoji).font(.system(size: 14))
                            Text(t.short)
                                .font(.system(size: 11, weight: .black, design: .rounded)).tracking(0.8)
                                .foregroundStyle(mine ? .white : Theme.text)
                                .lineLimit(1)
                        }
                        .padding(.horizontal, 10).padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(mine ? Color(hex: t.hex) : Theme.card)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(mine ? Color(hex: t.hex) : Color(hex: t.hex).opacity(0.5), lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
    }
}
