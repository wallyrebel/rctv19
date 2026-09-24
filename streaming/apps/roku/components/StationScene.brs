sub init()
    m.top.backgroundColor = "0x0b1722ff"
    m.top.backgroundUri = ""
    m.homeGrid = m.top.findNode("homeGrid")
    m.episodeGrid = m.top.findNode("episodeGrid")
    m.pageTitle = m.top.findNode("pageTitle")
    m.hint = m.top.findNode("hint")
    m.status = m.top.findNode("status")
    m.description = m.top.findNode("description")
    m.video = m.top.findNode("video")
    m.bookmarks = CreateObject("roRegistrySection", "PlaybackBookmarks")
    m.bookmarkTimer = m.top.findNode("bookmarkTimer")
    m.bookmarkTimer.observeField("fire", "saveBookmark")
    m.currentItem = invalid
    m.launchComplete = false
    m.resumePosition = 0
    m.loadingCatalog = false
    m.items = []
    m.groups = []
    m.homeEntries = []
    m.episodeIndices = []
    m.currentGroup = -1
    m.inputTask = CreateObject("roSGNode", "InputTask")
    m.inputTask.observeField("inputData", "onInputData")
    m.inputTask.control = "RUN"
    m.homeGrid.observeField("itemSelected", "onHomeSelect")
    m.homeGrid.observeField("itemFocused", "onHomeFocus")
    m.episodeGrid.observeField("itemSelected", "onEpisodeSelect")
    m.episodeGrid.observeField("itemFocused", "onEpisodeFocus")
    m.video.observeField("state", "onVideoState")
    loadCatalog()
end sub

sub onInputData()
    info = m.inputTask.inputData
    if info <> invalid and info.contentId <> invalid
        m.top.deepLinkContentId = info.contentId
    end if
end sub

sub releaseUnusedMemory()
    ' Preserve active playback; release only completed catalog work and dialogs.
    if not m.loadingCatalog then m.task = invalid
    if m.top.dialog <> invalid
        if m.top.dialog.close then m.top.dialog = invalid
    end if
end sub

sub loadCatalog()
    if m.loadingCatalog then return
    m.loadingCatalog = true
    m.homeGrid.visible = false
    m.episodeGrid.visible = false
    m.description.text = ""
    m.status.visible = true
    m.status.text = "Loading programming..."
    m.pageTitle.text = "WATCH NOW"
    m.hint.text = "OK: select    *: refresh"
    m.task = CreateObject("roSGNode", "CatalogTask")
    m.task.observeField("feed", "onCatalog")
    m.task.observeField("errorMessage", "onCatalogError")
    m.task.control = "RUN"
    m.top.setFocus(true)
end sub

sub onCatalogError()
    m.loadingCatalog = false
    m.status.text = m.task.errorMessage
    markLaunchComplete()
end sub

sub markLaunchComplete()
    if not m.launchComplete
        m.top.signalBeacon("AppLaunchComplete")
        m.launchComplete = true
    end if
end sub

sub onCatalog()
    m.loadingCatalog = false
    feed = m.task.feed
    m.items = []
    m.groups = []
    m.homeEntries = []
    m.episodeIndices = []
    m.currentGroup = -1
    if feed.live <> invalid
        addProgram(feed.live, true)
    end if
    for each item in feed.videos
        addProgram(item, false)
    end for
    if m.items.Count() = 0
        m.status.text = "The next broadcast and replays will appear here when available. Press OK to refresh."
        markLaunchComplete()
        return
    end if
    m.status.visible = false
    showHome()
    markLaunchComplete()
    onDeepLink()
end sub

sub addProgram(item as Object, isLive as Boolean)
    if item.id = invalid or item.title = invalid or item.url = invalid then return
    if Left(item.url, 8) <> "https://" then return
    item.isLive = isLive
    index = m.items.Count()
    m.items.Push(item)
    if isLive then return
    category = "More shows"
    if type(item.category) = "roString"
        if item.category <> "" then category = item.category
    end if
    groupIndex = -1
    for i = 0 to m.groups.Count() - 1
        if m.groups[i].title = category then groupIndex = i
    end for
    if groupIndex < 0
        image = "pkg:/images/show-placeholder.png"
        if type(item.thumbnail) = "roString"
            if Left(item.thumbnail, 8) = "https://" then image = item.thumbnail
        end if
        if type(item.seriesThumbnail) = "roString"
            if Left(item.seriesThumbnail, 8) = "https://" then image = item.seriesThumbnail
        end if
        m.groups.Push({ title: category, image: image, indices: [index] })
    else
        m.groups[groupIndex].indices.Push(index)
    end if
