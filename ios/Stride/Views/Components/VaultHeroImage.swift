import SwiftUI

/// Loads the vault's remote hero image with a tier-tinted placeholder.
/// Uses the Color+overlay pattern so `.fill` images never overflow.
struct VaultHeroImage: View {
    let vault: Vault
    var height: CGFloat = 220
    var cornerRadius: CGFloat = 18

    var body: some View {
        Theme.surface
            .frame(height: height)
            .overlay {
                AsyncImage(url: vault.imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .transition(.opacity)
                    case .failure:
                        placeholder
                    case .empty:
                        placeholder.overlay(ProgressView().tint(.white.opacity(0.6)))
                    @unknown default:
                        placeholder
                    }
                }
                .allowsHitTesting(false)
            }
            .overlay {
                LinearGradient(
                    colors: [.black.opacity(0.55), .clear, .black.opacity(0.7)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: cornerRadius))
    }

    private var placeholder: some View {
        LinearGradient(
            colors: [vault.tier.color.opacity(0.55), Theme.bg],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay {
            Image(systemName: vault.symbol)
                .font(.system(size: 56, weight: .regular))
                .foregroundStyle(.white.opacity(0.25))
        }
    }
}
