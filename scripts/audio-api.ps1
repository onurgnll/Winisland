param(
  [string]$Action = 'GetState',
  [string]$DeviceId = '',
  [int]$Value = 0,
  [string]$Bool = 'false'
)

$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Microsoft.Win32;

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int EnumAudioEndpoints(int dataFlow, int stateMask, [MarshalAs(UnmanagedType.IUnknown)] out object devices);
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[Guid("0BE33FA0-91F8-4AA4-BDE2-CCAE8DB1C1C1"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceCollection {
  int GetCount(out int pcDevices);
  int Item(int nDevice, out IMMDevice ppDevice);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
  int OpenPropertyStore(int stgmAccess, IntPtr store);
  int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
  int GetState(out int pdwState);
}

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
  int GetMute(out bool pbMute);
}

[ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")]
class PolicyConfigClient { }

[Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfig {
  [PreserveSig] int GetMixFormat();
  [PreserveSig] int GetDeviceFormat();
  [PreserveSig] int ResetDeviceFormat();
  [PreserveSig] int SetDeviceFormat();
  [PreserveSig] int GetProcessingPeriod();
  [PreserveSig] int SetProcessingPeriod();
  [PreserveSig] int GetShareMode();
  [PreserveSig] int SetShareMode();
  [PreserveSig] int GetPropertyValue();
  [PreserveSig] int SetPropertyValue();
  [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, [MarshalAs(UnmanagedType.U4)] uint role);
  [PreserveSig] int SetEndpointVisibility();
}

[Guid("294935ce-f637-4e7c-a410-8a22258101fd"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfigVista {
  [PreserveSig] int GetMixFormat();
  [PreserveSig] int GetDeviceFormat();
  [PreserveSig] int ResetDeviceFormat();
  [PreserveSig] int SetDeviceFormat();
  [PreserveSig] int GetProcessingPeriod();
  [PreserveSig] int SetProcessingPeriod();
  [PreserveSig] int GetShareMode();
  [PreserveSig] int SetShareMode();
  [PreserveSig] int GetPropertyValue();
  [PreserveSig] int SetPropertyValue();
  [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, [MarshalAs(UnmanagedType.U4)] uint role);
  [PreserveSig] int SetEndpointVisibility();
}

public static class AudioApi {
  static IMMDeviceEnumerator Enumerator() {
    return (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
  }

  static IAudioEndpointVolume DefaultVolume(int dataFlow) {
    IMMDevice dev;
    Marshal.ThrowExceptionForHR(Enumerator().GetDefaultAudioEndpoint(dataFlow, 1, out dev));
    Guid iid = typeof(IAudioEndpointVolume).GUID;
    object o;
    Marshal.ThrowExceptionForHR(dev.Activate(ref iid, 23, IntPtr.Zero, out o));
    return (IAudioEndpointVolume)o;
  }

  static string ReadNameFromRegistry(string subKey) {
    try {
      using (var key = Registry.LocalMachine.OpenSubKey(subKey + "\\Properties")) {
        if (key == null) return null;
        var raw = key.GetValue("{a45c254e-df1c-4efd-8020-67d146a850e0},2");
        if (raw is string) return (string)raw;
        var val = raw as byte[];
        if (val != null && val.Length >= 4) {
          return System.Text.Encoding.Unicode.GetString(val, 0, val.Length - 2);
        }
      }
    } catch { }
    return null;
  }

  public static List<Dictionary<string, object>> ListDevices(int dataFlow) {
    var list = new List<Dictionary<string, object>>();
    string root = dataFlow == 0
      ? @"SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render"
      : @"SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture";

    using (var devicesKey = Registry.LocalMachine.OpenSubKey(root)) {
      if (devicesKey == null) return list;
      foreach (var id in devicesKey.GetSubKeyNames()) {
        string stateKey = root + "\\" + id;
        using (var sk = Registry.LocalMachine.OpenSubKey(stateKey)) {
          if (sk != null) {
            var state = sk.GetValue("DeviceState");
            if (state is int) {
              int deviceState = (int)state;
              if (deviceState != 1) continue;
            }
          }
        }
        string name = ReadNameFromRegistry(stateKey);
        if (string.IsNullOrWhiteSpace(name)) name = id;
        string prefix = dataFlow == 0 ? "{0.0.0.00000000}." : "{0.0.1.00000000}.";
        string deviceId = prefix + id;
        list.Add(new Dictionary<string, object> { { "id", deviceId }, { "name", name } });
      }
    }
    return list;
  }

  public static string GetDefaultId(int dataFlow) {
    IMMDevice dev;
    Marshal.ThrowExceptionForHR(Enumerator().GetDefaultAudioEndpoint(dataFlow, 1, out dev));
    string id;
    Marshal.ThrowExceptionForHR(dev.GetId(out id));
    return id;
  }

  static void SetDefaultRole(IPolicyConfig policy, string deviceId, uint role) {
    Marshal.ThrowExceptionForHR(policy.SetDefaultEndpoint(deviceId, role));
  }

  static void SetDefaultRoleVista(IPolicyConfigVista policy, string deviceId, uint role) {
    Marshal.ThrowExceptionForHR(policy.SetDefaultEndpoint(deviceId, role));
  }

  public static void SetDefault(string deviceId) {
    object client = new PolicyConfigClient();
    var policy = client as IPolicyConfig;
    if (policy != null) {
      SetDefaultRole(policy, deviceId, 0);
      SetDefaultRole(policy, deviceId, 1);
      SetDefaultRole(policy, deviceId, 2);
      return;
    }
    var policyVista = client as IPolicyConfigVista;
    if (policyVista != null) {
      SetDefaultRoleVista(policyVista, deviceId, 0);
      SetDefaultRoleVista(policyVista, deviceId, 1);
      SetDefaultRoleVista(policyVista, deviceId, 2);
      return;
    }
    throw new InvalidOperationException("Ses cihazi degistirme API kullanilamiyor");
  }

  public static float GetVolume(int dataFlow) {
    float v;
    Marshal.ThrowExceptionForHR(DefaultVolume(dataFlow).GetMasterVolumeLevelScalar(out v));
    return v;
  }

  public static bool GetMute(int dataFlow) {
    bool m;
    Marshal.ThrowExceptionForHR(DefaultVolume(dataFlow).GetMute(out m));
    return m;
  }

  public static void SetVolume(int dataFlow, float scalar) {
    Marshal.ThrowExceptionForHR(DefaultVolume(dataFlow).SetMasterVolumeLevelScalar(scalar, Guid.Empty));
  }

  public static void SetMute(int dataFlow, bool mute) {
    Marshal.ThrowExceptionForHR(DefaultVolume(dataFlow).SetMute(mute, Guid.Empty));
  }
}
'@

function To-Bool([string]$s) {
  return $s -eq 'true' -or $s -eq '1'
}

switch ($Action) {
  'GetState' {
    $playbackDevices = [AudioApi]::ListDevices(0)
    $recordingDevices = [AudioApi]::ListDevices(1)
    $defaultPlayback = [AudioApi]::GetDefaultId(0)
    $defaultRecording = [AudioApi]::GetDefaultId(1)
    $playbackVol = [Math]::Round([AudioApi]::GetVolume(0) * 100)
    $recordingVol = [Math]::Round([AudioApi]::GetVolume(1) * 100)
    $playbackMute = [AudioApi]::GetMute(0)
    $recordingMute = [AudioApi]::GetMute(1)

    @{
      playback = @{
        volume     = $playbackVol
        muted      = $playbackMute
        defaultId  = $defaultPlayback
        devices    = $playbackDevices
      }
      recording = @{
        volume     = $recordingVol
        muted      = $recordingMute
        defaultId  = $defaultRecording
        devices    = $recordingDevices
      }
    } | ConvertTo-Json -Compress -Depth 6
  }
  'SetPlaybackVolume' {
    [AudioApi]::SetVolume(0, [Math]::Max(0, [Math]::Min(100, $Value)) / 100.0)
    @{ ok = $true } | ConvertTo-Json -Compress
  }
  'SetRecordingVolume' {
    [AudioApi]::SetVolume(1, [Math]::Max(0, [Math]::Min(100, $Value)) / 100.0)
    @{ ok = $true } | ConvertTo-Json -Compress
  }
  'SetPlaybackMute' {
    [AudioApi]::SetMute(0, (To-Bool $Bool))
    @{ ok = $true } | ConvertTo-Json -Compress
  }
  'SetRecordingMute' {
    [AudioApi]::SetMute(1, (To-Bool $Bool))
    @{ ok = $true } | ConvertTo-Json -Compress
  }
  'TogglePlaybackMute' {
    $m = [AudioApi]::GetMute(0)
    [AudioApi]::SetMute(0, -not $m)
    @{ ok = $true; muted = (-not $m) } | ConvertTo-Json -Compress
  }
  'ToggleRecordingMute' {
    $m = [AudioApi]::GetMute(1)
    [AudioApi]::SetMute(1, -not $m)
    @{ ok = $true; muted = (-not $m) } | ConvertTo-Json -Compress
  }
  'SetDefaultPlayback' {
    [AudioApi]::SetDefault($DeviceId)
    @{ ok = $true } | ConvertTo-Json -Compress
  }
  'SetDefaultRecording' {
    [AudioApi]::SetDefault($DeviceId)
    @{ ok = $true } | ConvertTo-Json -Compress
  }
  default {
    @{ error = 'unknown action' } | ConvertTo-Json -Compress
    exit 1
  }
}
