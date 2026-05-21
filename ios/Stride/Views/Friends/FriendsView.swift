import SwiftUI
import Combine

struct FriendsView: View {
    let store: VaultStore
    @State private var query: String = ""
    @State private var copied = false
    @State private var showShare = false
    @State private var newChallengeFor: String? = nil
    @State private var showNewChallenge = false
    @State private var detailChallenge: PersistedStakeChallenge? = nil
    @State private var addError: String? = nil
    @State private var showInbox = false

    private var stake: WeeklyStake { AppData.weeklyStake }

    private var friends: [PersistedFriend] {
        let all = store.personalFriends
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return all }
        return all.filter {
            $0.username.lowercased().contains(q) || $0.displayName.lowercased().contains(q)
        }
    }

    private var liveChallenges: [PersistedStakeChallenge] {
        store.stakeChallenges.filter { $0.status == .live }
    }
    private var pastChallenges: [PersistedStakeChallenge] {
        store.stakeChallenges.filter { $0.status == .settled || $0.status == .cancelled }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                inboxRow
                inviteHero
                searchAndAdd
                stakeCTA
                if !liveChallenges.isEmpty {
                    section("LIVE CHALLENGES")
                    VStack(spacing: 10) {
                        ForEach(liveChallenges) { ch in
                            ChallengeTicket(challenge: ch, now: store.now)
                                .onTapGesture { Haptics.tap(); detailChallenge = ch }
                        }
                    }
                }
                friendsListSection
                if !pastChallenges.isEmpty {
                    section("PAST CHALLENGES")
                    VStack(spacing: 10) {
                        ForEach(pastChallenges.prefix(5)) { ch in
                            ChallengeTicket(challenge: ch, now: store.now)
                                .onTapGesture { Haptics.tap(); detailChallenge = ch }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Theme.bg)
        .sheet(isPresented: $showShare) {
            ActivityShareSheet(items: [
                "Walk with me on Stride — we both get +500 coins when you join. https://\(store.inviteLink)"
            ])
        }
        .sheet(isPresented: $showNewChallenge) {
            NewStakeChallengeView(store: store, prefillFriendId: newChallengeFor)
        }
        .sheet(item: $detailChallenge) { ch in
            StakeChallengeDetailView(store: store, challengeId: ch.id)
        }
        .sheet(isPresented: $showInbox) {
            NotificationsView(store: store)
        }
        .alert("Add friend",
               isPresented: Binding(get: { addError != nil }, set: { if !$0 { addError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(addError ?? "") }
    }

    // MARK: - Sections

    private var inboxRow: some View {
        Button {
            Haptics.tap()
            showInbox = true
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Theme.goldBright.opacity(0.14))
                        .overlay(Circle().stroke(Theme.goldBright.opacity(0.55), lineWidth: 1))
                    Image(systemName: "bell.fill")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Theme.goldBright)
                    if store.pendingNotificationCount > 0 || store.unreadNotificationCount > 0 {
                        let n = store.pendingNotificationCount > 0
                            ? store.pendingNotificationCount : store.unreadNotificationCount
                        Text(n > 9 ? "9+" : "\(n)")
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .foregroundStyle(Color(red: 26/255, green: 10/255, blue: 0/255))
                            .padding(.horizontal, 5).padding(.vertical, 1)
                            .background(Theme.goldBright)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Theme.card, lineWidth: 2))
                            .offset(x: 14, y: -14)
                    }
                }
                .frame(width: 38, height: 38)

                VStack(alignment: .leading, spacing: 2) {
                    Text("NOTIFICATIONS")
                        .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.4)
                        .foregroundStyle(Theme.goldBright)
                    Text(inboxSubtitle)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                        .lineLimit(1)
                }
                Spacer()
                Text("OPEN →")
                    .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1)
                    .foregroundStyle(Theme.text)
            }
            .padding(12)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.goldBright.opacity(0.55), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var inboxSubtitle: String {
        if store.pendingNotificationCount > 0 {
            return "\(store.pendingNotificationCount) pending · friend requests & invites"
        }
        if store.unreadNotificationCount > 0 {
            return "\(store.unreadNotificationCount) unread"
        }
        return "All caught up"
    }

    private var inviteHero: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ZStack {
                    Circle().fill(Theme.emerald.opacity(0.15))
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Theme.emerald)
                }
                .frame(width: 40, height: 40)
                Spacer()
            }
            Text("Walk together, earn more")
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            (Text("You + a friend each get ")
                .foregroundStyle(Theme.textMuted) +
             Text("+500c").foregroundStyle(Theme.emerald).fontWeight(.black) +
             Text(" when they join via your link.").foregroundStyle(Theme.textMuted))
                .font(.system(size: 12, weight: .medium))

            // Link box
            HStack(spacing: 8) {
                Text(store.inviteLink)
                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Theme.text)
                    .lineLimit(1)
                Spacer()
                Button {
                    Haptics.tap()
                    UIPasteboard.general.string = "https://\(store.inviteLink)"
                    withAnimation(.snappy) { copied = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                        withAnimation(.snappy) { copied = false }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: copied ? "checkmark" : "doc.on.doc")
                        Text(copied ? "COPIED" : "COPY")
                    }
                    .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1)
                    .foregroundStyle(Theme.emerald)
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(Theme.emerald.opacity(0.12))
                    .clipShape(.rect(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(Theme.bg)
            .clipShape(.rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))

            // Share button
            Button {
                Haptics.tap()
                _ = store.recordShare()
                showShare = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "square.and.arrow.up")
                    Text("SHARE INVITE").tracking(1.4)
                }
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(Color(red: 4/255, green: 38/255, blue: 26/255))
                .frame(maxWidth: .infinity).frame(height: 46)
                .background(Theme.emerald)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)

            if store.lifetimeShares > 0 || store.referralSignups > 0 {
                HStack(spacing: 14) {
                    sharedStat("\(store.referralSignups)", "JOINED")
                    sharedStat("\(store.lifetimeShares)", "SHARES")
                    sharedStat("\(store.shareCoinsEarned)c", "EARNED")
                    Spacer()
                }
                .padding(.top, 4)
            }
        }
        .padding(16)
        .background(
            LinearGradient(colors: [Theme.emerald.opacity(0.14), Theme.card.opacity(0.6)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(.rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.emerald.opacity(0.4), lineWidth: 1))
    }

    private func sharedStat(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
                .monospacedDigit()
            Text(label)
                .font(.system(size: 9, weight: .heavy, design: .rounded)).tracking(1)
                .foregroundStyle(Theme.textDim)
        }
    }

    private var searchAndAdd: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("FIND A FRIEND")
                .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.8)
                .foregroundStyle(Theme.text)
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Text("@")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundStyle(Theme.textDim)
                    TextField("username", text: $query)
                        .foregroundStyle(Theme.text)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.search)
                        .onSubmit(performAdd)
                }
                .padding(.horizontal, 12)
                .frame(height: 44)
                .background(Theme.card)
                .clipShape(.rect(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))

                Button(action: performAdd) {
                    HStack(spacing: 6) {
                        Image(systemName: "person.badge.plus")
                        Text("ADD").tracking(1.2)
                    }
                    .font(.system(size: 11, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 26/255, green: 10/255, blue: 0/255))
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    .background(Theme.goldBright)
                    .clipShape(.rect(cornerRadius: 12))
                }
                .buttonStyle(.plain)
                .disabled(query.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            Text("Try @kai.mercer, @sable, @junopark, @rune, @novavance…")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Theme.textDim)
        }
    }

    private var stakeCTA: some View {
        Button {
            Haptics.tap()
            newChallengeFor = nil
            showNewChallenge = true
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Theme.goldBright)
                    Image(systemName: "flame.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color(red: 26/255, green: 10/255, blue: 0/255))
                }
                .frame(width: 40, height: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text("WEEKLY STAKE CHALLENGE")
                        .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.4)
                        .foregroundStyle(Theme.goldBright)
                    Text("Pick friends · winner takes the pot · 2% rake")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                }
                Spacer()
                Text("START →")
                    .font(.system(size: 12, weight: .black, design: .rounded)).tracking(1)
                    .foregroundStyle(Theme.text)
            }
            .padding(14)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.goldBright.opacity(0.55), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var friendsListSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("YOUR FRIENDS · \(store.personalFriends.count)")
                .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.8)
                .foregroundStyle(Theme.text)
                .padding(.top, 6)
            if friends.isEmpty {
                Text(store.personalFriends.isEmpty
                     ? "No friends yet — share your link or add by username above."
                     : "No friends match “\(query)”.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Theme.textMuted)
                    .frame(maxWidth: .infinity)
                    .padding(18)
                    .background(Theme.card)
                    .clipShape(.rect(cornerRadius: 14))
            } else {
                VStack(spacing: 8) {
                    ForEach(friends) { f in
                        FriendRowView(
                            friend: f,
                            weeklyCoins: AppData.pseudoPeriodCoins(playerId: f.id,
                                                                   periodKey: AppData.currentWeekKey(store.now)),
                            onChallenge: {
                                Haptics.tap()
                                newChallengeFor = f.id
                                showNewChallenge = true
                            },
                            onRemove: { store.removeFriend(id: f.id) }
                        )
                    }
                }
            }
        }
    }

    private func section(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.8)
                .foregroundStyle(Theme.text)
            Spacer()
        }
        .padding(.top, 8)
    }

    private func performAdd() {
        Haptics.tap()
        switch store.addFriend(username: query) {
        case .success:
            query = ""
        case .failure(let err):
            switch err {
            case .empty:       addError = "Enter a username."
            case .alreadyAdded:addError = "You're already friends."
            case .notFound:    addError = "No user with that username."
            }
            Haptics.error()
        }
    }
}

