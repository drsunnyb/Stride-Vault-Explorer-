import SwiftUI

/// Global City Waitlist — the rallying point for players outside London.
///
/// Each player picks a home city and mints votes from steps + shares + referrals.
/// The leaderboard shows seeded baselines (so it feels alive on day one) plus
/// this player's contribution. Top voted city opens next.
struct CitiesView: View {
    let store: VaultStore
    @Environment(\.dismiss) private var dismiss
    @State private var showPicker = false
    @State private var filter: String = ""
    @State private var shareItems: [Any] = []
    @State private var showShare: Bool = false

    private var board: [VaultStore.CityLeaderboardRow] { store.cityLeaderboard() }
    private var top3: [VaultStore.CityLeaderboardRow] { Array(board.prefix(3)) }
    private var rest: [VaultStore.CityLeaderboardRow] { Array(board.dropFirst(3)) }
    private var totalVotes: Int { board.reduce(0) { $0 + $1.total } }
    private var homeRow: VaultStore.CityLeaderboardRow? {
        board.first { $0.city.id == store.homeCityId }
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 18) {
                    yourCard
                    if !top3.isEmpty { podium }
                    liveCallout
                    listSection
                    footerNote
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Next city")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { dismiss() } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundStyle(Theme.text)
                }
            }
        }
        .sheet(isPresented: $showPicker) {
            CityPickerSheet(store: store, filter: $filter)
                .presentationDetents([.large])
        }
        .sheet(isPresented: $showShare) {
            ActivityView(items: shareItems)
        }
    }

    // MARK: - Sections

    private var yourCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "globe")
                        .font(.system(size: 11, weight: .heavy))
                    Text("YOUR CITY")
                        .font(.system(size: 10, weight: .heavy, design: .rounded))
                        .tracking(1.4)
                }
                .foregroundStyle(Theme.goldBright)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Theme.goldBright.opacity(0.12))
                .clipShape(Capsule())

                Spacer()

                Button {
                    Haptics.tap(); showPicker = true
                } label: {
                    Text(store.homeCity == nil ? "PICK" : "CHANGE")
                        .font(.system(size: 10, weight: .heavy, design: .rounded))
                        .tracking(1.2)
                        .foregroundStyle(Theme.text)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(Theme.card)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }

            if let home = store.homeCity {
                HStack(spacing: 12) {
                    Text(home.flag).font(.system(size: 44))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(home.name)
                            .font(.system(size: 22, weight: .black, design: .rounded))
                            .foregroundStyle(Theme.text)
                        Text(home.country)
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundStyle(Theme.textMuted)
                    }
                    Spacer()
                    if home.id == Cities.liveId {
                        Text("LIVE")
                            .font(.system(size: 10, weight: .heavy)).tracking(1.2)
                            .foregroundStyle(Theme.bg)
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(Theme.emerald)
                            .clipShape(.rect(cornerRadius: 12))
                    } else {
                        VStack(spacing: 2) {
                            Text("#\(store.homeCityRank)")
                                .font(.system(size: 18, weight: .black, design: .rounded))
                                .foregroundStyle(Theme.goldBright)
                            Text("RANK")
                                .font(.system(size: 9, weight: .heavy))
                                .tracking(1.1)
                                .foregroundStyle(Theme.textDim)
                        }
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Theme.bg)
                        .clipShape(.rect(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))
                    }
                }

                if home.id != Cities.liveId {
                    HStack(spacing: 8) {
                        statCard(label: "YOUR VOTES",
                                 value: "\((homeRow?.mine ?? 0).formatted())",
                                 accent: Theme.goldBright)
                        statCard(label: "TOTAL",
                                 value: "\((homeRow?.total ?? 0).formatted())",
                                 accent: Theme.emerald)
                        statCard(label: "NEXT IN",
                                 value: "\(store.stepsToNextCityVote.formatted())",
                                 accent: Theme.sapphire)
                    }

                    Button {
                        Haptics.tap()
                        shareItems = [shareMessage(for: home)]
                        store.addCityVotes(CityWaitlistConfig.sharePerVote)
                        showShare = true
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "square.and.arrow.up.fill")
                                .font(.system(size: 14, weight: .bold))
                            Text("SHARE — +\(CityWaitlistConfig.sharePerVote) VOTES")
                                .font(.system(size: 13, weight: .heavy, design: .rounded))
                                .tracking(1.4)
                        }
                        .foregroundStyle(Theme.bg)
                        .frame(maxWidth: .infinity).frame(height: 50)
                        .background(Theme.goldBright)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    Text("Every \(CityWaitlistConfig.stepsPerVote.formatted()) steps = +1 vote · Each referred friend = +\(CityWaitlistConfig.referralPerVote) · Coins still mint normally")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.textMuted)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                } else {
                    Text("London is live. Hunt all 1,100 vaults across Greater London.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.textMuted)
                }
            } else {
                Button {
                    Haptics.tap(); showPicker = true
                } label: {
                    Text("Tap to pick your city →")
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .tracking(1)
                        .foregroundStyle(Theme.goldBright)
                        .frame(maxWidth: .infinity).frame(height: 56)
                        .background(Theme.card)
                        .clipShape(.rect(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .strokeBorder(Theme.border, style: StrokeStyle(lineWidth: 1, dash: [4]))
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.border, lineWidth: 1))
    }

    private func statCard(label: String, value: String, accent: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 15, weight: .black, design: .rounded))
                .foregroundStyle(accent)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.system(size: 8, weight: .heavy))
                .tracking(1.2)
                .foregroundStyle(Theme.textDim)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Theme.bg)
        .clipShape(.rect(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))
    }

    private var podium: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("LEADERBOARD")
                .font(.system(size: 10, weight: .heavy)).tracking(1.6)
                .foregroundStyle(Theme.textMuted)

            HStack(spacing: 8) {
                ForEach(Array(top3.enumerated()), id: \.offset) { i, row in
                    podiumCard(rank: i + 1, row: row)
                }
            }
        }
    }

    private func podiumCard(rank: Int, row: VaultStore.CityLeaderboardRow) -> some View {
        let borderColor: Color = rank == 1 ? Theme.goldBright
            : rank == 2 ? Color(.systemGray2)
            : Color(red: 0.80, green: 0.50, blue: 0.20)
        return VStack(spacing: 4) {
            Text("#\(rank)")
                .font(.system(size: 11, weight: .heavy)).tracking(1)
                .foregroundStyle(Theme.textMuted)
            Text(row.city.flag).font(.system(size: 28))
            Text(row.city.name)
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(row.total.formatted())
                .font(.system(size: 13, weight: .black, design: .rounded))
                .foregroundStyle(Theme.goldBright)
            if row.isHome {
                Text("YOU")
                    .font(.system(size: 9, weight: .heavy)).tracking(1)
                    .foregroundStyle(Theme.bg)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Theme.emerald)
                    .clipShape(Capsule())
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .padding(.horizontal, 6)
        .background(rank == 1 ? Theme.goldBright.opacity(0.08) : Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(row.isHome ? Theme.emerald : borderColor, lineWidth: row.isHome ? 2 : 1)
        )
    }

    private var liveCallout: some View {
        HStack {
            Image(systemName: "crown.fill")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Theme.goldBright)
            Text("London is live now")
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(Theme.goldBright)
            Spacer()
            Text("1,100 vaults · 9,088 walkers")
                .font(.system(size: 11, weight: .heavy))
                .foregroundStyle(Theme.textMuted)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(Theme.goldBright.opacity(0.06))
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.goldBright.opacity(0.25), lineWidth: 1))
    }

    private var listSection: some View {
        VStack(spacing: 0) {
            ForEach(Array(rest.enumerated()), id: \.element.id) { i, row in
                HStack(spacing: 12) {
                    Text("#\(i + 4)")
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundStyle(Theme.textDim)
                        .frame(width: 32, alignment: .leading)
                    Text(row.city.flag).font(.system(size: 22))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(row.city.name)
                            .font(.system(size: 14, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.text)
                        Text(row.city.tagline)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Theme.textMuted)
                    }
                    Spacer()
                    if row.isHome {
                        Text("YOU")
                            .font(.system(size: 9, weight: .heavy)).tracking(1)
                            .foregroundStyle(Theme.bg)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Theme.emerald)
                            .clipShape(Capsule())
                    }
                    Text(row.total.formatted())
                        .font(.system(size: 13, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(row.isHome ? Theme.emerald.opacity(0.08) : Color.clear)
                if i < rest.count - 1 {
                    Divider().background(Theme.border)
                }
            }
        }
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.border, lineWidth: 1))
    }

    private var footerNote: some View {
        Text("Total votes across all cities: \(totalVotes.formatted())\nNext review: end of the quarter. Top-voted city opens next.")
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(Theme.textDim)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 16)
            .padding(.top, 8)
    }

    private func shareMessage(for city: City) -> String {
        let refCode = "STRIDE-\(store.handle.replacingOccurrences(of: "@", with: "").uppercased().prefix(6))"
        return """
        \(city.flag) I'm rallying \(city.name) to open next on Stride — every step earns coins AND votes my city up the waitlist.

        Join with my code \(refCode) → we both get 500 coins, and you'll lock in your vote for \(city.name).

        https://rork.app/stride-quest?ref=\(refCode)&city=\(city.id)
        """
    }
}

