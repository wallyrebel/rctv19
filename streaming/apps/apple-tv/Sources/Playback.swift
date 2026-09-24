import SwiftUI
import AVKit

@MainActor final class PlaybackModel: ObservableObject {
    let player = AVPlayer()
    @Published var errorMessage: String?
    @Published var loading = true
    private let request: PlaybackRequest
    private let resumeStore = ResumeStore()
    private var statusObservation: NSKeyValueObservation?
    private var timeObserver: Any?
    private var notifications: [NSObjectProtocol] = []
    private var initialSeekFinished = false
    private var readyHandled = false
    private var mayAutoplay = true
    private var started = false

    init(request: PlaybackRequest) { self.request = request }

    func start() {
        guard !started else { return }
        started = true
        prepare(startSeconds: request.startSeconds)
    }

    func retry() {
        let position = request.isLive ? 0 : resumeStore.position(for: request.program)
        prepare(startSeconds: position)
    }

    private func prepare(startSeconds: Double) {
        releaseItem()
        errorMessage = nil
        loading = true
        readyHandled = false
        initialSeekFinished = false
        mayAutoplay = true
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            loading = false
            errorMessage = "Audio could not be started. Please try again."
            return
        }
        let item = AVPlayerItem(url: request.program.url)
        let title = AVMutableMetadataItem()
        title.identifier = .commonIdentifierTitle
        title.value = request.program.title as NSString
        title.extendedLanguageTag = "und"
        item.externalMetadata = [title]
        player.replaceCurrentItem(with: item)
        statusObservation = item.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
            Task { @MainActor [weak self] in
                guard let self, self.player.currentItem === item else { return }
                switch item.status {
                case .readyToPlay:
                    guard !self.readyHandled else { return }
                    self.readyHandled = true
                    if !self.request.isLive, startSeconds > 0 {
                        let duration = item.duration.seconds
                        let position = duration.isFinite && startSeconds >= duration - 30 ? 0 : startSeconds
                        await self.player.seek(to: CMTime(seconds: position, preferredTimescale: 600))
                    }
                    guard self.player.currentItem === item else { return }
                    self.initialSeekFinished = true
                    self.loading = false
                    if self.mayAutoplay { self.player.play() }
                case .failed:
                    self.showPlaybackError()
                default: break
                }
            }
        }
        timeObserver = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 10, preferredTimescale: 1), queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in self?.savePosition() }
        }
        notifications.append(NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.player.currentItem === item else { return }
                if !self.request.isLive { self.resumeStore.clear(self.request.program) }
            }
        })
        notifications.append(NotificationCenter.default.addObserver(forName: .AVPlayerItemFailedToPlayToEndTime, object: item, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.player.currentItem === item else { return }
                self.showPlaybackError()
            }
        })
    }

    private func showPlaybackError() {
        savePosition()
        player.pause()
        loading = false
        errorMessage = request.isLive
            ? "The live broadcast is unavailable right now. Try again, or return to watch a replay."
            : "This program could not be played. Check your connection and try again."
    }

    private func savePosition() {
        guard !request.isLive, initialSeekFinished,
              let item = player.currentItem, item.status == .readyToPlay else { return }
        let duration = item.duration.seconds
        resumeStore.save(player.currentTime().seconds, for: request.program,
                         duration: duration.isFinite ? duration : request.program.durationSeconds)
    }

    func pauseForBackground() {
        mayAutoplay = false
        savePosition()
        player.pause()
    }

    func stop() {
        mayAutoplay = false
        savePosition()
        releaseItem()
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func releaseItem() {
        player.pause()
        statusObservation?.invalidate()
        statusObservation = nil
        if let timeObserver { player.removeTimeObserver(timeObserver) }
        timeObserver = nil
        notifications.forEach { NotificationCenter.default.removeObserver($0) }
        notifications.removeAll()
        player.replaceCurrentItem(with: nil)
    }
}

struct NativePlayer: UIViewControllerRepresentable {
    let player: AVPlayer
    let close: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(close: close) }
    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.delegate = context.coordinator
        controller.allowsPictureInPicturePlayback = false
        return controller
    }
    func updateUIViewController(_ controller: AVPlayerViewController, context: Context) {
        controller.player = player
        context.coordinator.close = close
    }
    static func dismantleUIViewController(_ controller: AVPlayerViewController, coordinator: Coordinator) {
        controller.player = nil
        controller.delegate = nil
    }

    @MainActor final class Coordinator: NSObject, AVPlayerViewControllerDelegate {
        var close: () -> Void
        init(close: @escaping () -> Void) { self.close = close }
        nonisolated func playerViewControllerShouldDismiss(_ playerViewController: AVPlayerViewController) -> Bool {
            Task { @MainActor [weak self] in self?.close() }
            return false // SwiftUI owns the enclosing full-screen presentation.
        }
    }
}

struct PlayerScreen: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var playback: PlaybackModel

    init(request: PlaybackRequest) {
        _playback = StateObject(wrappedValue: PlaybackModel(request: request))
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if let error = playback.errorMessage {
                VStack(spacing: 28) {
                    Image(systemName: "wifi.exclamationmark").font(.system(size: 52))
                    Text(error).font(.title3).multilineTextAlignment(.center).frame(maxWidth: 950)
                    HStack(spacing: 35) {
                        Button("Try again") { playback.retry() }
                        Button("Back to programs") { dismiss() }
                    }
                }.onExitCommand { dismiss() }
            } else {
                NativePlayer(player: playback.player) { dismiss() }.ignoresSafeArea()
                if playback.loading {
                    ProgressView("Loading video…").padding(30).background(.black.opacity(0.75))
                        .allowsHitTesting(false)
                }
            }
        }
        .onAppear { playback.start() }
        .onDisappear { playback.stop() }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { playback.pauseForBackground() }
        }
    }
}