// MARK: - Friend row

private struct FriendRowView: View {
    let friend: PersistedFriend
    let weeklyCoins: Int
    let onChallenge: () -> Void
    let onRemove: () -> Void
    @State private var showConfirmRemove = false

    var body: some View {
        HStack(spacing: 10) {
            AvatarView(seed: friend.avatarSeed, size: 40,
                       initials: String(friend.displayName.prefix(2)).uppercased())
            VStack(alignment: .leading, spacing: 2) {
                Text(friend.displayName)
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.text)
                HStack(spacing: 6) {
                    Text("@\(friend.username)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.textDim)
                    Text("·")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.textDim)
                    Text("\(weeklyCoins.formatted())c this week")
                        .font(.system(size: 11, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                        .monospacedDigit()
                }
            }
            Spacer()
            Button(action: onChallenge) {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                    Text("CHALLENGE").tracking(1)
                }
                .font(.system(size: 10, weight: .black, design: .rounded))
                .foregroundStyle(Color(red: 26/255, green: 10/255, blue: 0/255))
                .padding(.horizontal, 10).padding(.vertical, 7)
                .background(Theme.goldBright)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            Button {
                showConfirmRemove = true
            } label: {
                Image(systemName: "person.badge.minus")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Theme.textDim)
                    .padding(6)
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1))
        .confirmationDialog("Remove \(friend.displayName)?", isPresented: $showConfirmRemove, titleVisibility: .visible) {
            Button("Remove", role: .destructive) { onRemove() }
            Button("Cancel", role: .cancel) {}
        }
    }
}

