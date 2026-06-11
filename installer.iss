; 单词记忆 (Word Memory) — Inno Setup 安装脚本

#define MyAppName "单词记忆"
#define MyAppVersion "1.0.0"
#define MyAppExeName "electron.exe"

[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/max
SolidCompression=yes
OutputDir=.\installer
OutputBaseFilename=单词记忆_Setup_v{#MyAppVersion}
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
DisableDirPage=auto
MinVersion=10.0.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "release\\word-memory\\electron.exe"; DestDir: "{app}"
Source: "release\\word-memory\\*.dll"; DestDir: "{app}"
Source: "release\\word-memory\\*.bin"; DestDir: "{app}"
Source: "release\\word-memory\\*.pak"; DestDir: "{app}"
Source: "release\\word-memory\\version"; DestDir: "{app}"
Source: "release\\word-memory\\favicon.svg"; DestDir: "{app}"
Source: "release\\word-memory\\locales\\*"; DestDir: "{app}\\locales"; Flags: recursesubdirs createallsubdirs
Source: "release\\word-memory\\resources\\*"; DestDir: "{app}\\resources"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\\单词记忆"; Filename: "{app}\\electron.exe"; WorkingDir: "{app}"
Name: "{commondesktop}\\单词记忆"; Filename: "{app}\\electron.exe"; WorkingDir: "{app}"
Name: "{group}\\Uninstall 单词记忆"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\\electron.exe"; Description: "Launch 单词记忆"; Flags: postinstall nowait skipifsilent; WorkingDir: "{app}"
