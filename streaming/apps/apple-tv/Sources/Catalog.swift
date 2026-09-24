import Foundation
import Combine

struct Program: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let url: URL
    let type: String
    let durationSeconds: Double?
    let category: String?
    let thumbnail: URL?
    var seriesThumbnail: URL? = nil
}

struct ProgramSeries: Identifiable {
    let id: String
    let title: String
    let programs: [Program]

    var thumbnail: URL? {
        programs.compactMap(\.seriesThumbnail).first ?? programs.compactMap(\.thumbnail).first
    }
}

struct Channel: Codable {
    let id: String
    let name: String
    let description: String?
}

struct Catalog: Codable {
    let version: Int
    let channel: Channel
    let live: Program?
    let videos: [Program]

    // Keep catalog order within each show; a new episode automatically joins its show.
    var series: [ProgramSeries] {
        var titles: [String] = []
        var grouped: [String: [Program]] = [:]
        for program in videos {
            let category = program.category?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let title = category.isEmpty ? "RCTV 19 Programs" : category
            if grouped[title] == nil { titles.append(title) }
            grouped[title, default: []].append(program)
        }
        return titles.map { ProgramSeries(id: $0, title: $0, programs: grouped[$0] ?? []) }
    }

    static func isHTTPS(_ url: URL) -> Bool {
        url.scheme?.lowercased() == "https" && !(url.host ?? "").isEmpty
            && url.user == nil && url.password == nil
    }

    func validated() throws -> Catalog {
        let programs = videos + (live.map { [$0] } ?? [])
        guard version == 1, !channel.id.isEmpty, !channel.name.isEmpty,
              Set(programs.map(\.id)).count == programs.count,
              programs.allSatisfy({ program in
                  !program.id.isEmpty && !program.title.isEmpty
                      && Self.isHTTPS(program.url)
                      && ["hls", "mp4"].contains(program.type)
                      && (program.thumbnail.map(Self.isHTTPS) ?? true)
                      && (program.seriesThumbnail.map(Self.isHTTPS) ?? true)
                      && (program.durationSeconds.map { $0.isFinite && $0 > 0 } ?? true)
              }) else { throw URLError(.cannotParseResponse) }
        return self
    }
}

@MainActor final class CatalogModel: ObservableObject {
    @Published var catalog: Catalog?
    @Published var status = ""
    @Published var loading = false

    func load() async {
        guard !loading else { return }
        guard let value = Bundle.main.object(forInfoDictionaryKey: "CatalogURL") as? String,
              let url = URL(string: value), Catalog.isHTTPS(url) else {
            status = "Programming is unavailable. Please contact support."
            return
        }
        loading = true
        defer { loading = false }
        do {
            var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)
            request.timeoutInterval = 20
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            let parsed = try JSONDecoder().decode(Catalog.self, from: data).validated()
            guard parsed.channel.id == Bundle.main.object(forInfoDictionaryKey: "CatalogChannelID") as? String else {
                throw URLError(.cannotParseResponse)
            }
            try Task.checkCancellation()
            catalog = parsed
            status = parsed.videos.isEmpty && parsed.live == nil
                ? "The next broadcast and replays will appear here when available." : ""
        } catch is CancellationError {
            return
        } catch {
            status = catalog == nil
                ? "Programming could not be loaded. Check your connection and choose Refresh programming."
                : "Could not refresh programming. Your last loaded programs are still available."
        }
    }
}

struct PlaybackRequest: Identifiable {
    let id = UUID()
    let program: Program
    let isLive: Bool
    let startSeconds: Double
}

struct ResumeStore {
    private let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    private func key(_ program: Program) -> String { "replay-position.\(program.id)" }

    func position(for program: Program) -> Double {
        let seconds = defaults.double(forKey: key(program))
        guard seconds.isFinite, seconds >= 30 else { return 0 }
        if let duration = program.durationSeconds, seconds >= duration - 30 { return 0 }
        return seconds
    }

    func save(_ seconds: Double, for program: Program, duration: Double?) {
        guard seconds.isFinite, seconds >= 0 else { return }
        if seconds < 30 || (duration.map { $0.isFinite && $0 > 0 && seconds >= $0 - 30 } ?? false) {
            clear(program)
        } else {
            defaults.set(seconds, forKey: key(program))
        }
    }

    func clear(_ program: Program) { defaults.removeObject(forKey: key(program)) }
}

func playbackTime(_ seconds: Double) -> String {
    let value = Int(max(0, min(31536000, seconds.isFinite ? seconds : 0)))
    return value >= 3600
        ? String(format: "%d:%02d:%02d", value / 3600, (value / 60) % 60, value % 60)
        : String(format: "%d:%02d", value / 60, value % 60)
}
