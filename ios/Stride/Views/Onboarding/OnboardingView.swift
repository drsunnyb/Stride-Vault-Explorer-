import SwiftUI
import CoreLocation
import CoreMotion

/// First-run onboarding — splash → carousel → sign-in → profile → step goal →
/// tribe → referral → motion/notifications/location permission primers → welcome.
/// Mirrors `expo/app/onboarding.tsx`: 11 ordered steps, mid-flow resume via
/// UserDefaults, real native permission prompts, confetti welcome.
struct OnboardingView: View {
    let store: VaultStore
    let onDone: () -> Void

    @State private var step: Step = .splash
    @State private var signedIn: Bool = false
    @State private var handle: String = ""
    @State private var firstName: String = ""
    @State private var avatarSeed: Int = 7
    @State private var stepGoal: Int = 8_000
    @State private var pickedTribe: String? = nil
    @State private var referral: String = ""
    @State private var motionGranted: Bool = false
    @State private var notifGranted: Bool = false
    @State private var locationGranted: Bool = false
    @State private var showEmailSheet = false
    @State private var orbAnimate = false
    @State private var pickedCityId: String? = nil
    @State private var cityFilter: String = ""

    // City comes BEFORE tribe so the tribe picker can show only relevant
    // clubs/boroughs for the player's home city.
    enum Step: String, CaseIterable {
        case splash, value, signIn, profile, goal, motion, notifications, location, city, tribe, referral, welcome
    }

    private static let resumeKey = "stride.onboarding.step.v2"

    private static let numberedSteps: [Step] = [
        .value, .profile, .goal, .motion, .notifications, .location, .city, .tribe, .referral
    ]

    private var canSkip: Bool {
        [.goal, .tribe, .referral, .motion, .notifications, .location].contains(step)
    }
    private var showProgress: Bool {
        ![.splash, .signIn, .welcome].contains(step)
    }
    private var progressIndex: Int {
        Self.numberedSteps.firstIndex(of: step).map { $0 + 1 } ?? 0
    }

