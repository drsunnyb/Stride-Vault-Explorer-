import SwiftUI

struct ContentView: View {
    let store: VaultStore
    @State private var selectedVault: Vault?
    @State private var openingVault: Vault?
    @State private var mode: Mode = .map

    enum Mode: String, CaseIterable {
        case map = "Map"
        case list = "Vaults"
    }

    var body: some View {
        ZStack(alignment: .top) {
            content
            topBar
            // Live events strip floats just under the mode picker
            VStack(spacing: 8) {
                Spacer().frame(height: 132)
                if store.tribeLossRedemptionActive {
                    RedemptionBanner(
                        kind: .loss,
                        endsAt: RetentionEngine.weekEnd(store.now)
                    )
                    .padding(.horizontal, 16)
                    .transition(.move(edge: .top).combined(with: .opacity))
                } else if store.tribeWinActive {
                    RedemptionBanner(
                        kind: .win,
                        endsAt: RetentionEngine.weekEnd(store.now)
                    )
                    .padding(.horizontal, 16)
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
                LiveEventsStrip(events: AppData.liveEvents)
                Spacer()
            }
            .allowsHitTesting(true)
            .animation(.snappy, value: store.tribeLossRedemptionActive)
            .animation(.snappy, value: store.tribeWinActive)
        }
        .preferredColorScheme(.dark)
        .background(Theme.bg.ignoresSafeArea())
        .sheet(item: $selectedVault) { vault in
            let _ = (vault.brandId != nil ? store.requestPaywall(.brandedVault) : ())
            VaultDetailSheet(
                vault: vault,
                reward: store.reward(for: vault),
                isClaimed: store.isClaimed(vault),
                canOpen: store.canOpen(vault),
                metersAway: store.metersToEnter(vault),
                radius: store.claimRadius(for: vault),
                demoMode: store.demoMode,
                onOpen: {
                    selectedVault = nil
                    // small delay so the sheet fully dismisses before the open ceremony
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                        openingVault = vault
                    }
                },
                onWalkHere: {
                    store.demoWalk(to: vault)
                }
            )
        }
        .fullScreenCover(item: $openingVault) { vault in
            VaultOpenView(
                vault: vault,
                onClaim: { store.claim(vault) },
                onDone: { _ in openingVault = nil }
            )
        }
    }

    @ViewBuilder
    private var content: some View {
        switch mode {
        case .map:
            VaultMapView(store: store, selected: $selectedVault)
        case .list:
            VaultListView(store: store, onSelect: { selectedVault = $0 })
                .safeAreaInset(edge: .top) {
                    // Reserve space for the floating top bar + live events strip
                    Color.clear.frame(height: 210)
                }
                .safeAreaInset(edge: .bottom) {
                    Color.clear.frame(height: 80)
                }
        }
    }

    private var topBar: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                wordmark
                Spacer()
                HUDPill(coins: store.coins, streak: store.streak)
            }

            ModePicker(mode: $mode)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 16)
        .background(
            LinearGradient(
                colors: [Theme.bg, Theme.bg.opacity(0.85), .clear],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(edges: .top)
            .allowsHitTesting(false)
        )
    }

    private var wordmark: some View {
        HStack(spacing: 8) {
            CoinIcon(size: 28)
            Text("STRIDE")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .tracking(3)
                .foregroundStyle(Theme.text)
        }
    }
}

// MARK: - Subviews

private struct HUDPill: View {
    let coins: Int
    let streak: Int

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                CoinIcon(size: 16)
                Text("\(coins)")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.goldBright)
                    .contentTransition(.numericText())
                    .monospacedDigit()
            }

            Rectangle().fill(Theme.border).frame(width: 1, height: 14)

            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Theme.ruby)
                Text("\(streak)")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.text)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(Theme.card.opacity(0.92))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
    }
}

private struct ModePicker: View {
    @Binding var mode: ContentView.Mode

    var body: some View {
        HStack(spacing: 4) {
            ForEach(ContentView.Mode.allCases, id: \.self) { m in
                Button {
                    Haptics.tap()
                    withAnimation(.snappy) { mode = m }
                } label: {
                    Text(m.rawValue.uppercased())
                        .font(.system(size: 12, weight: .heavy, design: .rounded))
                        .tracking(1.6)
                        .foregroundStyle(mode == m ? Theme.bg : Theme.textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                        .background(
                            ZStack {
                                if mode == m {
                                    Capsule().fill(Theme.goldBright)
                                }
                            }
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(Theme.card.opacity(0.92))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
    }
}

#Preview {
    ContentView(store: VaultStore())
}
