import SwiftUI

/// Unified inbox for friend requests, stake-challenge invites, friend-joined
/// receipts, and system alerts. Actionable rows accept/decline through the
/// matching `VaultStore` mutations so a tap does real economy work.
struct NotificationsView: View {
    let store: VaultStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                if store.notifications.isEmpty {
                    emptyState
                } else {
                    LazyVStack(spacing: 10) {
                        ForEach(store.notifications) { n in
                            NotificationCard(notification: n) {
                                store.markNotificationRead(id: n.id)
                            } onAccept: {
                                Haptics.success()
                                store.resolveNotification(id: n.id, accept: true)
                            } onDecline: {
                                Haptics.tap()
                                store.resolveNotification(id: n.id, accept: false)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 6)
                    .padding(.bottom, 80)
                }
            }
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(Theme.text)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Haptics.tap()
                        store.markAllNotificationsRead()
                    } label: {
                        Text("MARK READ")
                            .font(.system(size: 10, weight: .black, design: .rounded))
                            .tracking(1.2)
                    }
                    .foregroundStyle(Theme.textMuted)
                }
            }
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle().fill(Theme.bgElev).frame(width: 72, height: 72)
                    .overlay(Circle().stroke(Theme.border, lineWidth: 1))
                Image(systemName: "tray")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(Theme.textMuted)
            }
            Text("Inbox is quiet")
                .font(.system(size: 15, weight: .black, design: .rounded))
                .foregroundStyle(Theme.text)
            Text("Friend requests, challenge invites, and city alerts will land here.")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)
        }
        .padding(.top, 80)
        .frame(maxWidth: .infinity)
    }
}

private struct NotificationCard: View {
    let notification: InboxNotification
    let onTap: () -> Void
    let onAccept: () -> Void
    let onDecline: () -> Void

    private var iconName: String {
        switch notification.kind {
        case .friendRequest: return "person.badge.plus"
        case .friendJoined:  return "checkmark.circle.fill"
        case .challengeInvite: return "flame.fill"
        case .challengeWon:  return "crown.fill"
        case .challengeLost: return "flag.fill"
        case .cityLive:      return "mappin.and.ellipse"
        case .system:        return "bell.fill"
        }
    }

    private var tint: Color {
        switch notification.kind {
        case .friendRequest, .friendJoined: return Theme.emerald
        case .challengeInvite, .challengeWon: return Theme.goldBright
        case .challengeLost: return Theme.textMuted
        case .cityLive: return Theme.sapphire
        case .system: return Theme.text
        }
    }

    var body: some View {
        let actionable = notification.actionable && notification.resolution == nil
        HStack(alignment: .top, spacing: 12) {
            ZStack(alignment: .bottomTrailing) {
                AvatarView(
                    seed: notification.avatarSeed ?? 0,
                    size: 44,
                    initials: String((notification.fromName ?? notification.title).prefix(1))
                )
                .overlay(Circle().stroke(tint.opacity(0.7), lineWidth: 1))

                ZStack {
                    Circle().fill(tint)
                    Image(systemName: iconName)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Theme.bg)
                }
                .frame(width: 18, height: 18)
                .overlay(Circle().stroke(Theme.card, lineWidth: 2))
                .offset(x: 2, y: 2)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(notification.title)
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .lineLimit(2)
                Text(notification.body)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Theme.textMuted)
                    .lineLimit(2)
                Text(timeAgo(from: notification.createdAt))
                    .font(.system(size: 10, weight: .heavy, design: .rounded))
                    .tracking(0.6)
                    .foregroundStyle(Theme.textDim)
                    .padding(.top, 2)

                if actionable {
                    HStack(spacing: 8) {
                        Button(action: onDecline) {
                            HStack(spacing: 4) {
                                Image(systemName: "xmark").font(.system(size: 10, weight: .bold))
                                Text("DECLINE").tracking(1.2)
                            }
                            .font(.system(size: 10, weight: .black, design: .rounded))
                            .foregroundStyle(Theme.textMuted)
                            .padding(.horizontal, 12).padding(.vertical, 7)
                            .background(Theme.surface)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
                        }
                        .buttonStyle(.plain)

                        Button(action: onAccept) {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark").font(.system(size: 10, weight: .bold))
                                Text("ACCEPT").tracking(1.2)
                            }
                            .font(.system(size: 10, weight: .black, design: .rounded))
                            .foregroundStyle(Theme.bg)
                            .padding(.horizontal, 14).padding(.vertical, 7)
                            .background(tint)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.top, 8)
                } else if let r = notification.resolution {
                    Text(r == .accepted ? "ACCEPTED" : "DECLINED")
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .tracking(1.2)
                        .foregroundStyle(r == .accepted ? Theme.emerald : Theme.textDim)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Theme.surface)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(
                            (r == .accepted ? Theme.emerald : Theme.textDim).opacity(0.5),
                            lineWidth: 1
                        ))
                        .padding(.top, 8)
                }
            }
            Spacer(minLength: 0)

            if !notification.read {
                Circle().fill(tint).frame(width: 8, height: 8)
                    .padding(.top, 4)
            }
        }
        .padding(14)
        .background(notification.read ? Theme.card : Theme.bgElev)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(
            notification.read ? Theme.border : tint.opacity(0.45), lineWidth: 1
        ))
        .contentShape(.rect)
        .onTapGesture { onTap() }
    }

    private func timeAgo(from date: Date) -> String {
        let diff = max(0, -date.timeIntervalSinceNow)
        let m = Int(diff / 60)
        if m < 1 { return "JUST NOW" }
        if m < 60 { return "\(m)M AGO" }
        let h = m / 60
        if h < 24 { return "\(h)H AGO" }
        return "\(h / 24)D AGO"
    }
}
