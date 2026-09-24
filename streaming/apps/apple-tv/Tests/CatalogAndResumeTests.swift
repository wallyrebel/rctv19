import XCTest
@testable import RCTV19TV

final class CatalogAndResumeTests: XCTestCase {
    func testInstalledAppContainsCatalogConfigurationAndPrivacyPolicy() throws {
        let value = try XCTUnwrap(Bundle.main.object(forInfoDictionaryKey: "CatalogURL") as? String)
        XCTAssertEqual(value, "https://watch.rctv19.com/api/catalog.json")
        XCTAssertEqual(Bundle.main.object(forInfoDictionaryKey: "CatalogChannelID") as? String, "rctv19")
        XCTAssertEqual(Bundle.main.bundleIdentifier, "com.example.rctv19App")
        XCTAssertNotNil(Bundle.main.url(forResource: "PrivacyPolicy", withExtension: "txt"))
    }

    private func program(id: String = "episode-1", url: String = "https://video.example/episode.m3u8") -> Program {
        Program(id: id, title: "Episode 1", description: nil, url: URL(string: url)!,
                type: "hls", durationSeconds: 3600, category: nil, thumbnail: nil)
    }

    func testCatalogRejectsAmbiguousIDsAndInsecureURLs() throws {
        let channel = Channel(id: "rctv19", name: "RCTV 19", description: nil)
        XCTAssertNoThrow(try Catalog(version: 1, channel: channel, live: nil, videos: [program()]).validated())
        XCTAssertThrowsError(try Catalog(version: 1, channel: channel, live: nil, videos: [program(), program()]).validated())
        for url in ["http://video.example/index.m3u8", "https://user:password@video.example/index.m3u8"] {
            XCTAssertThrowsError(try Catalog(version: 1, channel: channel, live: nil, videos: [program(url: url)]).validated())
        }
    }

    func testRCTVFixtureGroupsThreeEpisodesWithDedicatedShowCover() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "rctv19-catalog", withExtension: "json"))
        let catalog = try JSONDecoder().decode(Catalog.self, from: Data(contentsOf: url)).validated()
        XCTAssertEqual(catalog.channel.id, "rctv19")
        XCTAssertEqual(catalog.live?.id, "rctv19-live")
        XCTAssertEqual(catalog.videos.count, 3)
        let show = try XCTUnwrap(catalog.series.first)
        XCTAssertEqual(catalog.series.count, 1)
        XCTAssertEqual(show.title, "Mt Zion Church Sermons")
        XCTAssertEqual(show.programs.map(\.id), catalog.videos.map(\.id))
        XCTAssertEqual(show.thumbnail?.absoluteString,
                       "https://vod.rctv19.com/programs/mt-zion-sermon-2026-09-20/v1/thumbnail.jpg")
        XCTAssertNotEqual(show.thumbnail, catalog.live?.thumbnail)
    }

    func testGroupingPreservesOrderAndHandlesUncategorizedEpisodes() throws {
        let first = Program(id: "a", title: "First", description: nil, url: URL(string: "https://video.example/a.m3u8")!,
                            type: "hls", durationSeconds: 180, category: " Show A ", thumbnail: nil)
        let second = Program(id: "b", title: "Second", description: nil, url: URL(string: "https://video.example/b.m3u8")!,
                             type: "hls", durationSeconds: 180, category: " ", thumbnail: nil)
        let third = Program(id: "c", title: "Third", description: nil, url: URL(string: "https://video.example/c.m3u8")!,
                            type: "hls", durationSeconds: 180, category: "Show A", thumbnail: URL(string: "https://video.example/c.jpg"))
        let catalog = Catalog(version: 1, channel: Channel(id: "rctv19", name: "RCTV 19", description: nil),
                              live: nil, videos: [first, second, third])
        XCTAssertEqual(catalog.series.map(\.title), ["Show A", "RCTV 19 Programs"])
        XCTAssertEqual(catalog.series[0].programs.map(\.id), ["a", "c"])
        XCTAssertEqual(catalog.series[0].thumbnail, third.thumbnail)
    }

    func testCatalogRejectsInsecureSeriesArtwork() {
        var replay = program()
        replay.seriesThumbnail = URL(string: "http://video.example/cover.jpg")
        let catalog = Catalog(version: 1, channel: Channel(id: "rctv19", name: "RCTV 19", description: nil),
                              live: nil, videos: [replay])
        XCTAssertThrowsError(try catalog.validated())
    }

    func testResumeSurvivesStoreRecreationAndStaysIsolatedByEpisode() {
        let suite = "RCTV19Tests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = ResumeStore(defaults: defaults)
        store.save(1234, for: program(), duration: 3600)
        XCTAssertEqual(ResumeStore(defaults: defaults).position(for: program()), 1234)
        XCTAssertEqual(store.position(for: program(id: "episode-2")), 0)
        store.save(.nan, for: program(), duration: 3600)
        XCTAssertEqual(store.position(for: program()), 1234)
        store.clear(program())
        XCTAssertEqual(store.position(for: program()), 0)
    }

    func testCompletedAndBarelyStartedReplaysDoNotOfferResume() {
        let suite = "RCTV19Tests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = ResumeStore(defaults: defaults)
        store.save(300, for: program(), duration: 3600)
        store.save(3571, for: program(), duration: 3600)
        XCTAssertEqual(store.position(for: program()), 0)
        store.save(29, for: program(), duration: 3600)
        XCTAssertEqual(store.position(for: program()), 0)
        store.save(30, for: program(), duration: 3600)
        XCTAssertEqual(store.position(for: program()), 30)
    }
}
