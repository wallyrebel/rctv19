sub Main(args as Dynamic)
    screen = CreateObject("roSGScreen")
    port = CreateObject("roMessagePort")
    screen.SetMessagePort(port)
    scene = screen.CreateScene("StationScene")
    if type(args) = "roAssociativeArray"
        if args.DoesExist("contentId") or args.DoesExist("mediaType")
            scene.deepLinkRequest = args
        end if
    end if
    memoryMonitor = CreateObject("roAppMemoryMonitor")
    if memoryMonitor <> invalid
        memoryMonitor.SetMessagePort(port)
        memoryMonitor.EnableMemoryWarningEvent(true)
        print "Available app memory (KB): "; memoryMonitor.GetChannelAvailableMemory()
        print "App memory limits: "; memoryMonitor.GetChannelMemoryLimit()
    end if
    deviceInfo = CreateObject("roDeviceInfo")
    deviceInfo.SetMessagePort(port)
    deviceInfo.EnableLowGeneralMemoryEvent(true)
    screen.Show()
    while true
        msg = wait(0, port)
        if type(msg) = "roSGScreenEvent"
            if msg.IsScreenClosed() then return
        else if type(msg) = "roAppMemoryNotificationEvent"
            if memoryMonitor <> invalid
                print "App memory usage (%): "; memoryMonitor.GetMemoryLimitPercent()
            end if
            scene.memoryWarning = true
        else if type(msg) = "roDeviceInfoEvent"
            info = msg.GetInfo()
            if info <> invalid and info.generalMemoryLevel <> invalid
                if info.generalMemoryLevel <> "normal" then scene.memoryWarning = true
            end if
        end if
    end while
end sub
