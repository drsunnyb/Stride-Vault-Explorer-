import SwiftUI
import Combine

struct FriendsView: View {
    let store: VaultStore
    @State private var query: String = ""
    @State private var copied = false

    private var stake: WeeklyStake { AppData.weeklyStake }

    private var filtered: [Friend] {
        let f = AppData.friends
        guard !query.isEmpty else { return f }
        return f.filter { $0.handle.localizedCaseInsensitiveContains(query) || $0.name.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                inviteHero
                weeklyStakeCard
                searchBar
                addByHandle
                friendsList
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Theme.bg)
    }

    private var inviteHero: some View {
        VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("FRIENDS")
                        .font(.system(size: 11, weight: .heavy, design: .rounded))
                        .tracking(2.4)
                        .foregroundStyle(Theme.textMuted)
                    Text("Walk together")
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.text)
                }
                Spacer()
                Image(systemName: "person.2.fill")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(Theme.emerald)
            }
            .padding(.top, 8)

            VStack(alignment: .leading, spacing: 12) {
                Text("INVITE LINK")
                    .font(.system(size: 10, weight: .heavy, design: .rounded))
                    .tracking(1.4)
                    .foregroundStyle(Theme.textMuted)
                HStack {
                    Text("stride.app/i/yourcode")
                        .font(.system(size: 14, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Theme.text)
                        .lineLimit(1)
                    Spacer()
                    Button {
                        Haptics.tap()
                        UIPasteboard.general.string = "https://stride.app/i/yourcode"
                        withAnimation(.snappy) { copied = true }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                            withAnimation(.snappy) { copied = false }
                        }
                    } label: {
                        Image(systemName: copied ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(copied ? Theme.emerald : Theme.text)
                            .frame(width: 32, height: 32)
                            .background(Theme.surface)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
                .padding(12)
                .background(Theme.bg)
                .clipShape(.rect(cornerRadius: 12))

                HStack(spacing: 10) {
                    ShareButton(label: "SHARE LINK", icon: "square.and.arrow.up", tint: Theme.goldBright)
                    ShareButton(label: "STAKE A FRIEND", icon: "flame.fill", tint: Theme.ruby)
                }
            }
            .padding(16)
            .background(
                LinearGradient(colors: [Theme.card, Theme.bgElev],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            )
            .clipShape(.rect(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.border, lineWidth: 1))
        }
    }

    // MARK: - Weekly Stake

    private var weeklyStakeCard: some View {
        let sorted = stake.entrants.sorted { $0.steps > $1.steps }
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: "flame.fill").foregroundStyle(Theme.ruby)
                        Text("WEEKLY STAKE")
                            .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.6)
                            .foregroundStyle(Theme.ruby)
                    }
                    Text(stake.title)
                        .font(.system(size: 20, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.text)
                    Text(stake.subtitle)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 4) {
                        CoinIcon(size: 16)
                        Text("\(stake.pot)")
                            .font(.system(size: 22, weight: .black, design: .rounded))
                            .foregroundStyle(Theme.goldBright)
                            .monospacedDigit()
                    }
                    Text("POT")
                        .font(.system(size: 9, weight: .black, design: .rounded)).tracking(1)
                        .foregroundStyle(Theme.textDim)
                }
            }

            VStack(spacing: 6) {
                ForEach(Array(sorted.prefix(3).enumerated()), id: \.element.id) { idx, e in
                    HStack(spacing: 10) {
                        Text("#\(idx + 1)")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .foregroundStyle(idx == 0 ? Theme.goldBright : Theme.textMuted)
                            .frame(width: 26, alignment: .leading)
                        AvatarView(seed: e.avatarSeed, size: 26, initials: String(e.name.prefix(2)).uppercased())
                        Text(e.handle)
                            .font(.system(size: 12, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.text)
                        Spacer()
                        Text("\(e.steps.formatted()) steps")
                            .font(.system(size: 12, weight: .heavy, design: .rounded))
                            .foregroundStyle(idx == 0 ? Theme.goldBright : Theme.textMuted)
                            .monospacedDigit()
                    }
                }
            }

            HStack(spacing: 10) {
                EndsInLabel(date: stake.endsAt)
                Spacer()
                Button {
                    Haptics.tap()
                    _ = store.joinWeeklyStake(stake.stake)
                } label: {
                    HStack(spacing: 6) {
                        if store.weeklyStakeJoined {
                            Image(systemName: "checkmark.seal.fill")
                            Text("STAKED")
                        } else {
                            CoinIcon(size: 13)
                            Text("STAKE \(stake.stake)")
                        }
                    }
                    .font(.system(size: 12, weight: .black, design: .rounded)).tracking(1.4)
                    .foregroundStyle(store.weeklyStakeJoined ? Theme.emerald : Theme.bg)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(store.weeklyStakeJoined ? Theme.emerald.opacity(0.15) : Theme.ruby)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(store.weeklyStakeJoined ? Theme.emerald : .clear, lineWidth: 1.5))
                }
                .buttonStyle(.plain)
                .disabled(store.weeklyStakeJoined)
            }
        }
        .padding(16)
        .background(
            LinearGradient(colors: [Theme.ruby.opacity(0.12), Theme.card],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(.rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.ruby.opacity(0.35), lineWidth: 1))
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass").foregroundStyle(Theme.textMuted)
            TextField("Search friends", text: $query)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .foregroundStyle(Theme.text)
        }
        .padding(14)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 14))
    }

    private var addByHandle: some View {
        HStack(spacing: 10) {
            Image(systemName: "at").foregroundStyle(Theme.emerald)
            Text("Add by username")
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.text)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .heavy))
                .foregroundStyle(Theme.textMuted)
        }
        .padding(14)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 14))
    }

    private var friendsList: some View {
        VStack(spacing: 8) {
            ForEach(filtered) { friend in
                FriendRow(friend: friend)
            }
        }
    }
}

