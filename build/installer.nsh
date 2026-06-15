!macro customFinishPage
  Function StartApp
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  Function WinislandEnableStartup
    WriteRegDWORD HKCU "Software\winisland\winisland" "launchAtStartup" 1
  FunctionEnd

  !ifndef HIDE_RUN_AFTER_FINISH
    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  !endif
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Windows açılışında Winisland'i başlat"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION WinislandEnableStartup
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Winisland"
  DeleteRegKey /ifempty HKCU "Software\winisland\winisland"
!macroend
