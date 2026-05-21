import Foundation

/// London vault catalogue — ~1,100 vaults across Greater London.
///
/// Mirrors the Expo build exactly:
///  - ~45 hand-curated landmarks + brand stores + tube drops
///  - ~1,050 procedurally placed neighbourhood drops across 55+ boroughs
///
/// IDs / coords / rewards are stable across launches (deterministic PRNG with the
/// same hash + mulberry32 implementation as the Expo TS generator).
enum VaultCatalog {
    static let all: [Vault] = curated + procedural
    static let landmarks: [Vault] = curated.filter { $0.brandId == nil }
    static let brandedVaults: [Vault] = curated.filter { $0.brandId != nil }

    // MARK: - Curated landmarks + brand vaults

    private static let curated: [Vault] = [
        // CENTRAL — iconic landmarks
        .init(id: "big-ben", name: "Big Ben", area: "Westminster",
              blurb: "The Elizabeth Tower keeps time — and keeps secrets.",
              lat: 51.5007, lng: -0.1246, tier: .gold, symbol: "clock.fill",
              imageURL: img("photo-1513635269975-59663e0ac1ad")),
        .init(id: "tower-bridge", name: "Tower Bridge", area: "Tower Hamlets",
              blurb: "A legendary haul awaits beneath the bascules.",
              lat: 51.5055, lng: -0.0754, tier: .platinum, symbol: "building.columns.fill",
              imageURL: img("photo-1533929736458-ca588d08c8be")),
        .init(id: "london-eye", name: "London Eye", area: "South Bank",
              blurb: "Open space, weekend traffic — and a glittering wheel of loot.",
              lat: 51.5033, lng: -0.1196, tier: .gold, symbol: "circle.dashed",
              imageURL: img("photo-1486299267070-83823f5448dd")),
        .init(id: "buckingham", name: "Buckingham Palace", area: "Mayfair",
              blurb: "A royal cache hidden behind the gates.",
              lat: 51.5014, lng: -0.1419, tier: .gold, symbol: "crown.fill",
              imageURL: img("photo-1529655683826-aba9b3e77383")),
        .init(id: "trafalgar", name: "Trafalgar Square", area: "Westminster",
              blurb: "Nelson watches — coins glint at the lions' feet.",
              lat: 51.5080, lng: -0.1281, tier: .silver, symbol: "star.fill",
              imageURL: img("photo-1520637836862-4d197d17c52a")),
        .init(id: "covent", name: "Covent Garden Piazza", area: "West End",
              blurb: "Street performers, influencer crowds, hidden loot.",
              lat: 51.5117, lng: -0.1240, tier: .gold, symbol: "theatermasks.fill",
              imageURL: img("photo-1592859600972-1b0834d83747")),
        .init(id: "stpauls", name: "St Paul's", area: "City of London",
              blurb: "Whispers in the dome — riches in the crypt.",
              lat: 51.5138, lng: -0.0984, tier: .gold, symbol: "building.fill",
              imageURL: img("photo-1486325212027-8081e485255e")),
        .init(id: "british-museum", name: "British Museum", area: "Bloomsbury",
              blurb: "Antiquities and a curator's secret.",
              lat: 51.5194, lng: -0.1270, tier: .silver, symbol: "books.vertical.fill",
              imageURL: img("photo-1574879948818-1cfda7aa5b1e")),
        .init(id: "hyde-park", name: "Hyde Park", area: "Westminster",
              blurb: "Joggers, wellness crowd — bronze stash by the Serpentine.",
              lat: 51.5074, lng: -0.1657, tier: .bronze, symbol: "leaf.fill",
              imageURL: img("photo-1592861956120-e524fc739696")),
        .init(id: "sky-garden", name: "Sky Garden", area: "City of London",
              blurb: "Sun-soaked palms hide a glittering prize.",
              lat: 51.5113, lng: -0.0838, tier: .gold, symbol: "building.2.fill",
              imageURL: img("photo-1543832923-44667a44c804")),
        .init(id: "regents-park", name: "Regent's Park Inner Circle", area: "Marylebone",
              blurb: "Wellness, leisure, families — and a hidden bronze cache.",
              lat: 51.5294, lng: -0.1545, tier: .bronze, symbol: "leaf.fill",
              imageURL: img("photo-1551763424-12acf4e88e92")),
        .init(id: "camden-market", name: "Camden Market", area: "Camden",
              blurb: "Streetwear, vinyl, viral content — collect before the crowd does.",
              lat: 51.5414, lng: -0.1466, tier: .silver, symbol: "bag.fill",
              imageURL: img("photo-1561740331-d7a36e6cd6c4")),

        // BRAND — Nike
        .init(id: "nike-town-london", name: "Niketown London", area: "Oxford Circus",
              blurb: "Flagship vault. Tap in-store for an exclusive Air Drop.",
              lat: 51.5147, lng: -0.1421, tier: .platinum, symbol: "shoeprints.fill",
              imageURL: img("photo-1542291026-7eec264c27ff"), brandId: "nike"),
        .init(id: "nike-stratford", name: "Nike · Westfield Stratford", area: "Stratford",
              blurb: "Olympic legacy run — daily restock for the East London crew.",
              lat: 51.5436, lng: -0.0058, tier: .gold, symbol: "shoeprints.fill",
              imageURL: img("photo-1606107557195-0e29a4b5b4aa"), brandId: "nike"),
        .init(id: "nike-boxpark-shoreditch", name: "Nike · Boxpark Shoreditch", area: "Shoreditch",
              blurb: "Streetwear capsule vault — limited weekend drops.",
              lat: 51.5235, lng: -0.0769, tier: .gold, symbol: "shoeprints.fill",
              imageURL: img("photo-1556906781-9a412961c28c"), brandId: "nike"),
        .init(id: "nike-running-battersea", name: "Nike Running Hub", area: "Battersea Park",
              blurb: "Park loop. Pegasus drop. Nike Coins multiply.",
              lat: 51.4791, lng: -0.1577, tier: .platinum, symbol: "figure.run",
              imageURL: img("photo-1539185441755-769473a23570"), brandId: "nike"),

        // BRAND — Apple
        .init(id: "apple-regent-st", name: "Apple Regent Street", area: "Mayfair",
              blurb: "The original UK flagship. Daily AirDrop of platinum coins.",
              lat: 51.5135, lng: -0.1421, tier: .platinum, symbol: "applelogo",
              imageURL: img("photo-1606170033648-5d55a3edf314"), brandId: "apple"),
        .init(id: "apple-covent-garden", name: "Apple Covent Garden", area: "West End",
              blurb: "Largest Apple Store in the world. Tap inside for the vault.",
              lat: 51.5128, lng: -0.1239, tier: .gold, symbol: "applelogo",
              imageURL: img("photo-1611532736597-de2d4265fba3"), brandId: "apple"),
        .init(id: "apple-battersea", name: "Apple Battersea Power Station", area: "Battersea",
              blurb: "Industrial cathedral, modern vault — riverside drop.",
              lat: 51.4811, lng: -0.1446, tier: .gold, symbol: "applelogo",
              imageURL: img("photo-1574169208507-84376144848b"), brandId: "apple"),
        .init(id: "apple-brompton-rd", name: "Apple Brompton Road", area: "Knightsbridge",
              blurb: "Knightsbridge cache — luxury district daily restock.",
              lat: 51.4994, lng: -0.1640, tier: .platinum, symbol: "applelogo",
              imageURL: img("photo-1551817958-d9d86fb29431"), brandId: "apple"),

        // BRAND — Lululemon
        .init(id: "lulu-regent", name: "Lululemon Regent Street", area: "Mayfair",
              blurb: "Mindful steps. Earn premium.",
              lat: 51.5145, lng: -0.1412, tier: .gold, symbol: "figure.yoga",
              imageURL: img("photo-1599447421416-3414500d18a5"), brandId: "lulu"),
        .init(id: "lulu-covent", name: "Lululemon Covent Garden", area: "West End",
              blurb: "Flow through the piazza, earn Lulu Coins.",
              lat: 51.5121, lng: -0.1247, tier: .silver, symbol: "figure.mind.and.body",
              imageURL: img("photo-1591291621164-2c6367723315"), brandId: "lulu"),
        .init(id: "lulu-spitalfields", name: "Lululemon Spitalfields", area: "East London",
              blurb: "East end energy. Premium pace.",
              lat: 51.5188, lng: -0.0757, tier: .silver, symbol: "figure.yoga",
              imageURL: img("photo-1599058917765-a780eda07a3e"), brandId: "lulu"),
        .init(id: "lulu-kings-road", name: "Lululemon Kings Road", area: "Chelsea",
              blurb: "Chelsea stride — heart-rate up, coins in.",
              lat: 51.4878, lng: -0.1683, tier: .gold, symbol: "heart.fill",
              imageURL: img("photo-1593810451137-9b29ce5f6dd5"), brandId: "lulu"),

        // MEGA — brand-led, high footfall
        .init(id: "canary-wharf", name: "Canary Wharf", area: "Crossrail Place",
              blurb: "Futuristic, corporate lunchtime walkers. Mega-tier loot.",
              lat: 51.5054, lng: -0.0181, tier: .platinum, symbol: "building.2.crop.circle.fill",
              imageURL: img("photo-1568048689711-5e0325cea8c6")),
        .init(id: "westfield-london", name: "Westfield London", area: "Shepherd's Bush",
              blurb: "Retail partnerships and brand activations live here.",
              lat: 51.5072, lng: -0.2211, tier: .platinum, symbol: "bag.fill",
              imageURL: img("photo-1567958451986-2de427a4a0be")),

        // SEASONAL / culture
        .init(id: "shoreditch", name: "Shoreditch Boxpark", area: "East London",
              blurb: "Youth culture, creatives — spray-paint and platinum in the alleys.",
              lat: 51.5232, lng: -0.0777, tier: .platinum, symbol: "paintpalette.fill",
              imageURL: img("photo-1520975954732-35dd22299614")),
        .init(id: "kings-cross", name: "King's Cross Granary Sq", area: "Camden",
              blurb: "Young professionals, Google HQ, cultural events.",
              lat: 51.5346, lng: -0.1252, tier: .gold, symbol: "tram.fill",
              imageURL: img("photo-1599083570849-86c5b51b1be1")),

        // OUTER — mini vaults / community
        .init(id: "wimbledon-common", name: "Wimbledon Common", area: "Wimbledon",
              blurb: "Affluent suburb, sports + outdoor lifestyle.",
              lat: 51.4346, lng: -0.2284, tier: .silver, symbol: "leaf.fill",
              imageURL: img("photo-1602080858428-57174f9431cf")),
        .init(id: "richmond-riverside", name: "Richmond Riverside", area: "Richmond",
              blurb: "High-income families, fitness-conscious crowd.",
              lat: 51.4613, lng: -0.3037, tier: .silver, symbol: "leaf.fill",
              imageURL: img("photo-1488747279002-c8523379faaa")),
        .init(id: "greenwich-park", name: "Greenwich · Cutty Sark", area: "Greenwich",
              blurb: "Heritage + family activity hub on the Thames.",
              lat: 51.4769, lng: -0.0095, tier: .gold, symbol: "sailboat.fill",
              imageURL: img("photo-1543783207-ec64e4d95325")),
        .init(id: "hampstead-heath", name: "Parliament Hill", area: "Hampstead Heath",
              blurb: "Fitness walkers, panoramic skyline, affluent crowd.",
              lat: 51.5608, lng: -0.1571, tier: .gold, symbol: "mountain.2.fill",
              imageURL: img("photo-1568849676085-51415703900f")),
        .init(id: "crystal-palace", name: "Crystal Palace Park", area: "Crystal Palace",
              blurb: "Local loyalty, heritage, active families.",
              lat: 51.4226, lng: -0.0728, tier: .bronze, symbol: "star.fill",
              imageURL: img("photo-1551038247-3d9af20df552")),
        .init(id: "boxpark-croydon", name: "Boxpark Croydon", area: "Croydon",
              blurb: "Urban Gen Z crowd, Nike + Adidas demos.",
              lat: 51.3745, lng: -0.0973, tier: .silver, symbol: "paintpalette.fill",
              imageURL: img("photo-1565620057062-6e6abe23c0ba")),
        .init(id: "ealing-broadway", name: "Ealing Broadway", area: "Ealing",
              blurb: "Commuter hub, commercial retail blend.",
              lat: 51.5152, lng: -0.3017, tier: .bronze, symbol: "bag.fill",
              imageURL: img("photo-1518744386442-2d48ac47a7eb")),
        .init(id: "stratford-olympic", name: "Olympic Park", area: "Stratford",
              blurb: "Youth, athletics, event space. The Orbit watches over loot.",
              lat: 51.5440, lng: -0.0133, tier: .gold, symbol: "flag.checkered",
              imageURL: img("photo-1571902943202-507ec2618e8f")),
        .init(id: "twickenham", name: "Twickenham Stadium", area: "Twickenham",
              blurb: "Rugby crowd, large open zones.",
              lat: 51.4560, lng: -0.3416, tier: .silver, symbol: "sportscourt.fill",
              imageURL: img("photo-1577223625816-7546f13df25d")),
        .init(id: "bromley", name: "Bromley High St", area: "Bromley",
              blurb: "Underserved audience, strong mall activation.",
              lat: 51.4053, lng: 0.0144, tier: .bronze, symbol: "bag.fill",
              imageURL: img("photo-1567958451986-2de427a4a0be")),
        .init(id: "uxbridge", name: "Uxbridge · Pavilions", area: "Uxbridge",
              blurb: "Westside mall-based family engagement.",
              lat: 51.5465, lng: -0.4796, tier: .bronze, symbol: "bag.fill",
              imageURL: img("photo-1518744386442-2d48ac47a7eb")),
        .init(id: "wembley", name: "Wembley Stadium", area: "Wembley",
              blurb: "The arch towers over a platinum-tier match-day cache.",
              lat: 51.5560, lng: -0.2796, tier: .platinum, symbol: "sportscourt.fill",
              imageURL: img("photo-1577223625816-7546f13df25d")),
        .init(id: "kew-gardens", name: "Kew Gardens", area: "Richmond",
              blurb: "Glasshouses, botanic riches — a gold-tier garden vault.",
              lat: 51.4787, lng: -0.2956, tier: .gold, symbol: "leaf.circle.fill",
              imageURL: img("photo-1599909366516-6c1eaa1a6b3a")),
        .init(id: "o2-arena", name: "The O2", area: "Greenwich Peninsula",
              blurb: "Event nights, post-show crowds — platinum loot under the tents.",
              lat: 51.5030, lng: 0.0032, tier: .platinum, symbol: "music.note",
              imageURL: img("photo-1571902943202-507ec2618e8f")),

        // TUBE drops
        .init(id: "tube-liverpool-st", name: "Liverpool St · Broadgate", area: "Tube Drop",
              blurb: "Lunch-rush vault outside the Broadgate Circle exit.",
              lat: 51.5188, lng: -0.0823, tier: .silver, symbol: "tram.fill",
              imageURL: img("photo-1599083570849-86c5b51b1be1")),
        .init(id: "tube-bond-st", name: "Bond St · Fenwick", area: "Tube Drop",
              blurb: "South Molton St exit — limited-time vault.",
              lat: 51.5147, lng: -0.1493, tier: .gold, symbol: "tram.fill",
              imageURL: img("photo-1599083570849-86c5b51b1be1")),
        .init(id: "tube-victoria", name: "Victoria · Plaza", area: "Tube Drop",
              blurb: "Tourist crossroads between coach + rail stations.",
              lat: 51.4951, lng: -0.1432, tier: .silver, symbol: "tram.fill",
              imageURL: img("photo-1599083570849-86c5b51b1be1")),
        .init(id: "tube-tcr", name: "Tottenham Ct Rd · Outernet", area: "Tube Drop",
              blurb: "Outside the giant screens. Peak-hour chase vault.",
              lat: 51.5161, lng: -0.1306, tier: .gold, symbol: "tram.fill",
              imageURL: img("photo-1599083570849-86c5b51b1be1")),
        .init(id: "tube-south-ken", name: "South Kensington · NHM", area: "Tube Drop",
              blurb: "Outside the Natural History Museum on Exhibition Rd.",
              lat: 51.4940, lng: -0.1738, tier: .silver, symbol: "tram.fill",
              imageURL: img("photo-1574169208507-84376144848b"))
    ]

