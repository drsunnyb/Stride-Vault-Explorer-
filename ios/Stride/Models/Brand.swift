import SwiftUI

nonisolated struct Brand: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let coinName: String
    let short: String
    let tagline: String
    let mark: String
    let hex: String
    let brightHex: String
    let invertedText: Bool

    var color: Color { Color(hex: hex) }
    var bright: Color { Color(hex: brightHex) }
    var textOnColor: Color { invertedText ? .black : .white }
}

extension Color {
    init(hex: String) {
        var s = hex
        if s.hasPrefix("#") { s.removeFirst() }
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        let r = Double((v >> 16) & 0xFF) / 255
        let g = Double((v >> 8) & 0xFF) / 255
        let b = Double(v & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
