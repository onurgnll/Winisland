$ErrorActionPreference = 'Stop'

function Try-DeviceLocation {
  Add-Type -AssemblyName System.Device
  $watcher = New-Object System.Device.Location.GeoCoordinateWatcher
  $watcher.Start()
  $deadline = (Get-Date).AddSeconds(8)
  while ((Get-Date) -lt $deadline) {
    if ($watcher.Status -eq 'Ready' -and -not $watcher.Position.Location.IsUnknown) {
      $loc = $watcher.Position.Location
      $watcher.Stop()
      return @{ lat = $loc.Latitude; lon = $loc.Longitude }
    }
    Start-Sleep -Milliseconds 200
  }
  $watcher.Stop()
  throw 'device location unavailable'
}

function Try-WinRtLocation {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and -not $_.IsGenericMethod
  })[0].MakeGenericMethod([Windows.Devices.Geolocation.Geoposition])
  $locator = [Windows.Devices.Geolocation.Geolocator]::new()
  $locator.DesiredAccuracy = [Windows.Devices.Geolocation.PositionAccuracy]::High
  $task = $asTask.Invoke($null, @($locator.GetGeopositionAsync()))
  $null = $task.Wait(10000)
  if (-not $task.IsCompleted) { throw 'winrt timeout' }
  $pos = $task.Result
  return @{
    lat = $pos.Coordinate.Point.Position.Latitude
    lon = $pos.Coordinate.Point.Position.Longitude
  }
}

try {
  $coords = Try-DeviceLocation
} catch {
  $coords = Try-WinRtLocation
}

Write-Output "$($coords.lat),$($coords.lon)"
