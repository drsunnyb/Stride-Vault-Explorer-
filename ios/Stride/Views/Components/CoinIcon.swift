import SwiftUI

struct CoinIcon: View {
    var size: CGFloat = 22

    var body: some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Theme.goldBright, Theme.gold, Color(red: 0.451, green: 0.349, blue: 0.094)],
                        center: .init(x: 0.3, y: 0.3),
                        startRadius: 0,
                        endRadius: size * 0.7
                    )
                )
                .overlay(
                    Circle().stroke(Theme.goldBright.opacity(0.9), lineWidth: size * 0.06)
                )
                .shadow(color: Theme.gold.opacity(0.6), radius: size * 0.25)

            Text("S")
                .font(.system(size: size * 0.55, weight: .black, design: .rounded))
                .foregroundStyle(Color(red: 0.349, green: 0.247, blue: 0.043))
        }
        .frame(width: size, height: size)
    }
}
