import SwiftUI

private let channelGold = Color(red: 1, green: 0.88, blue: 0.04)
private let channelNavy = Color(red: 0.043, green: 0.09, blue: 0.133)

@main struct RCTV19App: App {
    var body: some Scene { WindowGroup { ChannelView().preferredColorScheme(.dark) } }
}

struct ChannelView: View {
    @StateObject private var model = CatalogModel()
    @State private var selected: PlaybackRequest?
    @State private var resumeProgram: Program?
    @State private var showResume = false
    @State private var showHelp = false
    private let resumeStore = ResumeStore()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 32) {
                        Image("StationLogo").resizable().scaledToFit().frame(width: 260, height: 100)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 10) {
                            Text("RCTV 19").font(.system(size: 48, weight: .heavy)).foregroundStyle(channelGold)
                            Text("Ripley Community Television")
                                .font(.system(size: 30)).foregroundStyle(.secondary)
                        }
                    }
                    if let live = model.catalog?.live {
                        Button { play(live, isLive: true) } label: {
                            HStack(spacing: 28) {
                                Image("LiveCover").resizable().scaledToFit().frame(width: 240, height: 135)
                                    .accessibilityHidden(true)
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("WATCH LIVE").font(.system(size: 38, weight: .bold))
                                    Text("Local news, shows and community coverage.").font(.body)
                                }
                                Spacer()
                                Image(systemName: "play.circle.fill").font(.system(size: 54))
                            }.padding(20).frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .accessibilityLabel("Watch live. \(live.title)")
                        .accessibilityIdentifier(live.id)
                        .accessibilityHint("Plays the RCTV 19 live broadcast")
                    }
                    if model.loading { ProgressView("Loading programming…") }
                    if !model.status.isEmpty { Text(model.status).font(.body).foregroundStyle(.secondary) }
                    if let catalog = model.catalog, !catalog.series.isEmpty {
                        Text("ON DEMAND SHOWS").font(.system(size: 30, weight: .bold)).foregroundStyle(channelGold)
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 35), count: 3), spacing: 35) {
                            ForEach(catalog.series) { series in
                                NavigationLink(value: series.id) {
                                    VStack(alignment: .leading, spacing: 12) {
                                        ProgramArtwork(url: series.thumbnail, height: 170)
                                        Text(series.title).font(.system(size: 29, weight: .semibold))
                                            .lineLimit(2).frame(height: 72, alignment: .topLeading)
                                        Text(episodeCount(series.programs.count)).font(.caption.bold())
                                    }.padding(16).frame(maxWidth: .infinity, alignment: .leading)
                                }
                                .accessibilityLabel("\(series.title), \(episodeCount(series.programs.count))")
                                .accessibilityIdentifier("series-\(series.id)")
                                .accessibilityHint("Opens the episodes in this show")
                            }
                        }
                    }
                    HStack(spacing: 30) {
                        Button("Refresh programming") { Task { await model.load() } }.disabled(model.loading)
                        Button("Help & privacy") { showHelp = true }
                    }.padding(.top, 10)
                }.padding(60)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(channelNavy.ignoresSafeArea())
            .navigationDestination(for: String.self) { id in
                if let series = model.catalog?.series.first(where: { $0.id == id }) {
                    EpisodeGallery(series: series, chooseReplay: chooseReplay)
                } else {
                    Text("This show is no longer available. Press Back to return to programming.")
                        .padding(60).frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(channelNavy.ignoresSafeArea())
                }
            }
        }
        .task { await model.load() }
        .fullScreenCover(item: $selected) { PlayerScreen(request: $0) }
        .sheet(isPresented: $showHelp) { HelpScreen() }
        .alert("Continue watching?", isPresented: $showResume, presenting: resumeProgram) { program in
            Button("Resume at \(playbackTime(resumeStore.position(for: program)))") {
                play(program, start: resumeStore.position(for: program))
            }
            Button("Start from beginning") { resumeStore.clear(program); play(program) }
            Button("Cancel", role: .cancel) { }
        } message: { Text($0.title) }
    }

    private func chooseReplay(_ program: Program) {
        if resumeStore.position(for: program) > 0 {
            resumeProgram = program
            showResume = true
        } else { play(program) }
    }
    private func play(_ program: Program, isLive: Bool = false, start: Double = 0) {
        selected = PlaybackRequest(program: program, isLive: isLive, startSeconds: start)
    }
}

