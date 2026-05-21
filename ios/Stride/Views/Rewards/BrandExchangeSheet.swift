import SwiftUI

/// Sheet for converting Stride coins ↔ a brand's currency (Nike, Apple, Lulu).
/// Mirrors the Expo exchange flow at a 2 Stride : 1 brand-coin rate.
struct BrandExchangeSheet: View {
    @Bindable var store: VaultStore
    let brand: Brand

    @Environment(\.dismiss) private var dismiss
    @State private var amount: Int = 50
    @State private var didFlash = false

    private var rate: Int { VaultStore.exchangeRateStrideToBrand }

    private var fromBalance: Int { store.coins }

    private var receiveAmount: Int { amount / rate }

    private var canExchange: Bool {
        amount > 0 && fromBalance >= amount && receiveAmount > 0
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    header

                    exchangeCard

                    presets

                    rateNote
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .background(Theme.bg)
            .safeAreaInset(edge: .bottom) { ctaBar }
            .navigationTitle("Exchange")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(Theme.textMuted)
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var header: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(brand.color.opacity(0.18))
                    .frame(width: 96, height: 96)
                Text(brand.mark)
                    .font(.system(size: 44, weight: .black))
                    .foregroundStyle(brand.color)
            }
            .overlay(Circle().stroke(brand.color.opacity(0.6), lineWidth: 1))
            .shadow(color: brand.color.opacity(0.5), radius: 24)

            Text(brand.coinName.uppercased())
                .font(.system(size: 12, weight: .black, design: .rounded))
                .tracking(2)
                .foregroundStyle(brand.bright)
            Text(brand.tagline)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 8)
    }

    private var exchangeCard: some View {
        VStack(spacing: 14) {
            row(
                label: "YOU PAY",
                amount: amount,
                tint: Theme.goldBright,
                short: "STRIDE",
                mark: "S",
                balance: fromBalance
            )

            ZStack {
                Capsule().fill(Theme.bg).frame(width: 44, height: 44)
                Capsule().stroke(Theme.border, lineWidth: 1).frame(width: 44, height: 44)
                Image(systemName: "arrow.down")
                    .font(.system(size: 16, weight: .black))
                    .foregroundStyle(Theme.text)
            }
            .padding(.vertical, -22)

            row(
                label: "YOU GET",
                amount: receiveAmount,
                tint: brand.color,
                short: brand.short,
                mark: brand.mark,
                balance: nil
            )
        }
    }

    private func row(label: String, amount: Int, tint: Color, short: String, mark: String, balance: Int?) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(label)
                    .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.6)
                    .foregroundStyle(Theme.textMuted)
                Spacer()
                if let balance {
                    Text("BAL \(balance)")
                        .font(.system(size: 10, weight: .heavy, design: .rounded)).tracking(1)
                        .foregroundStyle(Theme.textMuted)
                }
            }
            HStack(alignment: .center, spacing: 12) {
                ZStack {
                    Circle().fill(tint).frame(width: 36, height: 36)
                    Text(mark).font(.system(size: 16, weight: .black)).foregroundStyle(.white)
                }
                Text("\(amount)")
                    .font(.system(size: 38, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .monospacedDigit()
                    .contentTransition(.numericText())
                Spacer()
                Text(short)
                    .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.4)
                    .foregroundStyle(tint)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.border, lineWidth: 1))
    }

    private var presets: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("AMOUNT")
                .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.6)
                .foregroundStyle(Theme.textMuted)
            HStack(spacing: 8) {
                ForEach(presetValues, id: \.self) { v in
                    Button {
                        Haptics.tap()
                        withAnimation(.snappy) { amount = min(v, fromBalance) }
                    } label: {
                        Text("\(v)")
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .foregroundStyle(amount == v ? Theme.bg : Theme.text)
                            .frame(maxWidth: .infinity).frame(height: 40)
                            .background(amount == v ? AnyShapeStyle(brand.color) : AnyShapeStyle(Theme.card))
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(amount == v ? brand.color : Theme.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .disabled(v > fromBalance)
                    .opacity(v > fromBalance ? 0.4 : 1)
                }
                Button {
                    Haptics.tap()
                    withAnimation(.snappy) { amount = fromBalance }
                } label: {
                    Text("MAX")
                        .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.4)
                        .foregroundStyle(Theme.text)
                        .frame(maxWidth: .infinity).frame(height: 40)
                        .background(Theme.card).clipShape(Capsule())
                        .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var presetValues: [Int] { [50, 100, 250, 500] }

    private var rateNote: some View {
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "info.circle.fill").font(.system(size: 11))
                Text("Rate: 2 Stride = 1 \(brand.short). No fees.")
                    .font(.system(size: 11, weight: .heavy))
            }
            .foregroundStyle(Theme.textMuted)
            HStack(spacing: 6) {
                Image(systemName: "lock.fill").font(.system(size: 10))
                Text("\(brand.short) coins can only be spent on \(brand.name) rewards.")
                    .font(.system(size: 11, weight: .heavy))
                    .multilineTextAlignment(.center)
            }
            .foregroundStyle(brand.bright)
        }
        .padding(.top, 4)
    }

    private var ctaBar: some View {
        VStack(spacing: 0) {
            Divider().overlay(Theme.border)
            Button {
                guard canExchange else { return }
                let ok = store.exchangeStrideToBrand(brand.id, strideAmount: amount)
                if ok {
                    didFlash = true
                    Haptics.success()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { dismiss() }
                }
            } label: {
                HStack(spacing: 10) {
                    if didFlash {
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 18, weight: .heavy))
                    }
                    Text(didFlash ? "EXCHANGED" : "EXCHANGE \(amount)")
                        .font(.system(size: 14, weight: .black, design: .rounded)).tracking(2)
                }
                .foregroundStyle(brand.textOnColor)
                .frame(maxWidth: .infinity).frame(height: 56)
                .background(canExchange ? brand.color : Theme.card)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(canExchange ? brand.color : Theme.border, lineWidth: 1))
                .shadow(color: canExchange ? brand.color.opacity(0.45) : .clear, radius: 18, y: 8)
            }
            .buttonStyle(.plain)
            .disabled(!canExchange)
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 12)
        }
        .background(Theme.bg)
    }
}