    var body: some View {
        ZStack {
            OnboardingBackdrop(animate: $orbAnimate)
            VStack(spacing: 0) {
                if showProgress {
                    topBar.padding(.horizontal, 18).padding(.top, 12)
                }
                content
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)))
                    .id(step)
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showEmailSheet) {
            EmailSignInSheet(onDone: {
                showEmailSheet = false
                completeSignIn()
            })
            .presentationDetents([.medium])
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 6).repeatForever(autoreverses: true)) {
                orbAnimate = true
            }
            // Resume from saved step (unless welcome — re-show the final celebration on relaunch only if not done).
            if let raw = UserDefaults.standard.string(forKey: Self.resumeKey),
               let saved = Step(rawValue: raw), saved != .welcome {
                step = saved
            }
            if step == .splash {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { advance() }
            }
        }
        .onChange(of: step) { _, newValue in
            UserDefaults.standard.set(newValue.rawValue, forKey: Self.resumeKey)
        }
    }

    // MARK: - Chrome

    private var topBar: some View {
        HStack {
            Button {
                Haptics.tap()
                withAnimation(.snappy) { goBack() }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundStyle(Theme.textMuted)
                    .frame(width: 36, height: 36)
                    .background(Theme.card)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .opacity(progressIndex > 1 ? 1 : 0)

            Spacer()

            HStack(spacing: 5) {
                ForEach(0..<Self.numberedSteps.count, id: \.self) { i in
                    Capsule()
                        .fill(i < progressIndex ? Theme.goldBright : Theme.border)
                        .frame(width: i == progressIndex - 1 ? 22 : 6, height: 6)
                        .animation(.snappy, value: progressIndex)
                }
            }

            Spacer()

            if canSkip {
                Button("SKIP") {
                    Haptics.tap()
                    advance()
                }
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(Theme.textMuted)
                .frame(width: 36, height: 36)
            } else {
                Color.clear.frame(width: 36, height: 36)
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch step {
        case .splash:        SplashStep()
        case .value:         ValueStep(onNext: advance)
        case .signIn:        signIn
        case .profile:       profile
        case .goal:          goalPicker
        case .tribe:         tribePicker
        case .referral:      referralStep
        case .motion:        motionStep
        case .notifications: notificationsStep
        case .location:      locationStep
        case .city:          cityStep
        case .welcome:       welcome
        }
    }

    // MARK: - Steps

    private var signIn: some View {
        VStack(spacing: 16) {
            Spacer()
            VStack(spacing: 10) {
                Text("Welcome")
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                Text("Sign in to save your coins, streak and rewards.")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            Spacer()
            VStack(spacing: 12) {
                signInButton(label: "Continue with Apple", systemImage: "applelogo",
                             bg: .white, fg: .black)
                signInButton(label: "Continue with Google", systemImage: "g.circle.fill",
                             bg: Theme.card, fg: Theme.text)
                signInButton(label: "Continue with Email", systemImage: "envelope.fill",
                             bg: Theme.card, fg: Theme.text) {
                    showEmailSheet = true
                }
            }
            .padding(.horizontal, 20)
            Text("By continuing you agree to our Terms & Privacy Policy.")
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(Theme.textDim)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
                .padding(.bottom, 28)
        }
    }

    private func signInButton(label: String, systemImage: String, bg: Color, fg: Color,
                              action: (() -> Void)? = nil) -> some View {
        Button {
            Haptics.tap()
            if let action { action() } else { completeSignIn() }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: systemImage).font(.system(size: 17, weight: .bold))
                Text(label).font(.system(size: 15, weight: .heavy, design: .rounded))
            }
            .foregroundStyle(fg)
            .frame(maxWidth: .infinity).frame(height: 54)
            .background(bg)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func completeSignIn() {
        signedIn = true
        if handle.isEmpty { handle = "@walker\(Int.random(in: 100...999))" }
        advance()
    }

    private var profile: some View {
        VStack(spacing: 20) {
            Spacer()
            Text("Pick your handle")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Button {
                Haptics.tap()
                avatarSeed = (avatarSeed + 1) % 12
            } label: {
                ZStack {
                    Circle().fill(Theme.card).frame(width: 110, height: 110)
                    Circle().stroke(Theme.goldBright, lineWidth: 3).frame(width: 110, height: 110)
                    Text(initials)
                        .font(.system(size: 38, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                }
            }
            .buttonStyle(.plain)

            VStack(spacing: 8) {
                input("Handle (e.g. kai)", text: $handle)
                handleAvailability
                input("First name (optional)", text: $firstName)
            }
            .padding(.horizontal, 20)
            Spacer()
            primaryCTA(title: "LOOKS GOOD", enabled: handleStatus != .taken) { advance() }
                .padding(.horizontal, 20).padding(.bottom, 24)
        }
    }

    enum HandleStatus { case empty, tooShort, badChars, taken, ok }
    private var handleStatus: HandleStatus {
        let h = handle.replacingOccurrences(of: "@", with: "").lowercased()
        if h.isEmpty { return .empty }
        if h.count < 3 { return .tooShort }
        if h.range(of: "^[a-z0-9._]+$", options: .regularExpression) == nil { return .badChars }
        let reserved: Set<String> = ["admin", "stride", "rork", "test", "sable", "junopark"]
        if reserved.contains(h) { return .taken }
        return .ok
    }

    @ViewBuilder
    private var handleAvailability: some View {
        switch handleStatus {
        case .empty: EmptyView()
        case .tooShort:
            Text("At least 3 characters.")
                .font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.textMuted)
                .frame(maxWidth: .infinity, alignment: .leading)
        case .badChars:
            Text("Letters, numbers, . or _ only.")
                .font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.ruby)
                .frame(maxWidth: .infinity, alignment: .leading)
        case .taken:
            HStack(spacing: 6) {
                Text("@\(handle.replacingOccurrences(of: "@", with: "")) is taken.")
                    .font(.system(size: 11, weight: .heavy)).foregroundStyle(Theme.ruby)
                Spacer()
                ForEach(handleSuggestions, id: \.self) { s in
                    Button {
                        Haptics.tap()
                        handle = s
                    } label: {
                        Text(s).font(.system(size: 10, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.text)
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(Theme.card).clipShape(Capsule())
                            .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        case .ok:
            HStack(spacing: 4) {
                Image(systemName: "checkmark.circle.fill").font(.system(size: 11, weight: .bold))
                Text("Available")
            }
            .font(.system(size: 11, weight: .heavy, design: .rounded))
            .foregroundStyle(Theme.emerald)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var handleSuggestions: [String] {
        let base = handle.replacingOccurrences(of: "@", with: "").lowercased()
        return ["\(base)1", "\(base)_uk", "the\(base)"]
    }

    private var initials: String {
        if !firstName.isEmpty { return firstName.prefix(1).uppercased() }
        let h = handle.replacingOccurrences(of: "@", with: "")
        return h.isEmpty ? "S" : h.prefix(2).uppercased()
    }

    private func input(_ placeholder: String, text: Binding<String>) -> some View {
        TextField("", text: text, prompt: Text(placeholder).foregroundColor(Theme.textDim))
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .foregroundStyle(Theme.text)
            .padding(.horizontal, 16).padding(.vertical, 14)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1))
    }

    private var goalPicker: some View {
        VStack(spacing: 18) {
            Spacer()
            Text("Daily step goal")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Text("Most people pick 8,000.")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.textMuted)
            HStack(spacing: 10) {
                ForEach([3_000, 5_000, 8_000, 10_000, 15_000], id: \.self) { g in
                    Button {
                        Haptics.tap()
                        withAnimation(.snappy) { stepGoal = g }
                    } label: {
                        VStack(spacing: 4) {
                            Text("\(g / 1000)k")
                                .font(.system(size: 18, weight: .black, design: .rounded))
                            Text("steps")
                                .font(.system(size: 10, weight: .heavy))
                                .tracking(1)
                        }
                        .foregroundStyle(stepGoal == g ? Theme.bg : Theme.textMuted)
                        .frame(maxWidth: .infinity).frame(height: 70)
                        .background(stepGoal == g ? Theme.goldBright : Theme.card)
                        .clipShape(.rect(cornerRadius: 16))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
            Spacer()
            primaryCTA(title: "SET GOAL") { advance() }
                .padding(.horizontal, 20).padding(.bottom, 24)
        }
    }

    private var tribePicker: some View {
        let cityName = pickedCityId.flatMap { Cities.byId[$0]?.name }
        let list = AppData.tribes(forCity: pickedCityId)
        return VStack(spacing: 16) {
            Spacer().frame(height: 12)
            Text("Pick your tribe")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Text(cityName.map { "Tribes for \($0) + global crews. Coins boost your club in the weekly derby." }
                 ?? "Your coins boost the club. Winners share the bonus pot.")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)
            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                    ForEach(list) { t in
                        Button {
                            Haptics.tap()
                            withAnimation(.snappy) { pickedTribe = t.id }
                        } label: {
                            TribeChoiceCard(tribe: t, selected: pickedTribe == t.id)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
            }
            primaryCTA(title: pickedTribe == nil ? "SKIP FOR NOW" : "JOIN TRIBE") { advance() }
                .padding(.horizontal, 20).padding(.bottom, 24)
        }
    }

    private var referralStep: some View {
        VStack(spacing: 18) {
            Spacer()
            Text("Got a code?")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Text("Friends share codes for +500 bonus coins.")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.textMuted)
            VStack(spacing: 6) {
                input("REFERRAL CODE", text: $referral)
                if !referral.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: referralValid ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                            .font(.system(size: 11, weight: .bold))
                        Text(referralValid ? "Looks good" : "4–10 letters or numbers.")
                    }
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundStyle(referralValid ? Theme.emerald : Theme.ruby)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.horizontal, 20)
            Spacer()
            primaryCTA(title: referral.isEmpty ? "SKIP" : "APPLY CODE") {
                if referralValid { _ = store.claimReferral() }
                advance()
            }
            .padding(.horizontal, 20).padding(.bottom, 24)
        }
    }

    private var referralValid: Bool {
        let v = referral.trimmingCharacters(in: .whitespaces).uppercased()
        return v.range(of: "^[A-Z0-9]{4,10}$", options: .regularExpression) != nil
    }

    // ── Permission primers ──────────────────────────────────────────────────
    private var motionStep: some View {
        PermissionPrimer(
            tint: Theme.emerald,
            illustration: AnyView(MotionIllustration()),
            title: "Count every step",
            blurb: "Stride uses Motion & Fitness to count your steps and mint coins automatically — even when the app's in your pocket.",
            primaryLabel: motionGranted ? "ALLOWED — CONTINUE" : "ALLOW MOTION",
            secondaryLabel: "Not now",
            primary: {
                Task {
                    motionGranted = await requestMotion()
                    advance()
                }
            },
            secondary: { advance() }
        )
    }

    private var notificationsStep: some View {
        PermissionPrimer(
            tint: Theme.sapphire,
            illustration: AnyView(NotificationIllustration()),
            title: "Never miss a Power Hour",
            blurb: "We'll ping you when a Power Hour starts, when a Hot Vault drops near you, and when your streak's about to break — nothing else.",
            primaryLabel: notifGranted ? "ALLOWED — CONTINUE" : "ENABLE NOTIFICATIONS",
            secondaryLabel: "Not now",
            primary: {
                Task {
                    notifGranted = await store.enableNotifications()
                    advance()
                }
            },
            secondary: { advance() }
        )
    }

    private var locationStep: some View {
        PermissionPrimer(
            tint: Theme.ruby,
            illustration: AnyView(LocationIllustration()),
            title: "Find vaults near you",
            blurb: "Location-while-using lets the map drop pins around you. We never track in the background — only when you've opened the app.",
            primaryLabel: locationGranted ? "ALLOWED — CONTINUE" : "ALLOW LOCATION",
            secondaryLabel: "Not now",
            primary: {
                let mgr = OnboardingLocation.shared
                mgr.request { granted in
                    locationGranted = granted
                    if granted {
                        mgr.oneShotLocation { coord in
                            if let coord, let c = Cities.detect(lat: coord.latitude, lng: coord.longitude) {
                                pickedCityId = c.id
                            }
                            advance()
                        }
                    } else {
                        advance()
                    }
                }
            },
            secondary: { advance() }
        )
    }

    // ── City step ──────────────────────────────────────────────────────────
    @State private var showShareSheet = false
    @State private var shareMessage: String = ""

    private func shareRallyMessage(_ city: City) -> String {
        let code = "STRIDE-" + handle.replacingOccurrences(of: "@", with: "")
            .uppercased()
            .filter { $0.isLetter || $0.isNumber }
            .prefix(6)
        return "\(city.flag) Help open Stride in \(city.name)! Every friend who joins with my code adds +50 votes — we both get 500 bonus coins.\n\nCode: \(code)\nhttps://rork.app/stride-quest?ref=\(code)&city=\(city.id)"
    }

    private var cityStep: some View {
        let inLondon = pickedCityId == Cities.liveId
        let picked = pickedCityId.flatMap { Cities.byId[$0] }
        let items: [City] = {
            let q = cityFilter.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            if q.isEmpty { return Cities.all }
            return Cities.all.filter {
                $0.name.lowercased().contains(q) || $0.country.lowercased().contains(q)
            }
        }()
        return VStack(spacing: 14) {
            Spacer().frame(height: 4)
            Text(inLondon ? "You're in London \u{1F1EC}\u{1F1E7}" : "Where are you?")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
            Text(inLondon
                 ? "London is live. Coins, vaults, the lot — hit the map and start hunting."
                 : "Pick your city. We're live in London now — votes from your steps and shares decide which city opens next.")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            if let picked, !inLondon {
                VStack(spacing: 10) {
                    HStack(spacing: 12) {
                        Text(picked.flag).font(.system(size: 36))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(picked.name)
                                .font(.system(size: 17, weight: .black, design: .rounded))
                                .foregroundStyle(Theme.text)
                            Text("\(picked.country) · \(picked.tagline)")
                                .font(.system(size: 11, weight: .heavy))
                                .foregroundStyle(Theme.textMuted)
                        }
                        Spacer()
                        Text("WAITLIST")
                            .font(.system(size: 9, weight: .heavy)).tracking(1.2)
                            .foregroundStyle(Theme.goldBright)
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(Theme.goldBright.opacity(0.14))
                            .clipShape(Capsule())
                    }
                    .padding(12)
                    .background(Theme.card)
                    .clipShape(.rect(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.goldBright, lineWidth: 1))

                    // Share-to-rally CTA — invite friends to push the city up the waitlist.
                    Button {
                        Haptics.tap()
                        shareMessage = shareRallyMessage(picked)
                        showShareSheet = true
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "square.and.arrow.up").font(.system(size: 14, weight: .heavy))
                            Text("INVITE FRIENDS — +50 VOTES EACH")
                                .font(.system(size: 12, weight: .black, design: .rounded)).tracking(1.2)
                        }
                        .foregroundStyle(Theme.bg)
                        .frame(maxWidth: .infinity).frame(height: 44)
                        .background(Theme.emerald)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    Text("Every step you walk + every friend you invite pushes \(picked.name) up the global waitlist. You’ll keep earning coins now — the map opens here when \(picked.name) hits #1.")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.textMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 6)
                }
                .padding(.horizontal, 16)
                .sheet(isPresented: $showShareSheet) {
                    ActivityShareView(message: shareMessage)
                        .presentationDetents([.medium, .large])
                }
            }

            if !inLondon {
                TextField("", text: $cityFilter,
                          prompt: Text("Search city or country…").foregroundColor(Theme.textDim))
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .padding(.horizontal, 14).padding(.vertical, 11)
                    .background(Theme.card)
                    .clipShape(.rect(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))
                    .padding(.horizontal, 16)

                ScrollView {
                    LazyVStack(spacing: 6) {
                        ForEach(items) { c in
                            Button {
                                Haptics.tap()
                                pickedCityId = c.id
                            } label: {
                                cityPickerRow(c, selected: c.id == pickedCityId)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16).padding(.bottom, 12)
                }
            } else {
                Spacer()
            }

            primaryCTA(title: inLondon ? "PERFECT — LET'S GO"
                       : picked != nil ? "RALLY \(picked!.name.uppercased())"
                       : "SKIP FOR NOW") { advance() }
                .padding(.horizontal, 20).padding(.bottom, 24)
        }
    }

    private func cityPickerRow(_ c: City, selected: Bool) -> some View {
        HStack(spacing: 12) {
            Text(c.flag).font(.system(size: 22))
            VStack(alignment: .leading, spacing: 1) {
                Text(c.name)
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
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
            if selected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Theme.goldBright)
                    .font(.system(size: 16, weight: .bold))
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 11)
        .background(selected ? Theme.goldBright.opacity(0.08) : Theme.card)
        .clipShape(.rect(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12)
            .stroke(selected ? Theme.goldBright : Theme.border, lineWidth: 1))
        .contentShape(Rectangle())
    }

    // ── Welcome ─────────────────────────────────────────────────────────────
    @State private var welcomeAnim = false
    private var welcome: some View {
        ZStack {
            ConfettiView()
                .allowsHitTesting(false)
            VStack(spacing: 22) {
                Spacer()
                ZStack {
                    Circle()
                        .fill(LinearGradient(colors: [Theme.goldBright, Theme.gold],
                                             startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: 130, height: 130)
                        .shadow(color: Theme.goldBright.opacity(0.6), radius: 36)
                        .scaleEffect(welcomeAnim ? 1.06 : 0.9)
                    Text("+100")
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(Theme.bg)
                        .contentTransition(.numericText())
                }
                Text("You're in.")
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                Text("Welcome bonus: 100 coins. Find your first vault on the map.")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)
                Spacer()
                primaryCTA(title: "START WALKING") {
                    Haptics.success()
                    applyAndFinish()
                }
                .padding(.horizontal, 20).padding(.bottom, 24)
            }
        }
        .onAppear {
            Haptics.success()
            withAnimation(.spring(response: 0.7, dampingFraction: 0.55).repeatForever(autoreverses: true)) {
                welcomeAnim = true
            }
        }
    }

    // MARK: - Helpers

    private func primaryCTA(title: String, enabled: Bool = true, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            Text(title)
                .font(.system(size: 15, weight: .black, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(Theme.bg)
                .frame(maxWidth: .infinity).frame(height: 56)
                .background(LinearGradient(colors: [Theme.goldBright, Theme.gold],
                                            startPoint: .leading, endPoint: .trailing))
                .clipShape(Capsule())
                .shadow(color: Theme.goldBright.opacity(enabled ? 0.5 : 0), radius: 16, y: 8)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.5)
    }

    private func advance() {
        guard let idx = Step.allCases.firstIndex(of: step), idx < Step.allCases.count - 1 else { return }
        withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
            step = Step.allCases[idx + 1]
        }
    }

    private func goBack() {
        guard let idx = Step.allCases.firstIndex(of: step), idx > 1 else { return }  // can't go behind splash
        step = Step.allCases[idx - 1]
    }

    private func requestMotion() async -> Bool {
        guard CMPedometer.isStepCountingAvailable() else { return false }
        return await withCheckedContinuation { cont in
            let p = CMPedometer()
            p.queryPedometerData(from: Date().addingTimeInterval(-60), to: Date()) { _, error in
                cont.resume(returning: error == nil)
            }
        }
    }

    private func applyAndFinish() {
        let finalHandle = handle.isEmpty ? "@walker" : (handle.hasPrefix("@") ? handle : "@" + handle)
        let finalName = firstName.isEmpty ? "You" : firstName
        if let cityId = pickedCityId { store.setHomeCity(cityId) }
        _ = store.completeOnboarding(
            handle: finalHandle,
            displayName: finalName,
            avatarSeed: avatarSeed,
            stepGoal: stepGoal,
            tribeId: pickedTribe
        )
        UserDefaults.standard.removeObject(forKey: Self.resumeKey)
        onDone()
    }
}

// MARK: - Step views

private struct SplashStep: View {
    @State private var animate = false
    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: [Theme.goldBright, Theme.gold],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 140, height: 140)
                    .shadow(color: Theme.goldBright.opacity(0.6), radius: animate ? 50 : 20)
                    .scaleEffect(animate ? 1.05 : 0.9)
                Image(systemName: "figure.walk")
                    .font(.system(size: 60, weight: .black))
                    .foregroundStyle(Theme.bg)
            }
            Text("STRIDE")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .tracking(8)
                .foregroundStyle(Theme.text)
            Text("Every step pays.")
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.textMuted)
            Spacer()
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                animate = true
            }
        }
    }
}