// MARK: - City picker sheet

private struct CityPickerSheet: View {
    let store: VaultStore
    @Binding var filter: String
    @Environment(\.dismiss) private var dismiss

    private var items: [City] {
        let q = filter.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return Cities.all }
        return Cities.all.filter {
            $0.name.lowercased().contains(q) || $0.country.lowercased().contains(q)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TextField("", text: $filter,
                          prompt: Text("Search city or country…").foregroundColor(Theme.textDim))
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .padding(.horizontal, 14).padding(.vertical, 12)
                    .background(Theme.card)
                    .clipShape(.rect(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(items) { city in
                            Button {
                                Haptics.tap()
                                store.setHomeCity(city.id)
                                dismiss()
                            } label: {
                                cityRow(city)
                            }
                            .buttonStyle(.plain)
                            Divider().background(Theme.border).padding(.leading, 60)
                        }
                    }
                    .padding(.top, 8)
                }
            }
            .background(Theme.bg)
            .navigationTitle("Pick your city")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Theme.goldBright)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func cityRow(_ c: City) -> some View {
        let isCurrent = c.id == store.homeCityId
        return HStack(spacing: 12) {
            Text(c.flag).font(.system(size: 24))
            VStack(alignment: .leading, spacing: 2) {
                Text(c.name)
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.text)
                Text(c.country)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
            if c.status == .live {
                Text("LIVE")
                    .font(.system(size: 9, weight: .heavy)).tracking(1.1)
                    .foregroundStyle(Theme.bg)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Theme.emerald)
                    .clipShape(Capsule())
            }
            if isCurrent {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Theme.goldBright)
                    .font(.system(size: 18, weight: .bold))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(isCurrent ? Theme.goldBright.opacity(0.06) : Color.clear)
        .contentShape(Rectangle())
    }
}

// MARK: - Activity view (share sheet)

private struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}
