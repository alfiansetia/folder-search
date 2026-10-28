; FolderScope 2.0 — skrip installer Inno Setup (Windows 64-bit).
; Cara pakai: install Inno Setup 6, lalu jalankan scripts/build-installer.ps1
; atau: iscc installer.iss
; Hasil: dist\FolderScope-Setup-2.0.1.exe

#define MyAppName "FolderScope"
#define MyAppVersion "2.0.1"
#define MyAppExe "folderscope.exe"

[Setup]
AppId={{F7EC3B22-B37A-4EE9-9BB3-C7A9B0E9312D}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\{#MyAppExe}
OutputDir=dist
OutputBaseFilename=FolderScope-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
PrivilegesRequired=lowest
WizardStyle=modern
UninstallDisplayName={#MyAppName} {#MyAppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Buat ikon di Desktop"; Flags: unchecked

[Files]
Source: "target\release\{#MyAppExe}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExe}"; Description: "Jalankan FolderScope"; Flags: nowait postinstall skipifsilent