private func episodeCount(_ count: Int) -> String { "\(count) \(count == 1 ? "episode" : "episodes")" }

private struct ProgramArtwork: View {
    let url: URL?
    let height: CGFloat
    var body: some View {
        AsyncImage(url: url) { image in image.resizable().scaledToFill() } placeholder: {
            Image("ShowPlaceholder").resizable().scaledToFit()
        }.frame(height: height).clipped().accessibilityHidden(true)
    }
}

private struct EpisodeGallery: View {
    let series: ProgramSeries
    let chooseReplay: (Program) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                HStack(spacing: 24) {
                    Image("StationLogo").resizable().scaledToFit().frame(width: 200, height: 80)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 8) {
                        Text(series.title).font(.system(size: 42, weight: .bold)).foregroundStyle(channelGold)
                        Text(episodeCount(series.programs.count)).foregroundStyle(.secondary)
                    }
                }
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 35), count: 3), spacing: 35) {
                    ForEach(series.programs) { program in
                        Button { chooseReplay(program) } label: {
                            VStack(alignment: .leading, spacing: 14) {
                                ProgramArtwork(url: program.thumbnail, height: 210)
                                Text(program.title).font(.system(size: 29, weight: .semibold))
                                    .lineLimit(3).frame(height: 110, alignment: .topLeading)
                                HStack {
                                    Text("WATCH EPISODE").font(.caption.bold())
                                    Spacer()
                                    if let duration = program.durationSeconds { Text(playbackTime(duration)).font(.caption) }
                                }
                            }.padding(16).frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .accessibilityLabel(program.title)
                        .accessibilityIdentifier(program.id)
                        .accessibilityHint("Plays this episode or resumes where you stopped")
                    }
                }
                Button("Back to shows") { dismiss() }.padding(.top, 14)
            }.padding(60)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(channelNavy.ignoresSafeArea())
    }
}

struct HelpScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var showPrivacy = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                Text("Help & privacy").font(.largeTitle.bold()).foregroundStyle(channelGold)
                Text("Watch live, or open a show to choose an episode. Use the Siri Remote to pause, play and seek. Press Back to return to the episode gallery, then Back again for the home screen. Unfinished replays offer Resume when you return.")
                Text("No account or subscription is required. Your replay position stays on this Apple TV. Cloudflare processes technical connection information, such as your IP address, to deliver and protect the service. The app has no advertising or analytics SDK.")
                Text("If live video is unavailable, try a replay or refresh programming. Contact us for help or privacy requests:")
                Text("myersgrouponline@gmail.com").foregroundStyle(channelGold)
                Text("Privacy: watch.rctv19.com/privacy/\nTerms: watch.rctv19.com/terms/\nSupport: watch.rctv19.com/support/")
                Button("Read privacy policy") { showPrivacy = true }
                Button("Back to programs") { dismiss() }
            }.font(.body).padding(70)
        }.background(channelNavy).onExitCommand { dismiss() }
            .sheet(isPresented: $showPrivacy) { PrivacyScreen() }
    }
}

struct PrivacyScreen: View {
    @Environment(\.dismiss) private var dismiss
    private let paragraphs: [String] = {
        guard let url = Bundle.main.url(forResource: "PrivacyPolicy", withExtension: "txt"),
              let text = try? String(contentsOf: url, encoding: .utf8) else {
            return ["Privacy policy: watch.rctv19.com/privacy/", "Contact: myersgrouponline@gmail.com"]
        }
        return text.components(separatedBy: "\n\n").filter { !$0.isEmpty }
    }()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                ForEach(Array(paragraphs.enumerated()), id: \.offset) { _, paragraph in
                    Text(paragraph).font(.body).frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12).focusable()
                }
                Button("Done") { dismiss() }
            }.padding(60)
        }.background(channelNavy).onExitCommand { dismiss() }
    }
}