    // MARK: - Procedural generation

    private struct BoroughSeed {
        let id: String
        let name: String
        let center: (lat: Double, lng: Double)
        let radius: Double
        let count: Int
    }

    private static let boroughs: [BoroughSeed] = [
        // Zone 1 — Central
        .init(id: "westminster", name: "Westminster", center: (51.4975, -0.137), radius: 0.012, count: 28),
        .init(id: "city-of-london", name: "City of London", center: (51.515, -0.092), radius: 0.01, count: 18),
        .init(id: "soho", name: "Soho", center: (51.5133, -0.1336), radius: 0.006, count: 14),
        .init(id: "mayfair", name: "Mayfair", center: (51.5089, -0.1474), radius: 0.008, count: 16),
        .init(id: "covent-garden-west-end", name: "West End", center: (51.5117, -0.124), radius: 0.006, count: 14),
        .init(id: "bloomsbury", name: "Bloomsbury", center: (51.5215, -0.127), radius: 0.008, count: 14),
        .init(id: "marylebone", name: "Marylebone", center: (51.522, -0.155), radius: 0.01, count: 16),
        .init(id: "south-bank", name: "South Bank", center: (51.504, -0.115), radius: 0.012, count: 14),
        .init(id: "kings-cross-area", name: "King's Cross", center: (51.5345, -0.122), radius: 0.012, count: 16),
        .init(id: "shoreditch-area", name: "Shoreditch", center: (51.526, -0.078), radius: 0.01, count: 18),
        .init(id: "clerkenwell", name: "Clerkenwell", center: (51.5236, -0.105), radius: 0.009, count: 12),
        .init(id: "holborn", name: "Holborn", center: (51.517, -0.118), radius: 0.008, count: 10),
        .init(id: "fitzrovia", name: "Fitzrovia", center: (51.5205, -0.137), radius: 0.007, count: 10),

        // Zone 2 — Inner
        .init(id: "hackney", name: "Hackney", center: (51.545, -0.056), radius: 0.018, count: 28),
        .init(id: "islington", name: "Islington", center: (51.5362, -0.103), radius: 0.015, count: 24),
        .init(id: "camden-town", name: "Camden Town", center: (51.539, -0.143), radius: 0.013, count: 22),
        .init(id: "kentish-town", name: "Kentish Town", center: (51.551, -0.142), radius: 0.012, count: 14),
        .init(id: "notting-hill", name: "Notting Hill", center: (51.514, -0.207), radius: 0.013, count: 20),
        .init(id: "earls-court", name: "Earl's Court", center: (51.491, -0.193), radius: 0.012, count: 16),
        .init(id: "chelsea", name: "Chelsea", center: (51.487, -0.169), radius: 0.013, count: 18),
        .init(id: "brixton", name: "Brixton", center: (51.4628, -0.1145), radius: 0.014, count: 24),
        .init(id: "peckham", name: "Peckham", center: (51.474, -0.069), radius: 0.013, count: 20),
        .init(id: "bermondsey", name: "Bermondsey", center: (51.498, -0.07), radius: 0.013, count: 18),
        .init(id: "clapham", name: "Clapham", center: (51.461, -0.138), radius: 0.014, count: 22),
        .init(id: "battersea-area", name: "Battersea", center: (51.477, -0.158), radius: 0.014, count: 14),
        .init(id: "whitechapel", name: "Whitechapel", center: (51.519, -0.06), radius: 0.012, count: 14),
        .init(id: "vauxhall-nine-elms", name: "Vauxhall", center: (51.485, -0.122), radius: 0.012, count: 12),
        .init(id: "elephant-castle", name: "Elephant & Castle", center: (51.494, -0.099), radius: 0.011, count: 12),

        // Zone 3–4
        .init(id: "stratford-area", name: "Stratford", center: (51.541, -0.003), radius: 0.015, count: 22),
        .init(id: "walthamstow", name: "Walthamstow", center: (51.583, -0.018), radius: 0.016, count: 24),
        .init(id: "leyton", name: "Leyton", center: (51.5567, -0.0125), radius: 0.013, count: 16),
        .init(id: "tooting", name: "Tooting", center: (51.4275, -0.168), radius: 0.014, count: 20),
        .init(id: "wimbledon-area", name: "Wimbledon", center: (51.421, -0.207), radius: 0.015, count: 22),
        .init(id: "putney", name: "Putney", center: (51.461, -0.218), radius: 0.014, count: 18),
        .init(id: "hammersmith", name: "Hammersmith", center: (51.492, -0.223), radius: 0.013, count: 22),
        .init(id: "shepherds-bush", name: "Shepherd's Bush", center: (51.505, -0.227), radius: 0.013, count: 18),
        .init(id: "ealing-area", name: "Ealing", center: (51.515, -0.302), radius: 0.018, count: 26),
        .init(id: "acton", name: "Acton", center: (51.508, -0.273), radius: 0.014, count: 18),
        .init(id: "wood-green", name: "Wood Green", center: (51.5975, -0.111), radius: 0.015, count: 20),
        .init(id: "finchley", name: "Finchley", center: (51.595, -0.187), radius: 0.016, count: 20),
        .init(id: "hampstead-area", name: "Hampstead", center: (51.557, -0.178), radius: 0.013, count: 18),
        .init(id: "lewisham", name: "Lewisham", center: (51.4615, -0.012), radius: 0.015, count: 22),
        .init(id: "greenwich-area", name: "Greenwich", center: (51.482, 0.0), radius: 0.015, count: 22),
        .init(id: "forest-hill", name: "Forest Hill", center: (51.4393, -0.052), radius: 0.013, count: 16),
        .init(id: "dulwich", name: "Dulwich", center: (51.4498, -0.083), radius: 0.014, count: 16),
        .init(id: "crystal-palace-area", name: "Crystal Palace", center: (51.4226, -0.075), radius: 0.012, count: 14),
        .init(id: "catford", name: "Catford", center: (51.4452, -0.0258), radius: 0.013, count: 14),
        .init(id: "holloway", name: "Holloway", center: (51.553, -0.115), radius: 0.013, count: 14),
        .init(id: "tottenham", name: "Tottenham", center: (51.5878, -0.067), radius: 0.016, count: 22),
        .init(id: "blackheath", name: "Blackheath", center: (51.467, 0.012), radius: 0.012, count: 12),
        .init(id: "willesden", name: "Willesden", center: (51.5494, -0.232), radius: 0.014, count: 14),

        // Zone 5–6 — Outer
        .init(id: "croydon", name: "Croydon", center: (51.3762, -0.0982), radius: 0.02, count: 30),
        .init(id: "bromley-area", name: "Bromley", center: (51.405, 0.014), radius: 0.018, count: 24),
        .init(id: "kingston", name: "Kingston upon Thames", center: (51.4123, -0.3007), radius: 0.018, count: 24),
        .init(id: "twickenham-area", name: "Twickenham", center: (51.4475, -0.336), radius: 0.015, count: 16),
        .init(id: "richmond-area", name: "Richmond", center: (51.461, -0.302), radius: 0.014, count: 14),
        .init(id: "harrow", name: "Harrow", center: (51.5793, -0.3346), radius: 0.02, count: 24),
        .init(id: "uxbridge-area", name: "Uxbridge", center: (51.5465, -0.477), radius: 0.02, count: 20),
        .init(id: "romford", name: "Romford", center: (51.5755, 0.183), radius: 0.02, count: 24),
        .init(id: "ilford", name: "Ilford", center: (51.5594, 0.0782), radius: 0.018, count: 22),
        .init(id: "enfield", name: "Enfield", center: (51.6523, -0.0832), radius: 0.022, count: 24),
        .init(id: "barnet", name: "Barnet", center: (51.6444, -0.1997), radius: 0.018, count: 18),
        .init(id: "sutton", name: "Sutton", center: (51.3618, -0.1945), radius: 0.016, count: 16),
        .init(id: "wembley-area", name: "Wembley", center: (51.5571, -0.2823), radius: 0.014, count: 14),
        .init(id: "hounslow", name: "Hounslow", center: (51.467, -0.366), radius: 0.017, count: 16),
        .init(id: "bexleyheath", name: "Bexleyheath", center: (51.4569, 0.149), radius: 0.015, count: 14),
        .init(id: "dagenham", name: "Dagenham", center: (51.546, 0.147), radius: 0.016, count: 14)
    ]

