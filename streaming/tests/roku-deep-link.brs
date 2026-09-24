' Run the real app resolver with a pinned, development-only interpreter:
' npm exec --yes --package=brs@0.45.0 -- brs apps/roku/components/DeepLink.brs tests/roku-deep-link.brs
' This file is outside bsconfig.files and must not ship in the Roku package.
sub Main()
    m.failures = 0
    m.checks = 0
    liveId = "rctv19-live"
    replayId = "mt-zion-sermon-2026-09-20"
    items = [{ id: liveId, isLive: true }, { id: replayId, isLive: false }]

    assertRoute("portal live alias", { contentId: liveId, mediaType: "live" }, items, invalid, "play", 0)
    assertRoute("documented liveFeed", { contentId: liveId, mediaType: "liveFeed" }, items, invalid, "play", 0)
    assertRoute("case insensitive keys and type", { CONTENTID: liveId, MEDIATYPE: "LIVEFEED" }, items, invalid, "play", 0)
    assertRoute("episode", { contentId: replayId, mediaType: "episode" }, items, invalid, "play", 1)
    assertRoute("live with episode type", { contentId: liveId, mediaType: "episode" }, items, invalid, "home")
    assertRoute("replay with live type", { contentId: replayId, mediaType: "live" }, items, invalid, "home")
    assertRoute("replay with liveFeed type", { contentId: replayId, mediaType: "liveFeed" }, items, invalid, "home")
    assertRoute("valid id unknown type", { contentId: replayId, mediaType: "garbage" }, items, invalid, "home")
    assertRoute("series not supported", { contentId: replayId, mediaType: "series" }, items, invalid, "home")
    assertRoute("missing type", { contentId: replayId }, items, invalid, "home")
    assertRoute("empty type", { contentId: replayId, mediaType: "" }, items, invalid, "home")
    assertRoute("non-string type", { contentId: replayId, mediaType: 123 }, items, invalid, "home")
    assertRoute("missing id", { mediaType: "episode" }, items, invalid, "home")
    assertRoute("empty id", { contentId: "", mediaType: "episode" }, items, invalid, "home")
    assertRoute("non-string id", { contentId: 123, mediaType: "episode" }, items, invalid, "home")
    assertRoute("invalid request", invalid, items, invalid, "home")
    assertRoute("non-object request", "malformed", items, invalid, "home")

    missing = { contentId: "not-in-catalog", mediaType: "episode" }
    refreshed = resolveDeepLink(missing, items, invalid)
    assertResult("unknown id refreshes once", refreshed.action = "refresh")
    assertResult("refresh retains requested id", refreshed.contentId = missing.contentId)
    assertRoute("unknown id after refresh returns home", missing, items, refreshed.contentId, "home")
    assertRoute("different unknown id can refresh", { contentId: "another-id", mediaType: "episode" }, items, refreshed.contentId, "refresh")
    assertRoute("unknown id invalid type never refreshes", { contentId: "not-in-catalog", mediaType: "garbage" }, items, invalid, "home")
    items.Push({ id: missing.contentId, isLive: false })
    assertRoute("new catalog resolves after refresh", missing, items, refreshed.contentId, "play", 2)

    if m.failures > 0
        print "FAIL: "; m.failures; " of "; m.checks; " deep-link checks"
        ' Force a failing interpreter exit instead of silently reporting success.
        failure = invalid
        failure.deepLinkTestsFailed()
    end if
    print "PASS: "; m.checks; " deep-link checks"
end sub

sub assertRoute(label as String, request as Dynamic, items as Object, refreshedId as Dynamic, action as String, index = -1 as Integer)
    result = resolveDeepLink(request, items, refreshedId)
    assertResult(label, result.action = action)
    if action = "play" then assertResult(label + " item", result.index = index)
end sub

sub assertResult(label as String, passed as Boolean)
    m.checks = m.checks + 1
    if not passed
        print "FAIL: "; label
        m.failures = m.failures + 1
    end if
end sub
