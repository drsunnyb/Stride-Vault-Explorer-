import SwiftUI

struct StakeChallengeDetailView: View {
    let store: VaultStore
    let challengeId: String
    @Environment(\.dismiss) private var dismiss

    private var challenge: PersistedStakeChallenge? {
        store.stakeChallenges.first { $0.id == challengeId }
    }

    var body: some View {
        Group {
            if let ch = challenge {
                content(ch)
            } else {
                VStack(spacing: 12) {
                    Text("Challenge unavailable")
                        .font(.system(size: 16, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.text)
                    Button("Close") { dismiss() }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.bg)
            }
        }
    }

    @ViewBuilder
    private func content(_ ch: PersistedStakeChallenge) -> some View {
        let joined = ch.participants.filter { $0.state != .out }
        let pot = ch.stake * joined.count
        let rake = Int(Double(pot) * VaultStore.challengeRakePct)
        let sorted = joined.sorted { $0.delta > $1.delta }
        let you = ch.participants.first { $0.playerId == "you" }
        let isInvited = (you?.state == .invited)

        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                heroCard(ch: ch, pot: pot, rake: rake)
                leaderboard(ch: ch, sorted: sorted)
                metaCard(ch: ch)
            }
            .padding(.horizontal, 16)
            .padding(.top, 18)
            .padding(.bottom, 130)
        }
        .background(Theme.bg)
        .safeAreaInset(edge: .top) {
            HStack {
                Text(ch.title)
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .lineLimit(1)
                Spacer()
                Button { Haptics.tap(); dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Theme.textMuted)
                        .padding(10)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16).padding(.top, 12).padding(.bottom, 6)
            .background(Theme.bg)
        }
        .safeAreaInset(edge: .bottom) {
            if isInvited {
                HStack(spacing: 10) {
                    Button {
                        Haptics.tap(); _ = store.declineStakeChallenge(id: ch.id)
                    } label: {
                        Text("DECLINE").tracking(1.4)
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .foregroundStyle(Theme.textMuted)
                            .frame(maxWidth: .infinity).frame(height: 52)
                            .background(Theme.card)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    Button {
                        Haptics.tap()
                        if store.acceptStakeChallenge(id: ch.id) {
                            // stays open
                        }
                    } label: {
                        Text("ACCEPT — LOCK \(ch.stake.formatted())c").tracking(1.4)
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .foregroundStyle(Color(red: 26/255, green: 10/255, blue: 0/255))
                            .frame(maxWidth: .infinity).frame(height: 52)
                            .background(Theme.goldBright)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16).padding(.bottom, 12)
            }
        }
    }

    private func heroCard(ch: PersistedStakeChallenge, pot: Int, rake: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(ch.metric.label)
                    .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.4)
                    .foregroundStyle(Theme.goldBright)
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(Theme.goldBright.opacity(0.15))
                    .clipShape(Capsule())
                Spacer()
                Text(statusLabel(ch))
                    .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.4)
                    .foregroundStyle(statusColor(ch))
            }
            Text("POT")
                .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.4)
                .foregroundStyle(Theme.textDim)
            Text("\(pot.formatted())c")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Text("Winner takes \((max(0, pot - rake)).formatted())c after 2% rake")
                .font(.system(size: 12, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.textMuted)

            if ch.status == .live {
                Text(remainingLabel(ch))
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.sapphire)
                    .padding(.top, 4)
            } else if ch.status == .settled, let wid = ch.winnerId,
                      let w = ch.participants.first(where: { $0.playerId == wid }) {
                Text("🏆 Won by \(w.displayName) · paid \((ch.payout ?? 0).formatted())c")
                    .font(.system(size: 12, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.emerald)
                    .padding(.top, 4)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [Theme.goldBright.opacity(0.22), Theme.card.opacity(0.4)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(.rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.goldBright.opacity(0.5), lineWidth: 1))
    }

    private func leaderboard(ch: PersistedStakeChallenge, sorted: [PersistedChallengeParticipant]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("STANDINGS")
                .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.8)
                .foregroundStyle(Theme.text)
            VStack(spacing: 8) {
                ForEach(Array(sorted.enumerated()), id: \.element.id) { idx, p in
                    HStack(spacing: 12) {
                        Text("#\(idx + 1)")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .foregroundStyle(idx == 0 ? Theme.goldBright : Theme.textMuted)
                            .frame(width: 28, alignment: .leading)
                        AvatarView(seed: p.avatarSeed, size: 36,
                                   initials: String(p.displayName.prefix(2)).uppercased())
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text(p.playerId == "you" ? "You" : p.displayName)
                                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                                    .foregroundStyle(Theme.text)
                                if p.state == .invited {
                                    Text("INVITED")
                                        .font(.system(size: 9, weight: .black, design: .rounded)).tracking(1)
                                        .foregroundStyle(Theme.sapphire)
                                        .padding(.horizontal, 6).padding(.vertical, 2)
                                        .background(Theme.sapphire.opacity(0.15))
                                        .clipShape(Capsule())
                                }
                            }
                            Text("+\(p.delta.formatted()) \(ch.metric.label.lowercased())")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(Theme.textMuted)
                                .monospacedDigit()
                        }
                        Spacer()
                        if ch.status == .settled, ch.winnerId == p.playerId {
                            Text("🏆")
                        }
                    }
                    .padding(10)
                    .background(p.playerId == "you" ? Theme.emerald.opacity(0.10) : Theme.card)
                    .clipShape(.rect(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(p.playerId == "you" ? Theme.emerald : Theme.border, lineWidth: 1))
                }
            }
        }
    }

    private func metaCard(ch: PersistedStakeChallenge) -> some View {
        let df = DateFormatter()
        df.dateStyle = .medium
        df.timeStyle = .short
        return VStack(alignment: .leading, spacing: 8) {
            metaRow("Stake per player", "\(ch.stake.formatted())c")
            metaRow("Started", df.string(from: ch.startsAt))
            metaRow("Ends", df.string(from: ch.endsAt))
            if ch.status == .live {
                metaRow("Invites expire", df.string(from: ch.inviteExpiresAt))
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1))
    }

    private func metaRow(_ k: String, _ v: String) -> some View {
        HStack {
            Text(k.uppercased())
                .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.2)
                .foregroundStyle(Theme.textDim)
            Spacer()
            Text(v)
                .font(.system(size: 12, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.text)
                .monospacedDigit()
        }
    }

    private func statusLabel(_ ch: PersistedStakeChallenge) -> String {
        switch ch.status {
        case .pending:   return "PENDING"
        case .live:      return "LIVE"
        case .settled:   return "SETTLED"
        case .cancelled: return "CANCELLED"
        }
    }
    private func statusColor(_ ch: PersistedStakeChallenge) -> Color {
        switch ch.status {
        case .live:      return Theme.emerald
        case .settled:   return Theme.textMuted
        case .cancelled: return Theme.ruby
        case .pending:   return Theme.sapphire
        }
    }

    private func remainingLabel(_ ch: PersistedStakeChallenge) -> String {
        let r = ch.endsAt.timeIntervalSince(store.now)
        if r <= 0 { return "Settling…" }
        let days = Int(r / 86400)
        let hours = Int((r.truncatingRemainder(dividingBy: 86400)) / 3600)
        if days > 0 { return "Ends in \(days)d \(hours)h" }
        return "Ends in \(hours)h"
    }
}
