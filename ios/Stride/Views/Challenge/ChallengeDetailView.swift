import SwiftUI

struct ChallengeDetailView: View {
    let store: VaultStore
    let challenge: Challenge
    @Environment(\.dismiss) private var dismiss
    @State private var showError = false
    private var joined: Bool { store.joinedChallenges.contains(challenge.id) }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                Color(.secondarySystemBackground)
                    .frame(height: 200)
                    .overlay {
                        Text(challenge.emoji).font(.system(size: 100)).allowsHitTesting(false)
                    }
                    .clipShape(.rect(cornerRadius: 22))
                VStack(alignment: .leading, spacing: 10) {
                    Text(challenge.title).font(.system(size: 26, weight: .black, design: .rounded)).foregroundStyle(Theme.text)
                    Text(challenge.blurb).font(.system(size: 14, weight: .medium)).foregroundStyle(Theme.textMuted)
                    HStack(spacing: 20) {
                        stat("STAKE", "\(challenge.stake)", color: Theme.ruby)
                        stat("WIN", "\(challenge.reward)", color: Theme.emerald)
                        stat("PLAYERS", "\(challenge.participants)", color: Theme.text)
                    }
                    .padding(.top, 6)
                    Text(timeLeft).font(.system(size: 12, weight: .heavy)).foregroundStyle(Theme.sapphire)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                Spacer(minLength: 20)
            }
        }
        .background(Theme.bg)
        .safeAreaInset(edge: .bottom) {
            Button {
                if joined {
                    dismiss()
                } else if store.joinChallenge(challenge) {
                    Haptics.success()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { dismiss() }
                } else {
                    showError = true; Haptics.error()
                }
            } label: {
                Text(joined ? "ALREADY IN — KEEP WALKING" : "STAKE \(challenge.stake) COINS")
                    .font(.system(size: 14, weight: .black, design: .rounded)).tracking(1.4)
                    .foregroundStyle(Theme.bg)
                    .frame(maxWidth: .infinity).frame(height: 56)
                    .background(joined ? Theme.emerald : Theme.goldBright)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 20).padding(.bottom, 12)
        }
        .alert("Not enough coins", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: { Text("This challenge needs \(challenge.stake) coins. You have \(store.coins).") }
    }

    private func stat(_ label: String, _ value: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 18, weight: .black, design: .rounded)).foregroundStyle(color)
            Text(label).font(.system(size: 9, weight: .heavy)).tracking(1.2).foregroundStyle(Theme.textDim)
        }
    }

    private var timeLeft: String {
        let interval = challenge.endsAt.timeIntervalSinceNow
        if interval < 86400 {
            let hours = Int(interval) / 3600
            return "Ends in \(hours)h"
        }
        let days = Int(interval) / 86400
        return "Ends in \(days)d"
    }
}
