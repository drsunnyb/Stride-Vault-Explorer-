import SwiftUI

struct InventoryView: View {
    let store: VaultStore

    private let tiers: [Tier] = [.bronze, .silver, .gold, .platinum]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    heroCard
                    tierSection
                    collectionSection
                }
                .padding(.bottom, 32)
            }
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("Inventory")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private var heroCard: some View {
        VStack(spacing: 6) {
            Image(systemName: "trophy.fill")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Theme.goldBright)
            Text("\(store.claimedIDs.count) / \(store.vaults.count)")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(Theme.goldBright)
            Text("VAULTS CLAIMED")
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .tracking(1.6).foregroundStyle(Theme.textMuted)
                .padding(.bottom, 10)
            HStack(spacing: 22) {
                statBlock(value: "\(store.totalCoinsEarned)", label: "COINS EARNED", color: Theme.gold)
                Rectangle().fill(Theme.border).frame(width: 1, height: 32)
                statBlock(value: "\(store.totalXpEarned)", label: "XP GAINED", color: Theme.emerald)
            }
        }
        .padding(22)
        .frame(maxWidth: .infinity)
        .background(
            ZStack {
                Theme.bgElev
                LinearGradient(colors: [Theme.goldBright.opacity(0.18), Theme.emerald.opacity(0.1), .clear],
                               startPoint: .top, endPoint: .bottom)
            }
        )
        .clipShape(.rect(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.border, lineWidth: 1))
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private func statBlock(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 20, weight: .black, design: .rounded)).foregroundStyle(color)
            Text(label).font(.system(size: 9, weight: .heavy)).tracking(1.2).foregroundStyle(Theme.textDim)
        }
    }

    private var tierSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("TIER PROGRESS")
                .font(.system(size: 13, weight: .black, design: .rounded)).tracking(2)
                .foregroundStyle(Theme.text)
                .padding(.horizontal, 16).padding(.top, 22)
            HStack(spacing: 8) {
                ForEach(tiers, id: \.self) { tier in
                    tierCard(tier: tier)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func tierCard(tier: Tier) -> some View {
        let total = store.vaults.filter { $0.tier == tier }.count
        let owned = store.vaults.filter { $0.tier == tier && store.claimedIDs.contains($0.id) }.count
        let pct = total > 0 ? CGFloat(owned) / CGFloat(total) : 0
        return VStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(tier.color.opacity(0.18))
                    .frame(width: 34, height: 34)
                Text("\(owned)").font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(tier.glow)
            }
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(tier.color, lineWidth: 1))
            Text(tier.rawValue.uppercased()).font(.system(size: 9, weight: .black)).tracking(1).foregroundStyle(tier.glow)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.surface).frame(height: 3)
                    Capsule().fill(tier.color).frame(width: geo.size.width * pct, height: 3)
                }
            }.frame(height: 3)
            Text("\(owned) of \(total)").font(.system(size: 10, weight: .heavy)).foregroundStyle(Theme.textDim)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(tier.color.opacity(0.4), lineWidth: 1))
    }

    private var collectionSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("COLLECTION")
                .font(.system(size: 13, weight: .black, design: .rounded)).tracking(2)
                .foregroundStyle(Theme.text)
                .padding(.horizontal, 16).padding(.top, 22)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                ForEach(store.vaults) { v in
                    cell(for: v)
                }
            }
            .padding(.horizontal, 12)
        }
    }

    private func cell(for v: Vault) -> some View {
        let claimed = store.claimedIDs.contains(v.id)
        return VStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 10).fill(Theme.card)
                if claimed {
                    LinearGradient(colors: [v.tier.color.opacity(0.3), .clear],
                                   startPoint: .top, endPoint: .bottom)
                    Text(String(v.name.prefix(1)))
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .foregroundStyle(v.tier.glow)
                } else {
                    Image(systemName: "lock.fill").font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Theme.textDim)
                }
            }
            .frame(height: 90)
            .clipShape(.rect(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(claimed ? v.tier.color.opacity(0.6) : Theme.border, lineWidth: 1))
            Text(v.name).font(.system(size: 11, weight: .bold)).foregroundStyle(Theme.text).lineLimit(1)
            Text(v.tier.rawValue.uppercased()).font(.system(size: 8, weight: .black)).tracking(1).foregroundStyle(v.tier.glow)
        }
        .opacity(claimed ? 1.0 : 0.55)
    }
}
