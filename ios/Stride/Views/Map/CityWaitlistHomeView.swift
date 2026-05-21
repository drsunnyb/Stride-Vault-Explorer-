import SwiftUI
import CoreLocation

/// Map-tab home for players outside the London live zone. The London map is
/// hidden until their geolocation enters the ~25mi unlock radius — instead
/// they get a rallying card (share to mint city votes), their own stats, and
/// the city leaderboard so they can chase #1. Mirrors
/// `expo/components/CityWaitlistHome.tsx` so the experience is identical
/// across platforms.
struct CityWaitlistHomeView: View {
    let store: VaultStore
    @State private var location = LocationService.shared
    @State private var checking: Bool = false
    @State private var statusMessage: String?
    @State private var showShare: Bool = false
    @State private var shareItems: [Any] = []
    @State private var navToCities: Bool = false

    private var homeCity: City? { store.homeCity }
    private var board: [VaultStore.CityLeaderboardRow] { store.cityLeaderboard() }
    private var top5: [VaultStore.CityLeaderboardRow] { Array(board.prefix(5)) }
    private var homeRow: VaultStore.CityLeaderboardRow? {
        board.first { $0.city.id == store.homeCityId }
    }
    private var rank: Int { store.homeCityRank }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 20) {
                        header
                        if let city = homeCity {
                            heroCard(city: city)
                            statsCard
                            leaderboardSection
                            liveCallout
                            changeCityButton
                            footer(city: city)
                        } else {
                            pickPrompt
                        }
                    }
                    .padding(.bottom, 36)
                }
            }
            .navigationDestination(isPresented: $navToCities) {
                CitiesView(store: store)
            }
            .sheet(isPresented: $showShare) {
                ShareSheet(items: shareItems)
            }
            .alert(
                statusMessage ?? "",
                isPresented: Binding(
                    get: { statusMessage != nil },
                    set: { if !$0 { statusMessage = nil } }
                )
            ) {
                Button("OK", role: .cancel) { statusMessage = nil }
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 10) {
            CoinIcon(size: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text("STRIDE QUEST")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .tracking(2)
                    .foregroundStyle(Theme.text)
                Text("\((homeCity?.name ?? "").uppercased()) · WAITLIST")
                    .font(.system(size: 9, weight: .heavy)).tracking(1.4)
                    .foregroundStyle(Theme.textDim)
            }
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
    }

    // MARK: - Hero card

    private func heroCard(city: City) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "globe")
                        .font(.system(size: 11, weight: .heavy))
                    Text("WAITLIST")
                        .font(.system(size: 10, weight: .black, design: .rounded))
                        .tracking(1.4)
                }
                .foregroundStyle(Theme.goldBright)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Theme.goldBright.opacity(0.14))
                .clipShape(Capsule())

                Spacer()

                VStack(spacing: 0) {
                    Text("#\(rank == 0 ? "—" : String(rank))")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                    Text("RANK")
                        .font(.system(size: 9, weight: .heavy)).tracking(1.2)
                        .foregroundStyle(Theme.textDim)
                }
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(Color.white.opacity(0.04))
                .clipShape(.rect(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))
            }

            HStack(spacing: 14) {
                Text(city.flag).font(.system(size: 48))
                VStack(alignment: .leading, spacing: 2) {
                    Text(city.name)
                        .font(.system(size: 26, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.text)
                    Text(city.country)
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundStyle(Theme.textMuted)
                }
                Spacer()
            }

            Text("Stride isn't live in \(city.name) yet — the city with the most votes opens next. Walk and share to push it up the leaderboard.")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.textMuted)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 8) {
                miniStat(value: "\((homeRow?.mine ?? 0).formatted())", label: "YOUR VOTES", accent: Theme.goldBright)
                miniStat(value: "\((homeRow?.total ?? 0).formatted())", label: "CITY TOTAL", accent: Theme.emerald)
                miniStat(value: "\(store.stepsToNextCityVote.formatted())", label: "NEXT VOTE", sub: "steps", accent: Theme.sapphire)
            }

            Button {
                Haptics.tap()
                shareItems = [shareMessage(for: city)]
                store.addCityVotes(CityWaitlistConfig.sharePerVote)
                showShare = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "square.and.arrow.up.fill")
                        .font(.system(size: 14, weight: .bold))
                    Text("SHARE — +\(CityWaitlistConfig.sharePerVote) VOTES")
                        .font(.system(size: 13, weight: .black, design: .rounded))
                        .tracking(1.4)
                }
                .foregroundStyle(Theme.bg)
                .frame(maxWidth: .infinity).frame(height: 52)
                .background(Theme.goldBright)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)

            Button {
                Haptics.tap()
                checkLondonLocation()
            } label: {
                HStack(spacing: 8) {
                    if checking {
                        ProgressView().tint(Theme.text)
                    } else {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 12, weight: .bold))
                    }
                    Text(checking ? "CHECKING…" : "I'M IN LONDON — CHECK MY LOCATION")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .tracking(1.2)
                }
                .foregroundStyle(Theme.text)
                .frame(maxWidth: .infinity).frame(height: 42)
                .background(Color.white.opacity(0.04))
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .disabled(checking)
        }
        .padding(18)
        .background(
            LinearGradient(
                colors: [Color(red: 0.063, green: 0.102, blue: 0.212), Theme.bgElev, Theme.bg],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Theme.border, lineWidth: 1))
        .padding(.horizontal, 16)
    }

    private func miniStat(value: String, label: String, sub: String? = nil, accent: Color) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 15, weight: .black, design: .rounded))
                .foregroundStyle(accent)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            if let sub {
                Text(sub).font(.system(size: 9, weight: .heavy))
                    .foregroundStyle(Theme.textDim)
            }
            Text(label).font(.system(size: 9, weight: .heavy)).tracking(1.1)
                .foregroundStyle(Theme.textDim)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.04))
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1))
    }

    // MARK: - Stats card (your progress)

    private var statsCard: some View {
        VStack(spacing: 14) {
            sectionTitle("YOUR PROGRESS")

            VStack(spacing: 14) {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("@\(store.handle.replacingOccurrences(of: "@", with: ""))")
                            .font(.system(size: 16, weight: .black, design: .rounded))
                            .foregroundStyle(Theme.text)
                        Text("LEVEL \(store.level) · \(store.coins.formatted()) coins")
                            .font(.system(size: 11, weight: .heavy))
                            .foregroundStyle(Theme.textMuted)
                    }
                    Spacer()
                    VStack(spacing: 0) {
                        Text("\(store.streak)")
                            .font(.system(size: 18, weight: .black, design: .rounded))
                            .foregroundStyle(Theme.goldBright)
                        Text("STREAK")
                            .font(.system(size: 8, weight: .black)).tracking(1.2)
                            .foregroundStyle(Theme.textDim)
                    }
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .background(Theme.goldBright.opacity(0.10))
                    .clipShape(.rect(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.goldBright.opacity(0.4), lineWidth: 1))
                }

                progressBar(
                    icon: "figure.walk",
                    iconColor: Theme.emerald,
                    label: "STEPS TODAY",
                    value: "\(store.todaySteps.formatted()) / \(store.stepGoal.formatted())",
                    pct: min(1, Double(store.todaySteps) / Double(max(1, store.stepGoal))),
                    fill: Theme.emerald
                )

                progressBar(
                    icon: "trophy.fill",
                    iconColor: Theme.goldBright,
                    label: "XP TO LEVEL \(store.level + 1)",
                    value: "\(store.xp.formatted()) / \(store.xpForLevel(store.level).formatted())",
                    pct: min(1, Double(store.xp) / Double(max(1, store.xpForLevel(store.level)))),
                    fill: Theme.goldBright
                )

                HStack(spacing: 12) {
                    miniLine(label: "LIFETIME STEPS", value: "\(store.lifetimeSteps.formatted())")
                    miniLine(label: "VAULTS", value: "\(store.claimedIDs.count)")
                    miniLine(label: "FREEZES", value: "\(store.streakFreezes)")
                }
            }
            .padding(16)
            .background(Theme.bgElev)
            .clipShape(.rect(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.border, lineWidth: 1))
            .padding(.horizontal, 16)
        }
    }

    private func progressBar(icon: String, iconColor: Color, label: String, value: String, pct: Double, fill: Color) -> some View {
        VStack(spacing: 6) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: icon).font(.system(size: 12, weight: .bold))
                        .foregroundStyle(iconColor)
                    Text(label).font(.system(size: 10, weight: .black)).tracking(1.2)
                        .foregroundStyle(Theme.textDim)
                }
                Spacer()
                Text(value).font(.system(size: 11, weight: .heavy))
                    .foregroundStyle(Theme.text)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.05))
                    Capsule().fill(fill).frame(width: geo.size.width * pct)
                }
            }
            .frame(height: 8)
        }
    }

    private func miniLine(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Text(label).font(.system(size: 9, weight: .heavy)).tracking(1.1)
                .foregroundStyle(Theme.textDim)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Leaderboard

    private var leaderboardSection: some View {
        VStack(spacing: 10) {
            HStack {
                Text("CITY LEADERBOARD")
                    .font(.system(size: 11, weight: .black)).tracking(1.6)
                    .foregroundStyle(Theme.text)
                Spacer()
                Button {
                    Haptics.tap(); navToCities = true
                } label: {
                    HStack(spacing: 2) {
                        Text("VIEW ALL")
                            .font(.system(size: 10, weight: .black)).tracking(1.3)
                        Image(systemName: "chevron.right").font(.system(size: 10, weight: .bold))
                    }
                    .foregroundStyle(Theme.goldBright)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 18)

            VStack(spacing: 0) {
                ForEach(Array(top5.enumerated()), id: \.element.id) { i, row in
                    HStack(spacing: 12) {
                        Text("#\(i + 1)")
                            .font(.system(size: 12, weight: .black))
                            .foregroundStyle(Theme.textDim)
                            .frame(width: 28, alignment: .leading)
                        Text(row.city.flag).font(.system(size: 22))
                        VStack(alignment: .leading, spacing: 1) {
                            Text(row.city.name)
                                .font(.system(size: 14, weight: .black, design: .rounded))
                                .foregroundStyle(Theme.text)
                            Text(row.city.tagline)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Theme.textMuted)
                                .lineLimit(1)
                        }
                        Spacer()
                        if row.isHome {
                            Text("YOU")
                                .font(.system(size: 9, weight: .black)).tracking(1)
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
                    if i < top5.count - 1 {
                        Divider().background(Theme.border)
                    }
                }
            }
            .background(Theme.bgElev)
            .clipShape(.rect(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.border, lineWidth: 1))
            .padding(.horizontal, 16)
        }
    }

    // MARK: - London live callout

    private var liveCallout: some View {
        HStack(spacing: 12) {
            Image(systemName: "crown.fill")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Theme.goldBright)
            VStack(alignment: .leading, spacing: 2) {
                Text("London is live")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.goldBright)
                Text("1,100 vaults · 9,088 walkers · ~25mi unlock zone")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
            Text("LIVE")
                .font(.system(size: 10, weight: .black)).tracking(1.2)
                .foregroundStyle(Theme.bg)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Theme.emerald)
                .clipShape(Capsule())
        }
        .padding(14)
        .background(Theme.goldBright.opacity(0.06))
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.goldBright.opacity(0.25), lineWidth: 1))
        .padding(.horizontal, 16)
    }

    private var changeCityButton: some View {
        Button {
            Haptics.tap(); navToCities = true
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.system(size: 12, weight: .bold))
                Text("Change my city")
                    .font(.system(size: 11, weight: .black)).tracking(1)
            }
            .foregroundStyle(Theme.textDim)
            .padding(.horizontal, 14).padding(.vertical, 8)
            .background(Color.white.opacity(0.04))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func footer(city: City) -> some View {
        Text("Coins keep minting wherever you walk. The moment \(city.name) hits #1, you'll unlock its vaults instantly with everything you've banked.")
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(Theme.textDim)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 28)
            .padding(.top, 6)
    }

    private var pickPrompt: some View {
        VStack(spacing: 16) {
            Text("Pick your city")
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Button {
                Haptics.tap(); navToCities = true
            } label: {
                Text("OPEN CITY PICKER")
                    .font(.system(size: 13, weight: .black)).tracking(1.4)
                    .foregroundStyle(Theme.bg)
                    .frame(maxWidth: .infinity).frame(height: 52)
                    .background(Theme.goldBright)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16)
        }
        .padding(.top, 60)
    }

    private func sectionTitle(_ text: String) -> some View {
        HStack {
            Text(text)
                .font(.system(size: 11, weight: .black)).tracking(1.6)
                .foregroundStyle(Theme.text)
            Spacer()
        }
        .padding(.horizontal, 18)
    }

    // MARK: - Location re-check

    private func checkLondonLocation() {
        checking = true
        location.start()
        // Give the manager a moment to publish a fresh fix.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            defer { checking = false }
            let auth = location.authorization
            guard auth == .authorizedWhenInUse || auth == .authorizedAlways else {
                statusMessage = "Turn on location in Settings so we can check if you're in London."
                return
            }
            guard let coord = location.coordinate else {
                statusMessage = "Couldn't get a location fix. Step outside and try again."
                return
            }
            if Cities.isInLondon(lat: coord.latitude, lng: coord.longitude) {
                store.setHomeCity(Cities.liveId)
                statusMessage = "You're in London — unlocking 1,100 vaults around you."
            } else {
                let name = homeCity?.name ?? "your city"
                statusMessage = "Still on the waitlist. We've got you in \(name) — keep walking + sharing to push it to the top."
            }
        }
    }

    // MARK: - Share

    private func shareMessage(for city: City) -> String {
        let refCode = "STRIDE-\(store.handle.replacingOccurrences(of: "@", with: "").uppercased().prefix(6))"
        return """
        \(city.flag) I'm rallying \(city.name) to open next on Stride — every step earns coins AND votes my city up the waitlist.

        Join with my code \(refCode) → we both get 500 coins, and you'll lock in your vote for \(city.name).

        https://rork.app/stride-quest?ref=\(refCode)&city=\(city.id)
        """
    }
}

/// Small UIActivity wrapper used by both the cities + waitlist screens.
private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}