    private struct Suffix { let name: String; let symbol: String }
    private static let suffixes: [Suffix] = [
        .init(name: "High St", symbol: "bag.fill"),
        .init(name: "Market", symbol: "basket.fill"),
        .init(name: "Common", symbol: "leaf.fill"),
        .init(name: "Underground", symbol: "tram.fill"),
        .init(name: "Library", symbol: "books.vertical.fill"),
        .init(name: "Square", symbol: "star.fill"),
        .init(name: "Park", symbol: "tree.fill"),
        .init(name: "Station", symbol: "tram.fill"),
        .init(name: "Green", symbol: "leaf.fill"),
        .init(name: "Plaza", symbol: "star.fill"),
        .init(name: "Junction", symbol: "tram.fill"),
        .init(name: "Crescent", symbol: "star.fill"),
        .init(name: "Heights", symbol: "building.2.fill"),
        .init(name: "Riverside", symbol: "sailboat.fill"),
        .init(name: "Bridge", symbol: "building.columns.fill"),
        .init(name: "Mews", symbol: "house.fill")
    ]

    private static let blurbs: [String] = [
        "Daily restock — locals first.",
        "Hidden in the morning rush.",
        "Cafe corner stash — coffee + coins.",
        "After-work cache for the commute home.",
        "Weekend market drop.",
        "Loop runners get there first.",
        "Sun-soaked bench cache.",
        "Tube exit chase vault.",
        "Local heroes only.",
        "Drop-in or drop-out.",
        "Bus-stop bonus — five-minute window.",
        "School-run sweet spot.",
        "Late-night kebab queue prize."
    ]

