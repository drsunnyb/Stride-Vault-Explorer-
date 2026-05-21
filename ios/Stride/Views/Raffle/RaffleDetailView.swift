import SwiftUI

struct RaffleDetailView: View {
    let store: VaultStore
    let raffle: Raffle
    @Environment(\.dismiss) private var dismiss
    @State private var entries: Int = 1
    @State private var showError = false

    private var brand: Brand? { AppData.brands.first(where: { $0.id == raffle.brandId }) }
    private var totalCost: Int { raffle.entryCost * entries }
    private var myEntries: Int { store.raffleEntries[raffle.id] ?? 0 }

    var body: some View {
        ScrollView {
            // no-op container — paywall trigger handled in .onAppear below
            EmptyView()
            VStack(spacing: 18) {
                Color(.secondarySystemBackground)
                    .frame(height: 220)
                    .overlay {
                        Text(raffle.emoji).font(.system(size: 110)).allowsHitTesting(false)
                    }
                    .clipShape(.rect(cornerRadius: 22))
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        if raffle.plusOnly {
                            Text("PLUS").font(.system(size: 10, weight: .black)).tracking(1.4)
                                .foregroundStyle(Theme.bg)
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .background(Theme.goldBright).clipShape(Capsule())
                        }
                        if let brand {
                            Text(brand.short).font(.system(size: 10, weight: .black)).tracking(1.4)
                                .foregroundStyle(brand.textOnColor)
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .background(brand.color).clipShape(Capsule())
                        }
                    }
                    Text(raffle.title).font(.system(size: 24, weight: .black, design: .rounded)).foregroundStyle(Theme.text)
                    Text(raffle.prize).font(.system(size: 15, weight: .heavy)).foregroundStyle(Theme.textMuted)
                    HStack(spacing: 20) {
                        statBlock("VALUE", "£\(raffle.prizeValueGbp)")
                        statBlock("WINNERS", "\(raffle.winners)")
                        statBlock("TOTAL", "\(raffle.totalEntries + myEntries)")
                    }
                    .padding(.top, 6)
                    Text(timeLeft).font(.system(size: 12, weight: .heavy)).foregroundStyle(Theme.ruby)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)

                // Entry picker
                VStack(spacing: 12) {
                    Text("ENTRIES").font(.system(size: 11, weight: .black)).tracking(1.5).foregroundStyle(Theme.textMuted)
                    HStack(spacing: 14) {
                        stepper(label: "−") { if entries > 1 { entries -= 1 } }
                        Text("\(entries)").font(.system(size: 44, weight: .black, design: .rounded)).foregroundStyle(Theme.text).monospacedDigit().frame(minWidth: 80)
                        stepper(label: "+") { if entries < raffle.maxEntriesPerUser { entries += 1 } }
                    }
                    Text("Max \(raffle.maxEntriesPerUser). You have \(myEntries) entries.")
                        .font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.textDim)
                }
                .padding(.vertical, 12)
            }
        }
        .background(Theme.bg)
        .safeAreaInset(edge: .bottom) {
            Button {
                if store.enterRaffle(raffle, entries: entries) {
                    Haptics.success()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { dismiss() }
                } else {
                    showError = true; Haptics.error()
                }
            } label: {
                HStack(spacing: 6) {
                    CoinIcon(size: 16)
                    Text("ENTER FOR \(totalCost) COINS")
                        .font(.system(size: 14, weight: .black, design: .rounded)).tracking(1.4)
                }
                .foregroundStyle(Theme.bg)
                .frame(maxWidth: .infinity).frame(height: 56)
                .background(Theme.goldBright)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 20).padding(.bottom, 12)
        }
        .alert("Not enough coins", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: { Text("This costs \(totalCost) coins. You have \(store.coins).") }
        .onAppear {
            if raffle.plusOnly { store.requestPaywall(.plusRaffle) }
        }
    }

    private func statBlock(_ label: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 18, weight: .black, design: .rounded)).foregroundStyle(Theme.goldBright)
            Text(label).font(.system(size: 9, weight: .heavy)).tracking(1.2).foregroundStyle(Theme.textDim)
        }
    }

    private func stepper(label: String, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap(); action()
        } label: {
            Text(label)
                .font(.system(size: 30, weight: .black))
                .foregroundStyle(Theme.text)
                .frame(width: 60, height: 60)
                .background(Theme.card).clipShape(Circle())
                .overlay(Circle().stroke(Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var timeLeft: String {
        let interval = raffle.endsAt.timeIntervalSinceNow
        let days = Int(interval) / 86400
        let hours = (Int(interval) % 86400) / 3600
        return "Ends in \(days)d \(hours)h"
    }
}
