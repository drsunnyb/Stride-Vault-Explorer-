import SwiftUI

struct VaultListView: View {
    let store: VaultStore
    var onSelect: (Vault) -> Void

    @State private var query: String = ""
    @State private var filter: Filter = .all

    enum Filter: String, CaseIterable, Identifiable {
        case all = "All"
        case nearby = "Nearby"
        case unclaimed = "Unclaimed"
        case branded = "Branded"
        case landmark = "Landmarks"
        var id: String { rawValue }
    }

    private var filtered: [Vault] {
        var list = store.vaults
        if !query.isEmpty {
            list = store.search(query)
        }
        switch filter {
        case .all: break
        case .nearby:
            let nearbyIds = Set(store.nearbyVaults(limit: 20).map(\.id))
            list = list.filter { nearbyIds.contains($0.id) }
        case .unclaimed: list = list.filter { !store.isClaimed($0) }
        case .branded: list = list.filter { $0.brandId != nil }
        case .landmark: list = list.filter { $0.brandId == nil }
        }
        return list
    }

    private var sections: [(tier: Tier, vaults: [Vault])] {
        let grouped = Dictionary(grouping: filtered, by: { $0.tier })
        return Tier.allCases.compactMap { tier in
            guard let v = grouped[tier], !v.isEmpty else { return nil }
            return (tier, v)
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 22, pinnedViews: [.sectionHeaders]) {
                searchAndFilters

                if filtered.isEmpty {
                    emptyState
                } else {
                    ForEach(sections, id: \.tier) { section in
                        Section {
                            VStack(spacing: 14) {
                                ForEach(section.vaults) { vault in
                                    VaultRowCard(
                                        vault: vault,
                                        reward: store.reward(for: vault),
                                        isClaimed: store.isClaimed(vault),
                                        distance: store.distanceLabel(to: vault),
                                        onTap: { onSelect(vault) }
                                    )
                                }
                            }
                            .padding(.horizontal, 16)
                        } header: {
                            sectionHeader(for: section.tier, count: section.vaults.count)
                        }
                    }
                }

                Color.clear.frame(height: 24)
            }
            .padding(.top, 12)
        }
        .scrollIndicators(.hidden)
        .background(Theme.bg)
    }

    // MARK: - Header bits

    private var searchAndFilters: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.textMuted)
                TextField("Search vaults, areas, brands", text: $query)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.text)
                    .tint(Theme.goldBright)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                if !query.isEmpty {
                    Button {
                        Haptics.tap()
                        query = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(Theme.textMuted)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .background(Theme.card)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
            .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Filter.allCases) { f in
                        FilterChip(label: f.rawValue, isOn: filter == f) {
                            Haptics.tap()
                            withAnimation(.snappy(duration: 0.25)) { filter = f }
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func sectionHeader(for tier: Tier, count: Int) -> some View {
        HStack(spacing: 10) {
            Circle()
                .fill(LinearGradient(colors: tier.gradient, startPoint: .top, endPoint: .bottom))
                .frame(width: 8, height: 8)
            Text(tier.rawValue.uppercased())
                .font(.system(size: 12, weight: .heavy, design: .rounded))
                .tracking(1.6)
                .foregroundStyle(Theme.text)
            Text("\(count)")
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.textMuted)
                .padding(.horizontal, 7)
                .padding(.vertical, 2)
                .background(Theme.card)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Theme.bg.opacity(0.96))
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "shippingbox")
                .font(.system(size: 36, weight: .regular))
                .foregroundStyle(Theme.textMuted)
            Text("No vaults match")
                .font(.system(size: 16, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.text)
            Text("Try clearing your search or filter.")
                .font(.system(size: 13))
                .foregroundStyle(Theme.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - Filter chip

private struct FilterChip: View {
    let label: String
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .tracking(1.2)
                .foregroundStyle(isOn ? Theme.bg : Theme.text)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(
                    Capsule().fill(isOn ? AnyShapeStyle(Theme.goldBright) : AnyShapeStyle(Theme.card))
                )
                .overlay(Capsule().stroke(isOn ? Color.clear : Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Row card

private struct VaultRowCard: View {
    let vault: Vault
    let reward: VaultReward
    let isClaimed: Bool
    let distance: String?
    let onTap: () -> Void

    var body: some View {
        Button {
            Haptics.tap()
            onTap()
        } label: {
            HStack(spacing: 14) {
                hero
                info
                Spacer(minLength: 0)
                chevron
            }
            .padding(12)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 18))
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(isClaimed ? Theme.emerald.opacity(0.4) : Theme.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var hero: some View {
        Color.black
            .frame(width: 88, height: 88)
            .overlay {
                VaultHeroImage(vault: vault, height: 88, cornerRadius: 0)
                    .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: 14))
            .overlay(alignment: .topLeading) {
                Circle()
                    .fill(LinearGradient(colors: vault.tier.gradient, startPoint: .top, endPoint: .bottom))
                    .frame(width: 10, height: 10)
                    .padding(6)
            }
            .overlay(alignment: .bottomTrailing) {
                if isClaimed {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Theme.emerald)
                        .padding(6)
                        .background(Theme.bg.opacity(0.85), in: Circle())
                        .padding(4)
                }
            }
    }

    private var info: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(vault.name)
                .font(.system(size: 16, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.text)
                .lineLimit(1)

            HStack(spacing: 6) {
                Text(vault.area)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.textMuted)
                if let distance {
                    Text("·")
                        .foregroundStyle(Theme.textMuted)
                    Image(systemName: "location.fill")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Theme.textMuted)
                    Text(distance)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.textMuted)
                }
            }
            .lineLimit(1)

            HStack(spacing: 8) {
                HStack(spacing: 4) {
                    CoinIcon(size: 14)
                    Text("\(reward.coins)")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                }
                Text("·")
                    .foregroundStyle(Theme.textMuted)
                Text("\(reward.xp) XP")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.textMuted)
            }
            .padding(.top, 2)
        }
    }

    private var chevron: some View {
        Image(systemName: "chevron.right")
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(Theme.textMuted)
    }
}
