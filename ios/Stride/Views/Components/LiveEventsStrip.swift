import SwiftUI
import Combine

/// Horizontal live-events ribbon shown above the map. Each card pulses + counts down.
struct LiveEventsStrip: View {
    let events: [LiveEvent]
    var onTap: ((LiveEvent) -> Void)? = nil

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(events) { event in
                    Button {
                        Haptics.tap()
                        onTap?(event)
                    } label: {
                        LiveEventCard(event: event)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
        .scrollClipDisabled()
    }
}

private struct LiveEventCard: View {
    let event: LiveEvent
    @State private var pulse = false

    private var tint: Color {
        if let brand = AppData.brand(event.brandId) { return brand.color }
        switch event.kind {
        case .powerHour: return Theme.goldBright
        case .hotVault: return Theme.ruby
        case .raffleEnding: return Theme.sapphire
        case .brandDrop: return Theme.emerald
        case .streakBonus: return Theme.ruby
        }
    }

    var body: some View {
        HStack(spacing: 10) {
            // Pulsing dot for live, emoji otherwise
            ZStack {
                if event.isLive {
                    Circle()
                        .fill(tint.opacity(0.35))
                        .frame(width: 30, height: 30)
                        .scaleEffect(pulse ? 1.4 : 1.0)
                        .opacity(pulse ? 0 : 0.8)
                }
                Circle()
                    .fill(tint)
                    .frame(width: 14, height: 14)
                    .shadow(color: tint.opacity(0.7), radius: 6)
                Text(event.emoji)
                    .font(.system(size: 16))
                    .offset(x: 18, y: -8)
            }
            .frame(width: 36)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    if event.isLive {
                        Text("LIVE")
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .tracking(1.2)
                            .foregroundStyle(Theme.bg)
                            .padding(.horizontal, 5).padding(.vertical, 2)
                            .background(tint)
                            .clipShape(Capsule())
                    }
                    Text(event.title)
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.text)
                        .lineLimit(1)
                }
                Text(event.subtitle)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
                    .lineLimit(1)
                CountdownLabel(endsAt: event.endsAt, tint: tint)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Theme.card.opacity(0.95))
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(tint.opacity(0.4), lineWidth: 1))
        .frame(maxWidth: 240, alignment: .leading)
        .onAppear {
            withAnimation(.easeOut(duration: 1.2).repeatForever(autoreverses: false)) {
                pulse = true
            }
        }
    }
}

private struct CountdownLabel: View {
    let endsAt: Date
    let tint: Color
    @State private var now: Date = Date()

    private let timer = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    private var text: String {
        let remaining = endsAt.timeIntervalSince(now)
        if remaining <= 0 { return "Ended" }
        if remaining < 3600 { return "\(Int(remaining / 60))m left" }
        if remaining < 86400 { return "\(Int(remaining / 3600))h left" }
        return "\(Int(remaining / 86400))d left"
    }

    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .heavy, design: .rounded))
            .tracking(0.6)
            .foregroundStyle(tint)
            .onReceive(timer) { now = $0 }
    }
}