    private struct TierWeight { let tier: Tier; let weight: Double }
    private static let tierMix: [TierWeight] = [
        .init(tier: .bronze, weight: 0.56),
        .init(tier: .silver, weight: 0.28),
        .init(tier: .gold, weight: 0.12),
        .init(tier: .platinum, weight: 0.04)
    ]

    /// Procedurally generated vaults — same algorithm as `expo/constants/vaults.ts`.
    private static let procedural: [Vault] = boroughs.flatMap(generate(for:))

    private static func generate(for seed: BoroughSeed) -> [Vault] {
        var rng = Mulberry32(seed: fnv1a("borough:" + seed.id))
        var out: [Vault] = []
        out.reserveCapacity(seed.count)

        for i in 0..<seed.count {
            // Guarantee at least one gold per borough (slot 0), and a silver if big.
            let tier: Tier
            if i == 0 {
                tier = .gold
            } else if i == 1 && seed.count > 14 {
                tier = .silver
            } else {
                tier = pickTier(&rng)
            }

            let pos = pointInDisk(&rng, center: seed.center, radius: seed.radius)
            let suf = suffixes[Int(rng.next() * Double(suffixes.count))]
            let blurb = blurbs[Int(rng.next() * Double(blurbs.count))]
            let id = "proc-\(seed.id)-\(i)"

            // Round to 5dp so coords are stable.
            let lat = (pos.lat * 100000).rounded() / 100000
            let lng = (pos.lng * 100000).rounded() / 100000

            out.append(.init(
                id: id,
                name: "\(seed.name) · \(suf.name)",
                area: seed.name,
                blurb: blurb,
                lat: lat,
                lng: lng,
                tier: tier,
                symbol: suf.symbol,
                imageURL: nil
            ))
        }
        return out
    }

