Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
powerShellPath = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
command = """" & powerShellPath & """ -NoProfile -ExecutionPolicy Bypass -File """ & scriptDir & "\start-workbuddy.ps1"""
shell.Run command, 0, False