private struct EndsInLabel: View {
    let date: Date
    @State private var now: Date = Date()
    private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    private var text: String {
        let remaining = date.timeIntervalSince(now)
        if remaining < 0 { return "Ended" }
        let days = Int(remaining / 86400)
        let hours = Int((remaining.truncatingRemainder(dividingBy: 86400)) / 3600)
        return "Ends in \(days)d \(hours)h"
    }

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "clock.fill").font(.system(size: 11, weight: .bold))
            Text(text.uppercased())
                .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1)
        }
        .foregroundStyle(Theme.textMuted)
        .onReceive(timer) { now = $0 }
    }
}

private struct ShareButton: View {
    let label: String
    let icon: String
    let tint: Color
    var body: some View {
        Button {
            Haptics.tap()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon)
                Text(label).tracking(1.2)
            }
            .font(.system(size: 12, weight: .heavy, design: .rounded))
            .foregroundStyle(Theme.bg)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(tint)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

private struct FriendRow: View {
    let friend: Friend
    var body: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .bottomTrailing) {
                AvatarView(seed: friend.avatarSeed, size: 44,
                           initials: String(friend.name.prefix(2)).uppercased())
                if friend.isOnline {
                    Circle()
                        .fill(Theme.emerald)
                        .frame(width: 12, height: 12)
                        .overlay(Circle().stroke(Theme.bg, lineWidth: 2))
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(friend.name)
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.text)
                Text(friend.lastSeen)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                HStack(spacing: 3) {
                    CoinIcon(size: 12)
                    Text("\(friend.coinsThisWeek)")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                        .monospacedDigit()
                }
                Text("THIS WEEK")
                    .font(.system(size: 9, weight: .heavy, design: .rounded))
                    .tracking(1.0)
                    .foregroundStyle(Theme.textDim)
            }
            Button {
                Haptics.tap()
            } label: {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Theme.ruby)
                    .frame(width: 32, height: 32)
                    .background(Theme.ruby.opacity(0.12))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 14))
    }
}