    private static func pickTier(_ rng: inout Mulberry32) -> Tier {
        let roll = rng.next()
        var acc = 0.0
        for tw in tierMix {
            acc += tw.weight
            if roll < acc { return tw.tier }
        }
        return .bronze
    }

    private static func pointInDisk(_ rng: inout Mulberry32,
                                    center: (lat: Double, lng: Double),
                                    radius: Double) -> (lat: Double, lng: Double) {
        let r = radius * sqrt(rng.next())
        let theta = rng.next() * .pi * 2
        let cosLat = cos(center.lat * .pi / 180)
        return (
            center.lat + r * sin(theta),
            center.lng + (r * cos(theta)) / max(0.2, cosLat)
        )
    }

    /// Build an Unsplash CDN URL with a sensible width.
    private static func img(_ id: String) -> URL? {
        URL(string: "https://images.unsplash.com/\(id)?w=900&q=80&auto=format&fit=crop")
    }
}

// MARK: - Deterministic PRNG (mirrors expo/constants/vaults.ts)

/// FNV-1a 32-bit hash. Matches the TS implementation exactly.
private func fnv1a(_ s: String) -> UInt32 {
    var h: UInt32 = 2166136261
    for b in s.utf8 {
        h ^= UInt32(b)
        h = h &* 16777619
    }
    return h
}

/// Mulberry32 PRNG — matches the TS `mulberry32` byte-for-byte.
private struct Mulberry32 {
    private var a: UInt32
    init(seed: UInt32) { self.a = seed }

    mutating func next() -> Double {
        a = a &+ 0x6d2b79f5
        var t = a
        t = (t ^ (t >> 15)) &* (t | 1)
        t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
        return Double((t ^ (t >> 14))) / 4_294_967_296.0
    }
}