private struct ValueStep: View {
    let onNext: () -> Void
    @State private var idx: Int = 0
    var body: some View {
        VStack(spacing: 24) {
            TabView(selection: $idx) {
                CarouselSlide(emoji: "🚶", title: "Walk. Anywhere.",
                              copy: "Steps from any sensor — Apple Health, manual log, whatever you wear.").tag(0)
                CarouselSlide(emoji: "🪙", title: "Turn steps into coins.",
                              copy: "Hit Power Hours, claim vaults across the city, stack your streak.").tag(1)
                CarouselSlide(emoji: "🎁", title: "Spend on real rewards.",
                              copy: "Nike vouchers, Apple credit, raffle drops — and more partners every week.").tag(2)
            }
            .tabViewStyle(.page)
            .indexViewStyle(.page(backgroundDisplayMode: .never))
            .frame(maxHeight: .infinity)
            Button {
                Haptics.tap()
                if idx < 2 { withAnimation { idx += 1 } } else { onNext() }
            } label: {
                Text(idx == 2 ? "GET STARTED" : "NEXT")
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .tracking(1.4)
                    .foregroundStyle(Theme.bg)
                    .frame(maxWidth: .infinity).frame(height: 56)
                    .background(LinearGradient(colors: [Theme.goldBright, Theme.gold],
                                                startPoint: .leading, endPoint: .trailing))
                    .clipShape(Capsule())
                    .shadow(color: Theme.goldBright.opacity(0.5), radius: 16, y: 8)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 20)
        }
        .padding(.bottom, 28)
    }
}

