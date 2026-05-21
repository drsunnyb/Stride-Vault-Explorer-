import SwiftUI
import MapKit

struct VaultMapView: View {
    let store: VaultStore
    @Binding var selected: Vault?

    @State private var location = LocationService.shared
    @State private var camera: MapCameraPosition = .userLocation(
        fallback: .region(
            MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 51.5085, longitude: -0.1278),
                span: MKCoordinateSpan(latitudeDelta: 0.06, longitudeDelta: 0.06)
            )
        )
    )
    @State private var query: String = ""
    @State private var brandFilter: String? = nil
    @State private var showSearchSheet = false
    @State private var currentSpan: MKCoordinateSpan = MKCoordinateSpan(latitudeDelta: 0.012, longitudeDelta: 0.012)
    @State private var currentCenter: CLLocationCoordinate2D = CLLocationCoordinate2D(latitude: 51.5085, longitude: -0.1278)
    @State private var didInitialFly = false
    @State private var zoomIdx: Int = Self.defaultZoomIdx

    /// 7-step zoom ladder mirroring `expo/components/MapKitMap.tsx`.
    static let zoomLevels: [Double] = [0.003, 0.006, 0.012, 0.025, 0.05, 0.1, 0.2]
    static let defaultZoomIdx: Int = 2

    private var filtered: [Vault] {
        store.search(query, brand: brandFilter)
    }

    /// Viewport-culled + grid-clustered render set. Branded + platinum vaults
    /// always render individually so partners and hero pins are never hidden.
    private var renderSet: (markers: [Vault], clusters: [VaultCluster]) {
        Clusterer.compute(
            vaults: filtered,
            center: currentCenter,
            span: currentSpan
        )
    }

    var body: some View {
        let set = renderSet
        return ZStack(alignment: .topTrailing) {
            Map(position: $camera, interactionModes: [.pan, .zoom, .rotate]) {
                // User location dot (pulses, system-styled)
                UserAnnotation()

                ForEach(set.markers) { vault in
                    Annotation(vault.name, coordinate: vault.coordinate, anchor: .bottom) {
                        VaultPin(
                            vault: vault,
                            isClaimed: store.isClaimed(vault),
                            action: {
                                Haptics.soft()
                                selected = vault
                            }
                        )
                    }
                }

                ForEach(set.clusters) { c in
                    Annotation("\(c.count) vaults", coordinate: c.coordinate, anchor: .center) {
                        ClusterBubble(count: c.count, hasBrand: c.hasBrand, brandTint: c.brandTint) {
                            zoomIntoCluster(c)
                        }
                        .id("\(c.id)-\(c.count)")
                        .transition(.scale(scale: 0.4).combined(with: .opacity))
                    }
                }
            }
            .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .excludingAll))
            .preferredColorScheme(.dark)
            .ignoresSafeArea()
            .onMapCameraChange(frequency: .onEnd) { ctx in
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                    currentSpan = ctx.region.span
                    currentCenter = ctx.region.center
                }
                syncZoomIdxFromSpan(ctx.region.span.latitudeDelta)
            }

            mapControls
        }
        .onAppear { location.start() }
        .onChange(of: location.coordinate?.latitude) { _, _ in
            guard let coord = location.coordinate else { return }
            store.userCoordinate = coord
            if !didInitialFly {
                didInitialFly = true
                flyTo(coord, span: MKCoordinateSpan(latitudeDelta: 0.03, longitudeDelta: 0.03))
            }
        }
        .safeAreaInset(edge: .bottom) {
            mapBottomBar
        }
        .sheet(isPresented: $showSearchSheet) {
            VaultSearchSheet(
                store: store,
                query: $query,
                brandFilter: $brandFilter,
                onPick: { vault in
                    showSearchSheet = false
                    flyTo(vault.coordinate, span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02))
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { selected = vault }
                }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Right-side zoom slider (matches Expo's 7-tick ladder)

    private var mapControls: some View {
        VStack(spacing: 12) {
            zoomSlider
            ZoomButton(icon: "location.fill", action: { centerOnUser() })
        }
        .padding(.top, 220)
        .padding(.trailing, 14)
    }

    private var zoomSlider: some View {
        VStack(spacing: 8) {
            ZoomButton(icon: "plus") { applyZoom(zoomIdx - 1) }
                .opacity(zoomIdx == 0 ? 0.45 : 1)
            VStack(spacing: 6) {
                ForEach(Self.zoomLevels.indices, id: \.self) { i in
                    Button { applyZoom(i) } label: {
                        Capsule()
                            .fill(i == zoomIdx ? Theme.emerald : Theme.border)
                            .frame(width: i == zoomIdx ? 22 : 14, height: i == zoomIdx ? 3 : 2)
                            .frame(width: 28, height: 12, alignment: .center)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 6)
            .frame(width: 36)
            .background(Theme.card.opacity(0.88))
            .clipShape(.rect(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
            ZoomButton(icon: "minus") { applyZoom(zoomIdx + 1) }
                .opacity(zoomIdx == Self.zoomLevels.count - 1 ? 0.45 : 1)
        }
    }

    // MARK: - Bottom search + filter strip

    private var mapBottomBar: some View {
        VStack(spacing: 10) {
            // Brand filter pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(label: "ALL", tint: Theme.goldBright, active: brandFilter == nil) {
                        withAnimation(.snappy) { brandFilter = nil }
                    }
                    ForEach(AppData.brands) { brand in
                        FilterChip(label: brand.short, tint: brand.color, active: brandFilter == brand.id) {
                            withAnimation(.snappy) { brandFilter = brand.id }
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
            .scrollClipDisabled()

            // Search trigger
            Button {
                Haptics.tap()
                showSearchSheet = true
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Theme.textMuted)
                    Text(query.isEmpty ? "Search vaults, areas, brands" : query)
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(query.isEmpty ? Theme.textMuted : Theme.text)
                        .lineLimit(1)
                    Spacer()
                    Text("\(filtered.count)")
                        .font(.system(size: 12, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.goldBright)
                        .monospacedDigit()
                }
                .padding(14)
                .background(Theme.card.opacity(0.95))
                .clipShape(.rect(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1))
                .padding(.horizontal, 16)
            }
            .buttonStyle(.plain)
        }
        .padding(.bottom, 90)
    }

    // MARK: - Camera helpers

    private func applyZoom(_ idx: Int) {
        let clamped = max(0, min(Self.zoomLevels.count - 1, idx))
        let d = Self.zoomLevels[clamped]
        let newSpan = MKCoordinateSpan(latitudeDelta: d, longitudeDelta: d)
        withAnimation(.easeInOut(duration: 0.35)) {
            camera = .region(MKCoordinateRegion(center: currentCenter, span: newSpan))
            currentSpan = newSpan
            zoomIdx = clamped
        }
        Haptics.tap()
    }

    private func syncZoomIdxFromSpan(_ d: Double) {
        // Snap to nearest log-step in the ladder.
        var best = 0
        var dist = Double.infinity
        for i in Self.zoomLevels.indices {
            let delta = abs(log(Self.zoomLevels[i]) - log(d))
            if delta < dist { dist = delta; best = i }
        }
        if best != zoomIdx { zoomIdx = best }
    }

    private func centerOnUser() {
        // Make sure permission is requested if not already granted.
        location.start()
        let target = location.coordinate ?? store.userCoordinate
        withAnimation(.easeInOut(duration: 0.4)) {
            camera = .region(MKCoordinateRegion(
                center: target,
                span: MKCoordinateSpan(latitudeDelta: 0.03, longitudeDelta: 0.03)
            ))
        }
        Haptics.soft()
    }

    private func flyTo(_ coord: CLLocationCoordinate2D, span: MKCoordinateSpan) {
        withAnimation(.easeInOut(duration: 0.5)) {
            camera = .region(MKCoordinateRegion(center: coord, span: span))
        }
    }

    private func zoomIntoCluster(_ c: VaultCluster) {
        let newSpan = MKCoordinateSpan(
            latitudeDelta: max(0.003, currentSpan.latitudeDelta * 0.45),
            longitudeDelta: max(0.003, currentSpan.longitudeDelta * 0.45)
        )
        withAnimation(.easeInOut(duration: 0.4)) {
            camera = .region(MKCoordinateRegion(center: c.coordinate, span: newSpan))
        }
        currentSpan = newSpan
        currentCenter = c.coordinate
        Haptics.tap()
    }
}

// MARK: - Clustering (mirrors expo/components/MapKitMap.tsx)

struct VaultCluster: Identifiable {
    let id: String
    let coordinate: CLLocationCoordinate2D
    let count: Int
    let hasBrand: Bool
    /// Tint of the brand vault inside the cluster (if any). Used to colour the
    /// cluster bubble so brand presence reads at a glance.
    let brandTint: String?
}

private enum Clusterer {
    /// Hard cap on individual markers rendered at once.
    static let maxIndividualMarkers = 90
    /// Above this latitudeDelta we always cluster.
    static let clusterDeltaThreshold = 0.012

    static func compute(vaults: [Vault],
                        center: CLLocationCoordinate2D,
                        span: MKCoordinateSpan) -> (markers: [Vault], clusters: [VaultCluster]) {
        // Viewport cull with 60% padding so pins near the edge still render.
        let padLat = span.latitudeDelta * 0.6
        let padLng = span.longitudeDelta * 0.6
        let minLat = center.latitude - span.latitudeDelta / 2 - padLat
        let maxLat = center.latitude + span.latitudeDelta / 2 + padLat
        let minLng = center.longitude - span.longitudeDelta / 2 - padLng
        let maxLng = center.longitude + span.longitudeDelta / 2 + padLng

        var visible: [Vault] = []
        visible.reserveCapacity(256)
        for v in vaults {
            if v.lat < minLat || v.lat > maxLat { continue }
            if v.lng < minLng || v.lng > maxLng { continue }
            visible.append(v)
        }

        // Brand + platinum vaults are always rendered as individual pins.
        var featured: [Vault] = []
        var fillers: [Vault] = []
        for v in visible {
            if v.brandId != nil || v.tier == .platinum {
                featured.append(v)
            } else {
                fillers.append(v)
            }
        }

        let shouldCluster = span.latitudeDelta > clusterDeltaThreshold
            || fillers.count > maxIndividualMarkers

        if !shouldCluster {
            return (markers: visible, clusters: [])
        }

        // Cluster cell scales with current zoom so clusters look consistent on screen.
        let cellDeg = max(0.004, span.latitudeDelta * 0.1)
        var cells: [String: (latSum: Double, lngSum: Double, items: [Vault])] = [:]
        for v in fillers {
            let cx = Int((v.lat / cellDeg).rounded(.down))
            let cy = Int((v.lng / cellDeg).rounded(.down))
            let key = "\(cx):\(cy)"
            if var cell = cells[key] {
                cell.latSum += v.lat
                cell.lngSum += v.lng
                cell.items.append(v)
                cells[key] = cell
            } else {
                cells[key] = (v.lat, v.lng, [v])
            }
        }

        var singletons: [Vault] = []
        var clusters: [VaultCluster] = []
        for (key, cell) in cells {
            if cell.items.count == 1 {
                singletons.append(cell.items[0])
            } else {
                let n = Double(cell.items.count)
                clusters.append(VaultCluster(
                    id: key,
                    coordinate: CLLocationCoordinate2D(
                        latitude: cell.latSum / n,
                        longitude: cell.lngSum / n
                    ),
                    count: cell.items.count,
                    hasBrand: false,
                    brandTint: nil
                ))
            }
        }

        // Branded clusters: when several featured pins are themselves clustered
        // tightly together at very wide zoom, fold them into a brand-tinted
        // bubble. Keeps the map from getting visually noisy in the City etc.
        var mergedFeatured: [Vault] = []
        if span.latitudeDelta > 0.06 && featured.count > 6 {
            var brandCells: [String: (latSum: Double, lngSum: Double, items: [Vault], tint: String?)] = [:]
            let brandCell = max(0.008, span.latitudeDelta * 0.12)
            for v in featured {
                let cx = Int((v.lat / brandCell).rounded(.down))
                let cy = Int((v.lng / brandCell).rounded(.down))
                let key = "b:\(cx):\(cy)"
                let tint: String? = v.brandId
                if var cell = brandCells[key] {
                    cell.latSum += v.lat; cell.lngSum += v.lng; cell.items.append(v)
                    if cell.tint == nil { cell.tint = tint }
                    brandCells[key] = cell
                } else {
                    brandCells[key] = (v.lat, v.lng, [v], tint)
                }
            }
            for (key, cell) in brandCells {
                if cell.items.count <= 2 { mergedFeatured.append(contentsOf: cell.items); continue }
                let n = Double(cell.items.count)
                clusters.append(VaultCluster(
                    id: key,
                    coordinate: CLLocationCoordinate2D(latitude: cell.latSum / n, longitude: cell.lngSum / n),
                    count: cell.items.count,
                    hasBrand: true,
                    brandTint: cell.tint
                ))
            }
        } else {
            mergedFeatured = featured
        }

        return (markers: mergedFeatured + singletons, clusters: clusters)
    }
}

private struct ClusterBubble: View {
    let count: Int
    let hasBrand: Bool
    let brandTint: String?
    let action: () -> Void

    @State private var pulse = false
    @State private var appeared = false

    private var size: CGFloat {
        count > 50 ? 54 : count > 15 ? 46 : 40
    }

    private var accent: Color {
        if let tint = brandTint, let brand = AppData.brand(tint) { return brand.color }
        return Theme.goldBright
    }

    private var glow: Color { accent.opacity(0.75) }

    var body: some View {
        Button(action: { Haptics.tap(); action() }) {
            ZStack {
                // Soft pulsing halo so clusters feel alive on the map.
                Circle()
                    .stroke(accent.opacity(0.55), lineWidth: 2)
                    .frame(width: size + 14, height: size + 14)
                    .scaleEffect(pulse ? 1.18 : 0.96)
                    .opacity(pulse ? 0 : 0.7)

                Circle()
                    .fill(accent.opacity(hasBrand ? 0.42 : 0.32))
                    .frame(width: size, height: size)
                    .overlay(Circle().stroke(accent, lineWidth: 2))
                    .shadow(color: glow, radius: hasBrand ? 14 : 10)

                Circle()
                    .fill(Color(red: 0.06, green: 0.07, blue: 0.10))
                    .frame(width: size - 10, height: size - 10)
                    .overlay(Circle().stroke(accent, lineWidth: 1))

                VStack(spacing: -1) {
                    Text("\(count)")
                        .font(.system(size: count > 50 ? 16 : 13, weight: .black, design: .rounded))
                        .tracking(0.4)
                        .foregroundStyle(accent)
                        .monospacedDigit()
                    if hasBrand {
                        Text("BRAND")
                            .font(.system(size: 7, weight: .black, design: .rounded))
                            .tracking(1)
                            .foregroundStyle(accent.opacity(0.85))
                    }
                }
            }
            .scaleEffect(appeared ? 1 : 0.6)
            .opacity(appeared ? 1 : 0)
        }
        .buttonStyle(.plain)
        .onAppear {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.7)) { appeared = true }
            withAnimation(.easeOut(duration: 1.8).repeatForever(autoreverses: false)) { pulse = true }
        }
    }
}

// MARK: - Pin

private struct VaultPin: View {
    let vault: Vault
    let isClaimed: Bool
    let action: () -> Void

    @State private var pulse = false

    private var brandColor: Color? { AppData.brand(vault.brandId)?.color }

    var body: some View {
        Button(action: action) {
            ZStack {
                if !isClaimed {
                    Circle()
                        .stroke((brandColor ?? vault.tier.glow).opacity(0.6), lineWidth: 2)
                        .frame(width: 44, height: 44)
                        .scaleEffect(pulse ? 1.6 : 0.9)
                        .opacity(pulse ? 0 : 0.7)
                }

                Circle()
                    .fill(
                        RadialGradient(
                            colors: isClaimed
                                ? [Theme.surface, Theme.bgElev]
                                : (brandColor.map { [$0, $0.opacity(0.7)] } ?? vault.tier.gradient),
                            center: .init(x: 0.35, y: 0.3),
                            startRadius: 0,
                            endRadius: 22
                        )
                    )
                    .frame(width: 34, height: 34)
                    .overlay(
                        Circle().stroke(Color.white.opacity(isClaimed ? 0.15 : 0.6), lineWidth: 1.5)
                    )
                    .shadow(color: (brandColor ?? vault.tier.glow).opacity(isClaimed ? 0 : 0.7), radius: 8)

                Image(systemName: isClaimed ? "checkmark" : vault.symbol)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(isClaimed ? Theme.textMuted : Color.black.opacity(0.75))
            }
        }
        .buttonStyle(.plain)
        .onAppear {
            withAnimation(.easeOut(duration: 1.6).repeatForever(autoreverses: false)) {
                pulse = true
            }
        }
    }
}

private struct ZoomButton: View {
    let icon: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .heavy))
                .foregroundStyle(Theme.text)
                .frame(width: 40, height: 40)
                .background(Theme.card.opacity(0.92))
                .clipShape(Circle())
                .overlay(Circle().stroke(Theme.border, lineWidth: 1))
                .shadow(color: .black.opacity(0.4), radius: 8, y: 2)
        }
        .buttonStyle(.plain)
    }
}

