import SwiftUI

struct PredictView: View {
    let store: VaultStore
    @Environment(\.dismiss) private var dismiss
    @State private var pickId: String?
    @State private var stake: Int = 100
    @State private var scope: Scope = .global
    @State private var showError = false

    enum Scope: String, CaseIterable { case global = "GLOBAL TOP 20", friends = "FRIENDS" }
    private let presets = [50, 100, 250, 500]

    private var contenders: [Player] {
        scope == .global ? AppData.globalLadder : AppData.globalLadder.prefix(6).map { $0 }
    }

    private var active: Prediction? { store.predictions.first(where: { $0.result == .pending }) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if let active {
                        activePill(active)
                    }
                    scopeRow
                    Text("WHO TOPS THE WEEKLY LADDER?")
                        .font(.system(size: 12, weight: .black, design: .rounded)).tracking(1.6)
                        .foregroundStyle(Theme.text)
                        .padding(.horizontal, 16)
                    VStack(spacing: 8) {
                        ForEach(Array(contenders.enumerated()), id: \.element.id) { i, p in
                            row(rank: i + 1, player: p)
                        }
                    }
                    .padding(.horizontal, 16)
                    Text("YOUR STAKE").font(.system(size: 12, weight: .black, design: .rounded)).tracking(1.6).foregroundStyle(Theme.text).padding(.horizontal, 16).padding(.top, 10)
                    HStack(spacing: 8) {
                        ForEach(presets, id: \.self) { s in
                            Button {
                                Haptics.tap(); stake = s
                            } label: {
                                Text("\(s)c").font(.system(size: 13, weight: .black, design: .rounded))
                                    .foregroundStyle(stake == s ? Theme.bg : Theme.text)
                                    .frame(maxWidth: .infinity).frame(height: 44)
                                    .background(stake == s ? Theme.goldBright : Theme.card)
                                    .clipShape(Capsule())
                                    .overlay(Capsule().stroke(stake == s ? Theme.goldBright : Theme.border, lineWidth: 1))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    Text("Spendable: \(store.coins)c. Pot pays 4.75× winning stake.")
                        .font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.textDim).padding(.horizontal, 16)
                    Spacer(minLength: 80)
                }
                .padding(.top, 12)
            }
            .background(Theme.bg)
            .navigationTitle("Predict")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: { Image(systemName: "xmark").foregroundStyle(Theme.textMuted) }
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button {
                    guard let pid = pickId ?? contenders.first?.id else { return }
                    let name = contenders.first(where: { $0.id == pid })?.name ?? "Unknown"
                    if store.placePrediction(pickPlayerId: pid, pickName: name, stake: stake) {
                        Haptics.success()
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { dismiss() }
                    } else {
                        showError = true; Haptics.error()
                    }
                } label: {
                    HStack(spacing: 6) {
                        CoinIcon(size: 16)
                        Text("LOCK \(stake)c")
                            .font(.system(size: 14, weight: .black, design: .rounded)).tracking(1.4)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity).frame(height: 56)
                    .background(LinearGradient(colors: [Theme.sapphire, Color(hex: "#60A5FA")],
                                                startPoint: .leading, endPoint: .trailing))
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 16).padding(.bottom, 12)
            }
            .alert("Couldn't place pick", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: { Text("You need \(stake) coins. You have \(store.coins).") }
        }
    }

    private func activePill(_ active: Prediction) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "crown.fill").foregroundStyle(Theme.sapphire)
            VStack(alignment: .leading, spacing: 2) {
                Text("Pick locked · \(active.stake)c on \(active.pickName)")
                    .font(.system(size: 13, weight: .black)).foregroundStyle(Theme.text)
                Text("Adjust below — re-locking refunds the old stake.")
                    .font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.textMuted)
            }
            Spacer()
        }
        .padding(12)
        .background(Theme.sapphire.opacity(0.12))
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.sapphire.opacity(0.5), lineWidth: 1))
        .padding(.horizontal, 16)
    }

    private var scopeRow: some View {
        HStack(spacing: 8) {
            ForEach(Scope.allCases, id: \.self) { s in
                Button {
                    Haptics.tap(); withAnimation(.snappy) { scope = s }
                } label: {
                    Text(s.rawValue)
                        .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.2)
                        .foregroundStyle(scope == s ? Theme.sapphire : Theme.textMuted)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(scope == s ? Theme.sapphire.opacity(0.12) : Theme.card)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(scope == s ? Theme.sapphire : Theme.border, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
        .padding(.horizontal, 16)
    }

    private func row(rank: Int, player: Player) -> some View {
        let isPick = (pickId ?? contenders.first?.id) == player.id
        return Button {
            Haptics.tap(); pickId = player.id
        } label: {
            HStack(spacing: 12) {
                Text(String(format: "#%02d", rank)).font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(rank < 4 ? Theme.goldBright : Theme.textDim)
                    .frame(width: 32, alignment: .leading)
                ZStack {
                    Circle().fill(Theme.surface).frame(width: 34, height: 34)
                    Circle().stroke(isPick ? Theme.sapphire : Theme.border, lineWidth: 1).frame(width: 34, height: 34)
                    Text(String(player.name.prefix(1))).font(.system(size: 14, weight: .black, design: .rounded)).foregroundStyle(Theme.text)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(player.name).font(.system(size: 13, weight: .heavy)).foregroundStyle(Theme.text)
                    Text("\(player.coins.formatted()) coins this week").font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.textMuted)
                }
                Spacer()
                if isPick { Image(systemName: "trophy.fill").foregroundStyle(Theme.sapphire).font(.system(size: 14)) }
            }
            .padding(12)
            .background(isPick ? Theme.sapphire.opacity(0.12) : Theme.card)
            .clipShape(.rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(isPick ? Theme.sapphire : Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
