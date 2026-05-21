import SwiftUI
import Combine

/// Soft-consequence banner for the tribe derby. Losers see a "Redemption"
/// arc (+10% all week, a way back). Winners see a "Victory Lap" (+10% this
/// week, carry it forward). Never drops a player's balance.
struct RedemptionBanner: View {
    enum Kind { case loss, win }
    let kind: Kind
    let endsAt: Date

    @State private var now: Date = Date()
    private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    private var tint: Color { kind == .loss ? Theme.emerald : Theme.goldBright }
    private var label: String { kind == .loss ? "REDEMPTION · 1.10×" : "VICTORY LAP · 1.10×" }
    private var headline: String { kind == .loss ? "Bounce back" : "Carry it forward" }
    private var blurb: String {
        kind == .loss
        ? "Your tribe lost last week's derby. Every claim pays +10% all week."
        : "Your tribe took the derby. Every claim pays +10% all week."
    }
    private var icon: String { kind == .loss ? "heart.fill" : "trophy.fill" }

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(tint.opacity(0.18)).frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundStyle(tint)
            }
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(label)
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .tracking(1.4)
                        .foregroundStyle(tint)
                    Text(timeLeft)
                        .font(.system(size: 9, weight: .heavy, design: .rounded))
                        .tracking(1)
                        .foregroundStyle(Theme.textMuted)
                }
                Text(headline)
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                Text(blurb)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            LinearGradient(colors: [tint.opacity(0.16), Theme.card],
                           startPoint: .leading, endPoint: .trailing)
        )
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(tint.opacity(0.45), lineWidth: 1))
        .onReceive(timer) { now = $0 }
    }

    private var timeLeft: String {
        let s = max(0, endsAt.timeIntervalSince(now))
        let d = Int(s) / 86_400
        let h = (Int(s) % 86_400) / 3600
        if d > 0 { return "\(d)d \(h)h LEFT" }
        let m = (Int(s) % 3600) / 60
        return "\(h)h \(m)m LEFT"
    }
}