private struct FilterChip: View {
    let label: String
    let tint: Color
    let active: Bool
    let action: () -> Void
    var body: some View {
        Button { Haptics.tap(); action() } label: {
            Text(label)
                .font(.system(size: 11, weight: .black, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(active ? Theme.bg : Theme.text)
                .padding(.horizontal, 14).padding(.vertical, 8)
                .background(active ? tint : Theme.card.opacity(0.92))
                .clipShape(Capsule())
                .overlay(Capsule().stroke(active ? tint : Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Search Sheet

private struct VaultSearchSheet: View {
    let store: VaultStore
    @Binding var query: String
    @Binding var brandFilter: String?
    let onPick: (Vault) -> Void

    @FocusState private var focused: Bool

    private var results: [Vault] { store.search(query, brand: brandFilter) }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass").foregroundStyle(Theme.textMuted)
                TextField("Vaults, areas, brands…", text: $query)
                    .focused($focused)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .foregroundStyle(Theme.text)
                if !query.isEmpty {
                    Button { query = "" } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.textMuted)
                    }.buttonStyle(.plain)
                }
            }
            .padding(14)
            .background(Theme.card)
            .clipShape(.rect(cornerRadius: 14))
            .padding(.horizontal, 16)
            .padding(.top, 12)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(label: "ALL", tint: Theme.goldBright, active: brandFilter == nil) {
                        brandFilter = nil
                    }
                    ForEach(AppData.brands) { brand in
                        FilterChip(label: brand.short, tint: brand.color, active: brandFilter == brand.id) {
                            brandFilter = brand.id
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.vertical, 10)

            // Nearby + results
            ScrollView {
                LazyVStack(spacing: 8) {
                    if query.isEmpty && brandFilter == nil {
                        Text("NEARBY")
                            .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.4)
                            .foregroundStyle(Theme.textMuted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 16).padding(.top, 6)
                        ForEach(store.nearbyVaults(limit: 5)) { v in
                            SearchResultRow(vault: v, distance: store.distanceLabel(to: v), claimed: store.isClaimed(v))
                                .onTapGesture { onPick(v) }
                        }
                    }
                    Text(query.isEmpty ? "ALL VAULTS" : "RESULTS")
                        .font(.system(size: 10, weight: .black, design: .rounded)).tracking(1.4)
                        .foregroundStyle(Theme.textMuted)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 16).padding(.top, 6)
                    ForEach(results) { v in
                        SearchResultRow(vault: v, distance: store.distanceLabel(to: v), claimed: store.isClaimed(v))
                            .onTapGesture { onPick(v) }
                    }
                    if results.isEmpty {
                        Text("No vaults match.")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Theme.textMuted)
                            .padding(.top, 24)
                    }
                }
                .padding(.bottom, 32)
            }
        }
        .background(Theme.bg.ignoresSafeArea())
        .onAppear { focused = true }
    }
}

private struct SearchResultRow: View {
    let vault: Vault
    let distance: String
    let claimed: Bool
    var body: some View {
        let brand = AppData.brand(vault.brandId)
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill((brand?.color ?? vault.tier.color).opacity(0.25))
                    .frame(width: 40, height: 40)
                Image(systemName: vault.symbol)
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundStyle(brand?.color ?? vault.tier.color)
            }
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(vault.name)
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.text)
                    if let brand {
                        Text(brand.short)
                            .font(.system(size: 9, weight: .black, design: .rounded)).tracking(1)
                            .foregroundStyle(brand.textOnColor)
                            .padding(.horizontal, 5).padding(.vertical, 2)
                            .background(brand.color)
                            .clipShape(Capsule())
                    }
                }
                Text("\(vault.area) · \(distance)")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
            if claimed {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundStyle(Theme.emerald)
            } else {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(Theme.textMuted)
            }
        }
        .padding(12)
        .background(Theme.card)
        .clipShape(.rect(cornerRadius: 12))
        .padding(.horizontal, 16)
        .contentShape(Rectangle())
    }
}