// MARK: - Challenge ticket

struct ChallengeTicket: View {
    let challenge: PersistedStakeChallenge
    let now: Date

    private var joined: [PersistedChallengeParticipant] { challenge.participants.filter { $0.state != .out } }
    private var pot: Int { challenge.stake * joined.count }
    private var live: Bool { challenge.status == .live }
    private var leader: PersistedChallengeParticipant? {
        let cands = joined.filter { $0.state == .joined }
        guard !cands.isEmpty else { return nil }
        return cands.max(by: { $0.delta < $1.delta })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                HStack(spacing: 4) {
                    Image(systemName: "trophy.fill").font(.system(size: 10))
                    Text(challenge.metric.label).tracking(1)
                }
                .font(.system(size: 9, weight: .black, design: .rounded))
                .foregroundStyle(live ? Theme.goldBright : Theme.textMuted)
                .padding(.horizontal, 7).padding(.vertical, 4)
                .background(Theme.surface)
                .clipShape(.rect(cornerRadius: 6))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke((live ? Theme.goldBright : Theme.textMuted).opacity(0.45), lineWidth: 1))

                Text(challenge.title)
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .lineLimit(1)
                Spacer()
            }

            HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("POT")
                        .font(.system(size: 8, weight: .black, design: .rounded)).tracking(1)
                        .foregroundStyle(Theme.textDim)
                    Text("\(pot.formatted())c")
                        .font(.system(size: 20, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                        .monospacedDigit()
                }

                HStack(spacing: -10) {
                    ForEach(Array(joined.prefix(4))) { p in
                        AvatarView(seed: p.avatarSeed, size: 28,
                                   initials: String(p.displayName.prefix(1)))
                            .overlay(Circle().stroke(Theme.card, lineWidth: 2))
                    }
                    if joined.count > 4 {
                        Text("+\(joined.count - 4)")
                            .font(.system(size: 11, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.textMuted)
                            .padding(.leading, 14)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(live ? "ENDS IN" : challenge.status == .settled ? "SETTLED" : "CANCELLED")
                        .font(.system(size: 8, weight: .black, design: .rounded)).tracking(1)
                        .foregroundStyle(Theme.textDim)
                    Text(live
                         ? formatRemaining(end: challenge.endsAt, now: now)
                         : (challenge.status == .settled ? "\((challenge.payout ?? 0).formatted())c" : "—"))
                        .font(.system(size: 13, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.text)
                        .monospacedDigit()
                }
            }
            if let leader {
                Text(challenge.status == .settled
                     ? "🏆 Won by \(leader.displayName)"
                     : "Leader: \(leader.displayName)")
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
                    .lineLimit(1)
            }
        }
        .padding(12)
        .background(
            LinearGradient(colors: live
                           ? [Theme.goldBright.opacity(0.18), Theme.card.opacity(0.4)]
                           : [Theme.card.opacity(0.7), Theme.card.opacity(0.4)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke((live ? Theme.goldBright : Theme.border).opacity(0.55), lineWidth: 1))
        .opacity(live ? 1 : 0.78)
    }

    private func formatRemaining(end: Date, now: Date) -> String {
        let r = end.timeIntervalSince(now)
        if r <= 0 { return "Settling…" }
        let days = Int(r / 86400)
        let hours = Int((r.truncatingRemainder(dividingBy: 86400)) / 3600)
        let minutes = Int((r.truncatingRemainder(dividingBy: 3600)) / 60)
        if days > 0 { return "\(days)d \(hours)h" }
        if hours > 0 { return "\(hours)h \(minutes)m" }
        return "\(minutes)m"
    }
}

// MARK: - Share sheet

struct ActivityShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}
