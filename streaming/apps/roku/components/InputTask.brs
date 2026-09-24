sub init()
    m.top.functionName = "listenForInput"
end sub

sub listenForInput()
    port = CreateObject("roMessagePort")
    input = CreateObject("roInput")
    input.SetMessagePort(port)
    while true
        event = wait(0, port)
        if type(event) = "roInputEvent"
            if event.IsInput()
                info = event.GetInfo()
                if type(info) = "roAssociativeArray"
                    if info.DoesExist("contentId") or info.DoesExist("mediaType")
                        m.top.inputData = info
                    end if
                end if
            end if
        end if
    end while
end sub
