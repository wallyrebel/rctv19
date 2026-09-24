import XCTest

@MainActor final class PlaybackFlowTests: XCTestCase {
    private let remote = XCUIRemote.shared
    private let liveID = "rctv19-live"
    private let seriesID = "series-Mt Zion Church Sermons"
    private let replayID = "mt-zion-sermon-2026-09-20"

    private func capture(_ name: String, app: XCUIApplication) {
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = name
        image.lifetime = .keepAlways
        add(image)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + "-accessibility"
        tree.lifetime = .keepAlways
        add(tree)
    }

    private func select(_ element: XCUIElement, app: XCUIApplication) {
        XCTAssertTrue(element.waitForExistence(timeout: 25))
        for _ in 0..<16 {
            if element.hasFocus { remote.press(.select); return }
            let focused = app.buttons.matching(NSPredicate(format: "hasFocus == true")).firstMatch
            guard focused.exists else { remote.press(.up); continue }
            let target = element.frame
            let current = focused.frame
            if target.midY > current.midY + 60 { remote.press(.down) }
            else if target.midY < current.midY - 60 { remote.press(.up) }
            else if target.midX > current.midX { remote.press(.right) }
            else { remote.press(.left) }
        }
        XCTFail("Could not focus \(element.identifier)")
    }

    private func returnToPrograms(_ app: XCUIApplication) {
        for _ in 0..<3 {
            if app.buttons[liveID].isHittable { return }
            remote.press(.menu)
        }
        XCTAssertTrue(app.buttons[liveID].waitForExistence(timeout: 10))
    }

    private func returnToEpisodes(_ app: XCUIApplication) {
        for _ in 0..<3 {
            if app.buttons[replayID].isHittable { return }
            remote.press(.menu)
        }
        XCTAssertTrue(app.buttons[replayID].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons[replayID].isHittable)
    }

    private func elapsedSeconds(_ app: XCUIApplication) -> Int {
        let elapsed = app.otherElements["AXElapsedTime"]
        XCTAssertTrue(elapsed.waitForExistence(timeout: 10))
        return elapsed.label.split(separator: ":").compactMap { Int($0) }.reduce(0) { $0 * 60 + $1 }
    }

    func testLiveReplayAndResumeWithRemote() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.buttons[liveID].waitForExistence(timeout: 25))
        XCTAssertTrue(app.buttons[seriesID].exists)
        capture("apple-tv-home", app: app)
        select(app.buttons[liveID], app: app)
        Thread.sleep(forTimeInterval: 12)
        XCTAssertFalse(app.buttons["Try again"].exists)
        XCTAssertFalse(app.staticTexts["Loading video…"].exists)
        capture("apple-tv-live", app: app)
        returnToPrograms(app)
        select(app.buttons[seriesID], app: app)
        XCTAssertTrue(app.buttons[replayID].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["mt-zion-children-2026-09-20"].exists)
        XCTAssertTrue(app.buttons["mt-zion-sermon-2026-08-23"].exists)
        capture("apple-tv-episodes", app: app)
        select(app.buttons[replayID], app: app)
        if app.alerts["Continue watching?"].waitForExistence(timeout: 2) {
            select(app.alerts.buttons.matching(identifier: "Start from beginning").firstMatch, app: app)
        }
        Thread.sleep(forTimeInterval: 40)
        XCTAssertFalse(app.buttons["Try again"].exists)
        XCTAssertFalse(app.staticTexts["Loading video…"].exists)
        remote.press(.playPause)
        capture("apple-tv-replay", app: app)
        let stoppedAt = elapsedSeconds(app)
        XCTAssertGreaterThanOrEqual(stoppedAt, 30)
        returnToEpisodes(app)
        select(app.buttons[replayID], app: app)
        XCTAssertTrue(app.alerts["Continue watching?"].waitForExistence(timeout: 8))
        capture("apple-tv-resume", app: app)
        select(app.alerts.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Resume at '")).firstMatch, app: app)
        Thread.sleep(forTimeInterval: 5)
        remote.press(.playPause)
        let resumedAt = elapsedSeconds(app)
        XCTAssertGreaterThanOrEqual(resumedAt, stoppedAt - 2)
        XCTAssertLessThan(resumedAt, stoppedAt + 20)
        capture("apple-tv-resumed-playback", app: app)
        remote.press(.right)
        remote.press(.right)
        remote.press(.right)
        remote.press(.playPause)
        Thread.sleep(forTimeInterval: 4)
        remote.press(.playPause)
        XCTAssertGreaterThan(elapsedSeconds(app), resumedAt + 10)
        capture("apple-tv-seek", app: app)
        remote.press(.playPause)
        remote.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 10))
        app.activate()
        let backgroundPosition = elapsedSeconds(app)
        Thread.sleep(forTimeInterval: 4)
        XCTAssertLessThanOrEqual(elapsedSeconds(app), backgroundPosition + 2)
        remote.press(.playPause)
        Thread.sleep(forTimeInterval: 4)
        remote.press(.playPause)
        XCTAssertGreaterThan(elapsedSeconds(app), backgroundPosition + 2)
        returnToPrograms(app)
        select(app.buttons["Help & privacy"], app: app)
        XCTAssertTrue(app.buttons["Read privacy policy"].waitForExistence(timeout: 10))
        select(app.buttons["Read privacy policy"], app: app)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Privacy'")).firstMatch.waitForExistence(timeout: 10))
        capture("apple-tv-privacy", app: app)
        app.terminate()
    }
}
