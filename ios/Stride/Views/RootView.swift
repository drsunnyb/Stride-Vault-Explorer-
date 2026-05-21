import SwiftUI

struct RootView: View {
    @State private var store = VaultStore()
    @State private var selectedTab: Tab = .map
    @State private var showOnboarding = true
    @State private var showPaywall = false
    @State private var lastClaimedCount = 0
    @State private var lastStreak = 0

    enum Tab: Hashable { case map, rewards, leaderboard, friends, profile }

    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                mapTabRoot
                    .tabItem { Label("Map", systemImage: "map.fill") }
                    .tag(Tab.map)

                RewardsView(store: store)
                    .tabItem { Label("Rewards", systemImage: "gift.fill") }
                    .tag(Tab.rewards)

                LeaderboardView(store: store)
                    .tabItem { Label("Ladder", systemImage: "trophy.fill") }
                    .tag(Tab.leaderboard)

                FriendsView(store: store)
                    .tabItem { Label("Friends", systemImage: "person.2.fill") }
                    .tag(Tab.friends)

                ProfileView(store: store)
                    .tabItem { Label("Profile", systemImage: "person.crop.circle.fill") }
                    .tag(Tab.profile)
            }
            .tint(Theme.goldBright)
            .background(Theme.bg)
            .onAppear { configureTabBar() }
            .onChange(of: store.claimedIDs.count) { _, newValue in
                // Soft paywall after first vault claim
                if newValue > lastClaimedCount, newValue == 1 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                        store.requestPaywall(.firstClaim)
                    }
                }
                lastClaimedCount = newValue
            }
            .onChange(of: store.streak) { _, newValue in
                // 3-day streak re-trigger — once per ISO week.
                if newValue >= 3, lastStreak < 3 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                        store.requestPaywall(.streakThree)
                    }
                }
                lastStreak = newValue
            }
            .onChange(of: store.pendingPaywallTrigger) { _, newValue in
                if newValue != nil, !store.isPlus { showPaywall = true }
            }
            .onChange(of: showPaywall) { _, isShown in
                if isShown {
                    store.markPaywallShown()
                } else {
                    store.pendingPaywallTrigger = nil
                }
            }

            // Inventory sheet trigger (accessible via Profile)
        }
        .preferredColorScheme(.dark)
        .fullScreenCover(isPresented: $showOnboarding) {
            OnboardingView(store: store, onDone: { showOnboarding = false })
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView()
        }
    }

    /// Branch the Map tab on London-vs-waitlist. Players outside the live
    /// London radius see the waitlist home (share + leaderboard + their own
    /// stats) instead of the London map.
    @ViewBuilder
    private var mapTabRoot: some View {
        if let homeId = store.homeCityId, homeId != Cities.liveId {
            CityWaitlistHomeView(store: store)
        } else {
            ContentView(store: store)
        }
    }

    private func configureTabBar() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Theme.bgElev)
        appearance.shadowColor = UIColor(Theme.border)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

#Preview {
    RootView()
}
