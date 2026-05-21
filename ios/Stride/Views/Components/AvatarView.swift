import SwiftUI

/// Procedural gradient avatar — deterministic from a seed.
struct AvatarView: View {
    let seed: Int
    var size: CGFloat = 44
    var initials: String? = nil

    private var palette: [Color] {
        let palettes: [[Color]] = [
            [Color(red: 0.95, green: 0.55, blue: 0.30), Color(red: 0.92, green: 0.27, blue: 0.55)],
            [Color(red: 0.30, green: 0.72, blue: 0.95), Color(red: 0.45, green: 0.30, blue: 0.92)],
            [Color(red: 0.96, green: 0.82, blue: 0.25), Color(red: 0.94, green: 0.42, blue: 0.28)],
            [Color(red: 0.06, green: 0.73, blue: 0.51), Color(red: 0.20, green: 0.51, blue: 0.96)],
            [Color(red: 0.93, green: 0.42, blue: 0.78), Color(red: 0.55, green: 0.32, blue: 0.93)],
            [Color(red: 0.49, green: 0.83, blue: 0.99), Color(red: 0.13, green: 0.48, blue: 0.92)]
        ]
        return palettes[abs(seed) % palettes.count]
    }

    var body: some View {
        ZStack {
            LinearGradient(colors: palette, startPoint: .topLeading, endPoint: .bottomTrailing)
            if let initials {
                Text(initials)
                    .font(.system(size: size * 0.4, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
            } else {
                // Subtle geometric motif
                Circle()
                    .fill(.white.opacity(0.16))
                    .frame(width: size * 0.45, height: size * 0.45)
                    .offset(x: -size * 0.12, y: -size * 0.12)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.18), lineWidth: 1))
    }
}
