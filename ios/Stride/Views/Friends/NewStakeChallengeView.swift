import SwiftUI

struct NewStakeChallengeView: View {
    let store: VaultStore
    let prefillFriendId: String?

    @Environment(\.dismiss) private var dismiss
    @State private var selected: Set<String> = []
    @State private var metric: ChallengeMetric = .steps
    @State private var stakeStr: String = "250"
    @State private var error: String? = nil
    @State private var created: PersistedStakeChallenge? = nil

    private var stake: Int { Int(stakeStr.filter { $0.isNumber }) ?? 0 }
    private var pot: Int { stake * (selected.count + 1) }
    private var rake: Int { Int(Double(pot) * VaultStore.challengeRakePct) }
    private var spendable: Int { store.spendableCoins }
    private var maxOpponents: Int { VaultStore.maxChallengeParticipants - 1 }

    init(store: VaultStore, prefillFriendId: String?) {
        self.store = store
        self.prefillFriendId = prefillFriendId
        if let id = prefillFriendId { _selected = State(initialValue: [id]) }
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    metricPicker
                    stakeCard
                    friendPicker
                    summaryCard
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 18)
                .padding(.bottom, 130)
            }
        }
        .background(Theme.bg)
        .safeAreaInset(edge: .bottom) { footer }
        .alert("Couldn't create challenge",
               isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(error ?? "") }
        .sheet(item: $created) { ch in
            StakeChallengeDetailView(store: store, challengeId: ch.id)
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Theme.goldBright)
                Image(systemName: "flame.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Color(red: 26/255, green: 10/255, blue: 0/255))
            }
            .frame(width: 40, height: 40)
            VStack(alignment: .leading, spacing: 2) {
                Text("STAKE CHALLENGE")
                    .font(.system(size: 14, weight: .black, design: .rounded)).tracking(1.4)
                    .foregroundStyle(Theme.text)
                Text("Winner takes the pot · 7 days")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
            Button { Haptics.tap(); dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Theme.textMuted)
                    .padding(10)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.top, 16)
        .padding(.bottom, 6)
    }

    private var metricPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("METRIC")
            HStack(spacing: 8) {
                metricBtn(.steps, "STEPS", "figure.walk")
                metricBtn(.vaults, "VAULTS", "mappin.and.ellipse")
                metricBtn(.coins, "COINS", "circle.hexagongrid.fill")
            }
        }
    }

    private func metricBtn(_ m: ChallengeMetric, _ label: String, _ icon: String) -> some View {
        Button {
            Haptics.tap(); metric = m
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon)
                Text(label).tracking(1.2)
            }
            .font(.system(size: 11, weight: .black, design: .rounded))
            .foregroundStyle(metric == m ? Color(red: 26/255, green: 10/255, blue: 0/255) : Theme.textMuted)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(metric == m ? Theme.goldBright : Theme.card)
            .clipShape(.rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(metric == m ? Theme.goldBright : Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var stakeCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("STAKE PER PLAYER")
            HStack(spacing: 6) {
                Text("c")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.goldBright)
                TextField("0", text: $stakeStr)
                    .keyboardType(.numberPad)
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(Theme.surface)
            .clipShape(.rect(cornerRadius: 12))

            HStack(spacing: 6) {
                ForEach([100, 250, 500, 1000], id: \.self) { q in
                    Button {
                        Haptics.tap(); stakeStr = String(q)
                    } label: {
                        Text("\(q)")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .foregroundStyle(stake == q ? Color(red: 26/255, green: 10/255, blue: 0/255) : Theme.textMuted)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 9)
                            .background(stake == q ? Theme.goldBright : Theme.surface)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(stake == q ? Theme.goldBright : Theme.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            Text("You have \(spendable.formatted()) spendable coins")
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.textDim)
                .frame(maxWidth: .infinity, alignment: .center)
        }
        .padding(14)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
    }

    private var friendPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("INVITE FRIENDS · \(selected.count)/\(maxOpponents)")
            if store.personalFriends.isEmpty {
                Text("Add friends first — head back and use the search above.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Theme.textMuted)
                    .padding(18)
                    .frame(maxWidth: .infinity)
                    .background(Theme.card)
                    .clipShape(.rect(cornerRadius: 14))
            } else {
                VStack(spacing: 8) {
                    ForEach(store.personalFriends) { f in
                        FriendPickerRow(
                            friend: f,
                            selected: selected.contains(f.id),
                            onToggle: { toggle(f.id) }
                        )
                    }
                }
            }
        }
    }

    private func toggle(_ id: String) {
        Haptics.tap()
        if selected.contains(id) { selected.remove(id) }
        else if selected.count < maxOpponents { selected.insert(id) }
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("POT IF ALL ACCEPT")
                .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.4)
                .foregroundStyle(Theme.goldBright)
            Text("\(pot.formatted())c")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            VStack(alignment: .leading, spacing: 4) {
                Text("\(selected.count + 1) players × \(stake.formatted())c")
                    .font(.system(size: 12, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
                Text("− \(rake.formatted())c rake to Champions Pool")
                    .font(.system(size: 12, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
                Text("Winner takes \(max(0, pot - rake).formatted())c")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.emerald)
                    .padding(.top, 2)
            }
            .padding(.top, 6)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [Theme.goldBright.opacity(0.18), Theme.card.opacity(0.4)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.goldBright.opacity(0.5), lineWidth: 1))
    }

    private var footer: some View {
        let disabled = selected.isEmpty || stake <= 0 || stake > spendable
        return Button {
            create()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "flame.fill")
                Text("LOCK \(stake.formatted())c · START CHALLENGE").tracking(1.4)
            }
            .font(.system(size: 12, weight: .black, design: .rounded))
            .foregroundStyle(Color(red: 26/255, green: 10/255, blue: 0/255))
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(Theme.goldBright)
            .clipShape(Capsule())
            .opacity(disabled ? 0.4 : 1)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .padding(.horizontal, 16).padding(.bottom, 12)
    }

    private func sectionLabel(_ s: String) -> some View {
        Text(s)
            .font(.system(size: 11, weight: .black, design: .rounded)).tracking(1.8)
            .foregroundStyle(Theme.text)
    }

    private func create() {
        Haptics.tap()
        switch store.createStakeChallenge(friendIds: Array(selected), metric: metric, stake: stake) {
        case .success(let ch):
            created = ch
            dismiss()
        case .failure(let err):
            switch err {
            case .noFriends:      error = "Pick at least one friend to challenge."
            case .badStake:       error = "Enter how many coins to stake."
            case .notEnoughCoins: error = "You only have \(spendable.formatted()) spendable coins."
            }
            Haptics.error()
        }
    }
}

private struct FriendPickerRow: View {
    let friend: PersistedFriend
    let selected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                AvatarView(seed: friend.avatarSeed, size: 38,
                           initials: String(friend.displayName.prefix(2)).uppercased())
                VStack(alignment: .leading, spacing: 2) {
                    Text(friend.displayName)
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.text)
                    Text("@\(friend.username)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.textDim)
                }
                Spacer()
                ZStack {
                    Circle()
                        .fill(selected ? Theme.emerald : .clear)
                        .frame(width: 22, height: 22)
                        .overlay(Circle().stroke(selected ? Theme.emerald : Theme.border, lineWidth: 1.5))
                    if selected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color(red: 4/255, green: 38/255, blue: 26/255))
                    }
                }
            }
            .padding(10)
            .background(selected ? Theme.emerald.opacity(0.10) : Theme.card)
            .clipShape(.rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(selected ? Theme.emerald : Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