private struct CarouselSlide: View {
    let emoji: String
    let title: String
    let copy: String
    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            Text(emoji).font(.system(size: 96))
            Text(title)
                .font(.system(size: 30, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
                .multilineTextAlignment(.center)
            Text(copy)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }
}

private struct TribeChoiceCard: View {
    let tribe: Tribe
    let selected: Bool
    var body: some View {
        VStack(spacing: 8) {
            Text(tribe.emoji).font(.system(size: 28))
            Text(tribe.name)
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Text(tribe.area)
                .font(.system(size: 10, weight: .heavy)).tracking(1)
                .foregroundStyle(Theme.textMuted)
            Text("\(tribe.memberCount.formatted()) members")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Theme.textDim)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(selected ? Color(hex: tribe.hex).opacity(0.25) : Theme.card)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(selected ? Color(hex: tribe.hex) : Theme.border, lineWidth: selected ? 2 : 1)
        )
    }
}

// MARK: - Permission primer

private struct PermissionPrimer: View {
    let tint: Color
    let illustration: AnyView
    let title: String
    let blurb: String
    let primaryLabel: String
    let secondaryLabel: String
    let primary: () -> Void
    let secondary: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            illustration
                .frame(height: 200)
                .padding(.horizontal, 28)
            Text(title)
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)
            Text(blurb)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .lineSpacing(3)
            Spacer()
            VStack(spacing: 8) {
                Button {
                    Haptics.tap()
                    primary()
                } label: {
                    Text(primaryLabel)
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .tracking(1.4)
                        .foregroundStyle(Theme.bg)
                        .frame(maxWidth: .infinity).frame(height: 54)
                        .background(LinearGradient(colors: [tint, tint.opacity(0.75)],
                                                    startPoint: .leading, endPoint: .trailing))
                        .clipShape(Capsule())
                        .shadow(color: tint.opacity(0.5), radius: 14, y: 6)
                }
                .buttonStyle(.plain)
                Button(secondaryLabel) {
                    Haptics.tap()
                    secondary()
                }
                .font(.system(size: 12, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.textMuted)
                .padding(.top, 4)
            }
            .padding(.horizontal, 20).padding(.bottom, 24)
        }
    }
}

