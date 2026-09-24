' Decide the destination without changing UI or starting playback.
function resolveDeepLink(request as Dynamic, items as Object, refreshedId as Dynamic) as Object
    home = { action: "home" }
    if type(request) <> "roAssociativeArray" then return home
    if not isDeepLinkString(request.contentId) then return home
    if not isDeepLinkString(request.mediaType) then return home
    if request.contentId = "" then return home
    mediaType = LCase(request.mediaType)
    if mediaType <> "episode" and mediaType <> "live" and mediaType <> "livefeed" then return home
    for index = 0 to items.Count() - 1
        item = items[index]
        if item.id = request.contentId
            if item.isLive
                if mediaType = "live" or mediaType = "livefeed"
                    return { action: "play", index: index }
                end if
            else if mediaType = "episode"
                return { action: "play", index: index }
            end if
            return home
        end if
    end for
    if refreshedId = request.contentId then return home
    return { action: "refresh", contentId: request.contentId }
end function

function isDeepLinkString(value as Dynamic) as Boolean
    return type(value) = "roString" or type(value) = "String"
end function