end sub

sub addPoster(root as Object, image as String, title as String, subtitle as String)
    content = root.createChild("ContentNode")
    content.hdGridPosterUrl = image
    content.shortDescriptionLine1 = title
    content.shortDescriptionLine2 = subtitle
end sub

sub showHome()
    m.currentGroup = -1
    m.episodeGrid.visible = false
    m.pageTitle.text = "WATCH NOW"
    m.hint.text = "OK: select    *: refresh"
    root = CreateObject("roSGNode", "ContentNode")
    m.homeEntries = []
    for i = 0 to m.items.Count() - 1
        if m.items[i].isLive
            addPoster(root, "pkg:/images/live-cover.png", "Watch live", m.items[i].title)
            m.homeEntries.Push({ kind: "live", index: i })
        end if
    end for
    for i = 0 to m.groups.Count() - 1
        group = m.groups[i]
        image = group.image
        count = group.indices.Count()
        label = count.ToStr() + " episodes"
        if count = 1 then label = "1 episode"
        addPoster(root, image, group.title, label + "  >")
        m.homeEntries.Push({ kind: "group", index: i })
    end for
    m.homeGrid.content = root
    m.homeGrid.visible = true
    m.homeGrid.setFocus(true)
    onHomeFocus()
end sub

sub showEpisodes(groupIndex as Integer)
    if groupIndex < 0 or groupIndex >= m.groups.Count() then return
    m.currentGroup = groupIndex
    group = m.groups[groupIndex]
    m.homeGrid.visible = false
    m.pageTitle.text = "ON DEMAND  /  " + group.title
    m.hint.text = "Back: all shows    OK: watch    *: refresh"
    m.episodeIndices = group.indices
    root = CreateObject("roSGNode", "ContentNode")
    for each index in m.episodeIndices
        item = m.items[index]
        image = "pkg:/images/show-placeholder.png"
        if type(item.thumbnail) = "roString"
            if Left(item.thumbnail, 8) = "https://" then image = item.thumbnail
        end if
        subtitle = "Episode"
        if item.durationSeconds <> invalid
            minutes = Int(item.durationSeconds / 60)
            subtitle = minutes.ToStr() + " min"
        end if
        addPoster(root, image, item.title, subtitle)
    end for
    m.episodeGrid.content = root
    m.episodeGrid.visible = true
    m.episodeGrid.setFocus(true)
    onEpisodeFocus()
end sub

sub onHomeFocus()
    if not m.homeGrid.visible then return
    index = m.homeGrid.itemFocused
    if index < 0 or index >= m.homeEntries.Count() then return
    entry = m.homeEntries[index]
    if entry.kind = "live"
        m.description.text = "Ripley Community Television. Local programming, live and on demand."
        if type(m.items[entry.index].description) = "roString" then m.description.text = m.items[entry.index].description
    else
        group = m.groups[entry.index]
        m.description.text = "Browse " + group.title + " and choose an episode to watch."
    end if
end sub

sub onEpisodeFocus()
    if not m.episodeGrid.visible then return
    index = m.episodeGrid.itemFocused
    if index < 0 or index >= m.episodeIndices.Count() then return
    item = m.items[m.episodeIndices[index]]
    m.description.text = item.title
    if type(item.description) = "roString" then m.description.text = item.description
end sub

sub onHomeSelect()
    index = m.homeGrid.itemSelected
    if index < 0 or index >= m.homeEntries.Count() then return
    entry = m.homeEntries[index]
    if entry.kind = "live" then selectProgram(entry.index) else showEpisodes(entry.index)
end sub

sub onEpisodeSelect()
    index = m.episodeGrid.itemSelected
    if index < 0 or index >= m.episodeIndices.Count() then return
    selectProgram(m.episodeIndices[index])
end sub