private struct MotionIllustration: View {
    @State private var pulse = false
    var body: some View {
        ZStack {
            ForEach(0..<3) { i in
                Circle()
                    .stroke(Theme.emerald.opacity(0.6 - Double(i) * 0.18), lineWidth: 2)
                    .frame(width: CGFloat(80 + i * 40), height: CGFloat(80 + i * 40))
                    .scaleEffect(pulse ? 1.05 : 0.85)
                    .opacity(pulse ? 0.4 : 1)
                    .animation(.easeInOut(duration: 1.4 + Double(i) * 0.2).repeatForever(autoreverses: true), value: pulse)
            }
            Image(systemName: "figure.walk.motion")
                .font(.system(size: 70, weight: .black))
                .foregroundStyle(Theme.emerald)
        }
        .onAppear { pulse = true }
    }
}

private struct NotificationIllustration: View {
    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 10) {
                ZStack {
                    Circle().fill(Theme.sapphire).frame(width: 36, height: 36)
                    Image(systemName: "bolt.fill").font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("Power Hour in 5 min · 3×")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.text)
                    Text("Drop everything — every vault pays 3× for one hour.")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                        .lineLimit(2)
                }
                Spacer()
            }
            .padding(12)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1))
            HStack(spacing: 10) {
                ZStack {
                    Circle().fill(Theme.ruby).frame(width: 36, height: 36)
                    Image(systemName: "flame.fill").font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("Don't break your 6-day streak")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.text)
                    Text("Claim one more vault before midnight.")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                }
                Spacer()
            }
            .padding(12)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1))
        }
    }
}

