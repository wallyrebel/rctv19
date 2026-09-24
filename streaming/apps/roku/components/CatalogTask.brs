sub init()
    m.top.functionName = "fetchCatalog"
end sub

sub fetchCatalog()
    config = ParseJson(ReadAsciiFile("pkg:/config.json"))
    if config = invalid or config.catalogUrl = invalid
        m.top.errorMessage = "Programming is not available yet. Please check back soon."
        return
    end if
    if Left(config.catalogUrl, 8) <> "https://"
        m.top.errorMessage = "Programming is not available yet. Please check back soon."
        return
    end if
    port = CreateObject("roMessagePort")
    request = CreateObject("roUrlTransfer")
    request.SetMessagePort(port)
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.InitClientCertificates()
    request.SetUrl(config.catalogUrl)
    if not request.AsyncGetToString()
        m.top.errorMessage = "Unable to load programming. Press OK to retry."
        return
    end if
    msg = wait(10000, port)
    if type(msg) <> "roUrlEvent"
        request.AsyncCancel()
        m.top.errorMessage = "The connection timed out. Press OK to retry."
        return
    end if
    if msg.GetResponseCode() <> 200
        m.top.errorMessage = "Programming is temporarily unavailable. Press OK to retry."
        return
    end if
    feed = ParseJson(msg.GetString())
    if feed = invalid
        m.top.errorMessage = "Programming is temporarily unavailable. Press OK to retry."
        return
    end if
    if feed.version <> 1 or type(feed.videos) <> "roArray"
        m.top.errorMessage = "Programming is temporarily unavailable. Press OK to retry."
        return
    end if
    m.top.feed = feed
end sub
