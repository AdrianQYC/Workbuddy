!macro preInit
  ; Use a per-user install path on both registry views for future compatibility.
  SetRegView 64
  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "D:\SOFTWARE\Workbuddy"
  SetRegView 32
  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "D:\SOFTWARE\Workbuddy"
!macroend