private struct LocationIllustration: View {
    @State private var ping = false
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 22)
                .fill(LinearGradient(colors: [Theme.card, Theme.bgElev],
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
            // Grid lines fake-map
            ForEach(0..<4) { i in
                Rectangle().fill(Theme.border.opacity(0.4)).frame(height: 0.5)
                    .offset(y: CGFloat(i * 30 - 45))
            }
            ForEach(0..<6) { i in
                Rectangle().fill(Theme.border.opacity(0.4)).frame(width: 0.5)
                    .offset(x: CGFloat(i * 40 - 100))
            }
            // Pins
            ForEach(0..<5) { i in
                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Theme.goldBright)
                    .offset(x: CGFloat([-60, -10, 30, 70, -30][i]),
                            y: CGFloat([-30, 20, -10, 30, 50][i]))
            }
            // Player ping
            ZStack {
                Circle().stroke(Theme.ruby.opacity(0.8), lineWidth: 2)
                    .frame(width: 56, height: 56)
                    .scaleEffect(ping ? 1.3 : 0.6)
                    .opacity(ping ? 0 : 1)
                Circle().fill(Theme.ruby).frame(width: 14, height: 14)
                Circle().stroke(.white, lineWidth: 2).frame(width: 14, height: 14)
            }
        }
        .clipShape(.rect(cornerRadius: 22))
        .onAppear {
            withAnimation(.easeOut(duration: 1.6).repeatForever(autoreverses: false)) {
                ping = true
            }
        }
    }
}

