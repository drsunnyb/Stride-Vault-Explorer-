//
//  StrideApp.swift
//  Stride
//

import SwiftUI

@main
struct StrideApp: App {
    init() {
        // Kick off the live catalogue sync so admin-controlled brands,
        // rewards, raffles and cities are ready by the time the user reaches
        // those screens. Falls back silently to local seeds on failure.
        Task.detached(priority: .utility) {
            await SupabaseService.shared.refreshAll()
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
