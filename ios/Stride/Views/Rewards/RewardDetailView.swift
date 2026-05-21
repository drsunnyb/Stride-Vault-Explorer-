import SwiftUI

struct RewardDetailView: View {
    let store: VaultStore
    let reward: Reward
    @Environment(\.dismiss) private var dismiss
    @State private var purchased: Bool = false
    @State private var showError = false

    private var brand: Brand? { AppData.brands.first(where: { $0.id == reward.brandId }) }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Color(.secondarySystemBackground)
                    .frame(height: 220)
                    .overlay {
                        Text(reward.emoji).font(.system(size: 110)).allowsHitTesting(false)
                    }
                    .clipShape(.rect(cornerRadius: 22))
                VStack(alignment: .leading, spacing: 8) {
                    if let brand {
                        Text(brand.short)
                            .font(.system(size: 10, weight: .black)).tracking(1.5)
                            .foregroundStyle(brand.textOnColor)
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(brand.color).clipShape(Capsule())
                    }
                    Text(reward.title)
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.text)
                    Text(reward.blurb)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                    HStack(spacing: 6) {
                        CoinIcon(size: 18)
                        Text("\(reward.cost) coins")
                            .font(.system(size: 18, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.goldBright)
                    }
                    if let stock = reward.stock {
                        Text("\(stock) left in stock")
                            .font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.ruby)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                Spacer(minLength: 20)
            }
        }
        .background(Theme.bg)
        .safeAreaInset(edge: .bottom) {
            Button {
                if store.purchase(reward: reward) {
                    purchased = true
                    Haptics.success()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { dismiss() }
                } else {
                    showError = true
                    Haptics.error()
                }
            } label: {
                Text(purchased ? "REDEEMED ✓" : "REDEEM FOR \(reward.cost) COINS")
                    .font(.system(size: 14, weight: .black, design: .rounded)).tracking(1.4)
                    .foregroundStyle(Theme.bg)
                    .frame(maxWidth: .infinity).frame(height: 56)
                    .background(purchased ? Theme.emerald : Theme.goldBright)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 20).padding(.bottom, 12)
        }
        .alert("Not enough coins", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("You have \(store.coins) coins. Walk more to earn the rest.")
        }
    }
}