// MARK: - Confetti

private struct ConfettiView: View {
    private struct Piece: Identifiable {
        let id = UUID()
        let x: CGFloat
        let delay: Double
        let color: Color
        let rotation: Double
    }
    private let pieces: [Piece] = (0..<40).map { i in
        Piece(
            x: CGFloat.random(in: 0...1),
            delay: Double.random(in: 0...0.8),
            color: [Theme.goldBright, Theme.emerald, Theme.ruby, Theme.sapphire].randomElement()!,
            rotation: Double.random(in: 0...360)
        )
    }
    @State private var fall = false

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(pieces) { p in
                    Rectangle()
                        .fill(p.color)
                        .frame(width: 8, height: 14)
                        .rotationEffect(.degrees(fall ? p.rotation + 360 : p.rotation))
                        .position(
                            x: p.x * geo.size.width,
                            y: fall ? geo.size.height + 40 : -40
                        )
                        .animation(
                            .easeIn(duration: 2.5).delay(p.delay).repeatForever(autoreverses: false),
                            value: fall
                        )
                }
            }
        }
        .onAppear { fall = true }
    }
}

// MARK: - Email sign-in

private struct EmailSignInSheet: View {
    let onDone: () -> Void
    @State private var mode: Mode = .signIn
    @State private var email = ""
    @State private var password = ""
    enum Mode { case signIn, signUp }

