param([string]$Action = 'GetDevices')

$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$ErrorActionPreference = 'SilentlyContinue'
$BATTERY_KEY = '{104EA319-6EE2-4701-BD47-8DDBF425BBE5}, 2'

function Get-BtDevices {
  $list = @()

  $skipPattern = 'Enumerator|Numaraland|Avrcp Transport|RFCOMM|TDI|Wireless Bluetooth'

  Get-PnpDevice -Class Bluetooth -Status OK -ErrorAction SilentlyContinue | ForEach-Object {
    $name = $_.FriendlyName
    if (-not $name -or $name -match $skipPattern) { return }
    if ($list.name -contains $name) { return }

    $battery = $null
    $batteryProp = Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName $BATTERY_KEY -ErrorAction SilentlyContinue |
      Where-Object { $_.Type -ne 'Empty' -and $null -ne $_.Data } |
      Select-Object -First 1
    if ($batteryProp) {
      $battery = [int]$batteryProp.Data
      if ($battery -lt 0 -or $battery -gt 100) { $battery = $null }
    }

    $list += [PSCustomObject]@{
      name    = $name
      battery = $battery
      status  = $_.Status
      class   = $_.Class
    }
  }

  foreach ($item in @($list)) {
    if ($null -ne $item.battery) { continue }
    $shortName = ($item.name -split ' ')[0]
    if (-not $shortName -or $shortName.Length -lt 3) { continue }
    Get-PnpDevice -FriendlyName "*$shortName*" -Status OK -ErrorAction SilentlyContinue | ForEach-Object {
      if ($_.Class -eq 'Bluetooth') { return }
      $batteryProp = Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName $BATTERY_KEY -ErrorAction SilentlyContinue |
        Where-Object { $_.Type -ne 'Empty' -and $null -ne $_.Data } |
        Select-Object -First 1
      if ($batteryProp) {
        $bat = [int]$batteryProp.Data
        if ($bat -ge 0 -and $bat -le 100) { $item.battery = $bat }
      }
    }
  }

  @($list | Sort-Object { if ($null -eq $_.battery) { 1 } else { 0 } }, name)
}

if ($Action -eq 'GetDevices') {
  $devices = @(Get-BtDevices) | ForEach-Object {
    @{
      name    = $_.name
      battery = $_.battery
      status  = $_.status
      class   = $_.class
    }
  }
  $json = '{"devices":' + (ConvertTo-Json -InputObject @($devices) -Compress) + '}'
  Write-Output $json
}