sub selectProgram(index as Integer)
    if index < 0 or index >= m.items.Count() then return
    item = m.items[index]
    if bookmarkFor(item) > 0
        m.pendingIndex = index
        dialog = CreateObject("roSGNode", "Dialog")
        dialog.title = item.title
        dialog.message = "Continue watching from where you stopped?"
        dialog.buttons = ["Resume", "Start from beginning", "Cancel"]
        dialog.observeField("buttonSelected", "onResumeChoice")
        m.top.dialog = dialog
    else
        playItem(index)
    end if
end sub

sub onResumeChoice()
    choice = m.top.dialog.buttonSelected
    m.top.dialog.close = true
    if choice = 0 then playItem(m.pendingIndex)
    if choice = 1 then playItem(m.pendingIndex, false)
end sub

function bookmarkFor(item as Object) as Integer
    if item.isLive then return 0
    if not m.bookmarks.Exists(item.id) then return 0
    position = Int(Val(m.bookmarks.Read(item.id)))
    if position < 30 then return 0
    if item.durationSeconds <> invalid
        if position >= item.durationSeconds - 30 then return 0
    end if
    return position
end function

sub saveBookmark()
    if m.currentItem = invalid then return
    if m.currentItem.isLive or not m.video.visible then return
    if m.video.position < 1 then return
    m.bookmarks.Write(m.currentItem.id, Int(m.video.position).ToStr())
    m.bookmarks.Flush()
end sub

sub onDeepLink()
    if m.items = invalid or m.top.deepLinkContentId = "" then return
    for i = 0 to m.items.Count() - 1
        if m.items[i].id = m.top.deepLinkContentId
            m.top.deepLinkContentId = ""
            if not m.items[i].isLive
                for j = 0 to m.groups.Count() - 1
                    for each groupIndex in m.groups[j].indices
                        if groupIndex = i then showEpisodes(j)
                    end for
                end for
            end if
            playItem(i)
            return
        end if
    end for
    requestedId = m.top.deepLinkContentId
    if m.refreshedDeepLinkId <> requestedId
        m.refreshedDeepLinkId = requestedId
        if m.video.visible then closePlayer()
        loadCatalog()
    else
        m.top.deepLinkContentId = ""
        m.description.text = "That program is not currently available. Choose another program."
    end if
end sub

sub playItem(index as Integer, resume = true as Boolean)
    if index < 0 or index >= m.items.Count() then return
    if m.video.visible then closePlayer()
    item = m.items[index]
    m.currentItem = item
    m.resumePosition = 0
    if resume then m.resumePosition = bookmarkFor(item)
    content = CreateObject("roSGNode", "ContentNode")
    content.id = item.id
    content.title = item.title
    content.url = item.url
    content.streamFormat = item.type
    content.live = item.isLive
    if item.durationSeconds <> invalid then content.length = Int(item.durationSeconds)
    if item.hdBifUrl <> invalid then content.HDBifUrl = item.hdBifUrl
    if item.sdBifUrl <> invalid then content.SDBifUrl = item.sdBifUrl
    m.video.content = content
    m.video.visible = true
    m.video.setFocus(true)
    m.video.control = "play"
    m.bookmarkTimer.control = "start"
end sub

sub closePlayer(save = true as Boolean)
    if save then saveBookmark()
    m.bookmarkTimer.control = "stop"
    m.currentItem = invalid
    m.video.control = "stop"
    m.video.visible = false
    if m.currentGroup >= 0 then m.episodeGrid.setFocus(true) else m.homeGrid.setFocus(true)
end sub

sub onVideoState()
    if m.video.state = "finished"
        if m.currentItem <> invalid
            m.bookmarks.Delete(m.currentItem.id)
            m.bookmarks.Flush()
        end if
        closePlayer(false)
    else if m.video.state = "playing" and m.resumePosition > 0
        m.video.seek = m.resumePosition
        m.resumePosition = 0
    else if m.video.state = "paused"
        saveBookmark()
    else if m.video.state = "error"
        closePlayer()
        m.description.text = "This video is temporarily unavailable. Select it again to retry."
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false
    if key = "back" and m.video.visible
        closePlayer()
        return true
    end if
    if key = "back" and m.currentGroup >= 0
        showHome()
        return true
    end if
    if key = "OK" and not m.homeGrid.visible and not m.episodeGrid.visible
        loadCatalog()
        return true
    end if
    if key = "options" and not m.video.visible
        loadCatalog()
        return true
    end if
    return false
end function