    var body: some View {
        VStack(spacing: 16) {
            Text(mode == .signIn ? "Sign in" : "Create account")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
                .padding(.top, 8)
            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .padding(14).background(Theme.card).clipShape(.rect(cornerRadius: 12))
                .foregroundStyle(Theme.text)
            SecureField("Password", text: $password)
                .padding(14).background(Theme.card).clipShape(.rect(cornerRadius: 12))
                .foregroundStyle(Theme.text)
            Button {
                Haptics.success()
                onDone()
            } label: {
                Text(mode == .signIn ? "SIGN IN" : "CREATE ACCOUNT")
                    .font(.system(size: 14, weight: .black, design: .rounded)).tracking(1.2)
                    .foregroundStyle(Theme.bg).frame(maxWidth: .infinity).frame(height: 52)
                    .background(Theme.goldBright).clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(email.isEmpty || password.count < 4)
            .opacity((email.isEmpty || password.count < 4) ? 0.5 : 1)
            Button(mode == .signIn ? "New here? Create account" : "Already have an account? Sign in") {
                withAnimation { mode = (mode == .signIn) ? .signUp : .signIn }
            }
            .font(.system(size: 12, weight: .heavy, design: .rounded))
            .foregroundStyle(Theme.textMuted)
            Spacer()
        }
        .padding(20)
        .background(Theme.bg)
    }
}

// MARK: - Share sheet

private struct ActivityShareView: UIViewControllerRepresentable {
    let message: String
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [message], applicationActivities: nil)
    }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}

// MARK: - Background

private struct OnboardingBackdrop: View {
    @Binding var animate: Bool
    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            Circle()
                .fill(Theme.goldBright.opacity(0.18))
                .frame(width: 320, height: 320)
                .blur(radius: 80)
                .offset(x: animate ? -100 : 100, y: -250)
            Circle()
                .fill(Theme.emerald.opacity(0.18))
                .frame(width: 280, height: 280)
                .blur(radius: 80)
                .offset(x: animate ? 120 : -120, y: 280)
        }
    }
}

// MARK: - Location helper

/// Tiny CLLocationManager wrapper so the onboarding can request foreground
/// location and report grant/deny back synchronously via a callback.
private final class OnboardingLocation: NSObject, CLLocationManagerDelegate {
    static let shared = OnboardingLocation()
    private let manager = CLLocationManager()
    private var completion: ((Bool) -> Void)?

    override init() {
        super.init()
        manager.delegate = self
    }

    func request(_ done: @escaping (Bool) -> Void) {
        let status = manager.authorizationStatus
        if status == .authorizedAlways || status == .authorizedWhenInUse {
            done(true); return
        }
        if status == .denied || status == .restricted {
            done(false); return
        }
        completion = done
        manager.requestWhenInUseAuthorization()
    }

    /// One-shot location fix used by the onboarding city-detection step.
    func oneShotLocation(_ done: @escaping (CLLocationCoordinate2D?) -> Void) {
        let status = manager.authorizationStatus
        guard status == .authorizedAlways || status == .authorizedWhenInUse else {
            done(nil); return
        }
        locCompletion = done
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.requestLocation()
    }

    private var locCompletion: ((CLLocationCoordinate2D?) -> Void)?

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let coord = locations.first?.coordinate
        Task { @MainActor in
            self.locCompletion?(coord)
            self.locCompletion = nil
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.locCompletion?(nil)
            self.locCompletion = nil
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        guard status != .notDetermined else { return }
        let granted = status == .authorizedAlways || status == .authorizedWhenInUse
        Task { @MainActor in
            self.completion?(granted)
            self.completion = nil
        }
    }
}
