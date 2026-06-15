const { execFile } = require('child_process');

const VK = {
  PLAY_PAUSE: 0xb3,
  NEXT: 0xb0,
  PREV: 0xb1,
};

function sendMediaKey(vkCode) {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DynWinMediaKeys {
  [DllImport("user32.dll")]
  public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  public static void Press(byte vk) {
    keybd_event(vk, 0, 0, UIntPtr.Zero);
    keybd_event(vk, 0, 2, UIntPtr.Zero);
  }
}
"@
[DynWinMediaKeys]::Press(${vkCode})
`;

  return new Promise((resolve, reject) => {
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true },
      (err) => (err ? reject(err) : resolve()),
    );
  });
}

module.exports = {
  playPause: () => sendMediaKey(VK.PLAY_PAUSE),
  next: () => sendMediaKey(VK.NEXT),
  previous: () => sendMediaKey(VK.PREV),
};
