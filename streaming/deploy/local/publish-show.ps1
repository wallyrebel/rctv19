$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$script:project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
. (Join-Path $PSScriptRoot 'runtime-path.ps1')
$script:jobs = Join-Path $env:RCTV_BROADCAST_DIRECTORY 'show-jobs'
[IO.Directory]::CreateDirectory($script:jobs) | Out-Null
$script:jobPath = $null
$script:process = $null
$form = New-Object Windows.Forms.Form
$form.Text = 'RCTV 19 - Publish a Show'
$form.Size = New-Object Drawing.Size(730,610)
$form.StartPosition = 'CenterScreen'
$form.Font = New-Object Drawing.Font('Segoe UI',10)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
function Label($text,$x,$y,$width=650) {
    $c = New-Object Windows.Forms.Label
    $c.Text=$text; $c.Location=New-Object Drawing.Point($x,$y); $c.Size=New-Object Drawing.Size($width,25)
    $form.Controls.Add($c)
}
function Button($text,$x,$y,$width=180) {
    $c=New-Object Windows.Forms.Button
    $c.Text=$text; $c.Location=New-Object Drawing.Point($x,$y); $c.Size=New-Object Drawing.Size($width,36)
    $form.Controls.Add($c); return $c
}
function TextBox($x,$y,$width=650) {
    $c=New-Object Windows.Forms.TextBox
    $c.Location=New-Object Drawing.Point($x,$y); $c.Width=$width
    $form.Controls.Add($c); return $c
}
Label 'Add a recorded show to your website and TV apps' 22 18
Label '1. Choose your video' 22 54
$source=TextBox 22 82 510; $source.ReadOnly=$true
$browse=Button 'Browse...' 544 78 140
Label 'Show title' 22 122
$title=TextBox 22 150
Label 'Series / category' 22 189
$category=TextBox 22 217; $category.Text='RCTV 19 Programs'
$quality=New-Object Windows.Forms.ComboBox
$quality.Location=New-Object Drawing.Point(22,260); $quality.Width=650; $quality.DropDownStyle='DropDownList'
$quality.Items.Add('Keep source quality (H.264 / AAC video)') | Out-Null
$quality.Items.Add('Smaller talk-show copy (lossy; review before publishing)') | Out-Null
$quality.SelectedIndex=0; $form.Controls.Add($quality)
$prepare=Button '2. Prepare show' 22 305 205
$preview=Button 'Review video' 243 305 205; $preview.Enabled=$false
$publish=Button '3. Upload and publish' 464 305 220; $publish.Enabled=$false
$status=New-Object Windows.Forms.TextBox
$status.Location=New-Object Drawing.Point(22,356); $status.Size=New-Object Drawing.Size(662,140)
$status.Multiline=$true; $status.ReadOnly=$true; $status.ScrollBars='Vertical'
$status.Text='Original files are kept. Preparation runs on this PC. Publishing makes the show public.'
$form.Controls.Add($status)
$resume=Button 'Resume saved show' 22 515 205
$new=Button 'New show' 243 515 140
$site=Button 'Open watch website' 464 515 220
function Update-Job {
    if($script:jobPath -and (Test-Path -LiteralPath $script:jobPath)) {
        try {
            $j=Get-Content -LiteralPath $script:jobPath -Raw | ConvertFrom-Json
            $status.Text=$j.detail
            if($script:process -and -not $script:process.HasExited) {
                $log=Join-Path $script:jobs ($j.id+'.log')
                if(Test-Path -LiteralPath $log) { $status.AppendText("`r`n"+((Get-Content -LiteralPath $log -Tail 4) -join "`r`n")) }
            }
            $busy=$script:process -and -not $script:process.HasExited
            $ready=Test-Path -LiteralPath (Join-Path $script:jobs ($j.id+'\prepared\'+$j.id+'\ready.json'))
            $preview.Enabled=(-not $busy -and $ready)
            $publish.Enabled=(-not $busy -and $ready -and $j.status -ne 'published')
            $prepare.Enabled=(-not $busy -and -not $ready)
            $new.Enabled=-not $busy; $resume.Enabled=-not $busy
        } catch { }
    }
}
function Run-Step($action) {
    try {
        if($script:process -and -not $script:process.HasExited) {return}
        if(-not $script:jobPath) {
            if(-not (Test-Path -LiteralPath $source.Text -PathType Leaf) -or -not $title.Text.Trim()) {throw 'Choose a video and enter its title first.'}
            if($title.Text.Trim().Length -gt 160) {throw 'Please keep the title under 160 characters.'}
            $id='show-'+[Guid]::NewGuid().ToString()
            $script:jobPath=Join-Path $script:jobs ($id+'.json')
            $mode=if($quality.SelectedIndex -eq 1){'talk'}else{'preserve'}
            $j=@{id=$id;source=$source.Text;title=$title.Text.Trim();category=$category.Text.Trim();quality=$mode;status='new';detail='Starting preparation.'}
            [IO.File]::WriteAllText($script:jobPath,($j | ConvertTo-Json))
        }
        $j=Get-Content -LiteralPath $script:jobPath -Raw | ConvertFrom-Json
        if($action -eq 'publish') {
            $answer=[Windows.Forms.MessageBox]::Show('Publish "'+$j.title+'" publicly on the website and TV apps? Confirm that you have reviewed picture and sound and have permission to stream it. Cloudflare storage usage applies.','Publish show','YesNo','Question')
            if($answer -ne 'Yes') {return}
        }
        $node=Join-Path $env:ProgramFiles 'nodejs\node.exe'
        $rctvArguments='"'+(Join-Path $script:project 'scripts\show-workflow.mjs')+'" '+$action+' "'+$script:jobPath+'"'
        $script:process=Start-Process -FilePath $node -ArgumentList $rctvArguments -WorkingDirectory $script:project -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $script:jobs ($j.id+'.log')) -RedirectStandardError (Join-Path $script:jobs ($j.id+'.error.log'))
        $browse.Enabled=$false; $title.ReadOnly=$true; $category.ReadOnly=$true; $quality.Enabled=$false
        $status.Text='Starting. Keep this PC awake until the job completes.'
        $prepare.Enabled=$false; $publish.Enabled=$false; $preview.Enabled=$false; $new.Enabled=$false; $resume.Enabled=$false
    } catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message,'Publish a Show') | Out-Null }
}
$browse.Add_Click({
    $dialog=New-Object Windows.Forms.OpenFileDialog
    $dialog.Filter='Video files|*.mp4;*.m4v;*.mov;*.mkv'
    if($dialog.ShowDialog() -eq 'OK') {$source.Text=$dialog.FileName; if(-not $title.Text) {$title.Text=[IO.Path]::GetFileNameWithoutExtension($dialog.FileName)}}
    $dialog.Dispose()
})
$prepare.Add_Click({Run-Step 'prepare'})
$publish.Add_Click({Run-Step 'publish'})
$preview.Add_Click({$j=Get-Content -LiteralPath $script:jobPath -Raw | ConvertFrom-Json; if($j.preview -and (Test-Path -LiteralPath $j.preview)) {Start-Process -FilePath $j.preview}})
$site.Add_Click({Start-Process 'https://watch.rctv19.com/'})
$resume.Add_Click({
    $dialog=New-Object Windows.Forms.OpenFileDialog
    $dialog.InitialDirectory=$script:jobs; $dialog.Filter='Saved show jobs|show-*.json'
    if($dialog.ShowDialog() -eq 'OK') {
        $script:jobPath=$dialog.FileName; $j=Get-Content -LiteralPath $script:jobPath -Raw | ConvertFrom-Json
        $source.Text=$j.source; $title.Text=$j.title; $category.Text=$j.category
        $quality.SelectedIndex=if($j.quality -eq 'talk'){1}else{0}
        $browse.Enabled=$false; $title.ReadOnly=$true; $category.ReadOnly=$true; $quality.Enabled=$false
        Update-Job
    }
    $dialog.Dispose()
})
$new.Add_Click({
    $script:jobPath=$null; $script:process=$null; $source.Clear(); $title.Clear()
    $browse.Enabled=$true; $title.ReadOnly=$false; $category.ReadOnly=$false; $quality.Enabled=$true
    $prepare.Enabled=$true; $preview.Enabled=$false; $publish.Enabled=$false
    $status.Text='Choose a video and enter its title.'
})
$timer=New-Object Windows.Forms.Timer; $timer.Interval=1000; $timer.Add_Tick({Update-Job}); $timer.Start()
$form.Add_FormClosing({param($sender,$eventArgs)
    if($script:process -and -not $script:process.HasExited) {
        [Windows.Forms.MessageBox]::Show('A show is still being processed. Leave this window open until it finishes.','Publish a Show') | Out-Null
        $eventArgs.Cancel=$true
    }
})
[void]$form.ShowDialog()
$timer.Dispose(); $form.Dispose()
