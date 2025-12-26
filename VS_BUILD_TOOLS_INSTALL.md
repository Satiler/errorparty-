# Установка Visual Studio Build Tools

## Быстрая установка (Command Line)

```powershell
# Скачать установщик
Invoke-WebRequest -Uri "https://aka.ms/vs/17/release/vs_BuildTools.exe" -OutFile "vs_BuildTools.exe"

# Установка с минимальными компонентами для Rust
.\vs_BuildTools.exe --quiet --wait --norestart --nocache `
  --installPath "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools" `
  --add Microsoft.VisualStudio.Workload.VCTools `
  --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
  --add Microsoft.VisualStudio.Component.Windows11SDK.22000
```

## Установка через GUI

1. **Скачать:** https://aka.ms/vs/17/release/vs_BuildTools.exe
2. **Запустить установщик**
3. **Выбрать:** "Desktop development with C++"
4. **Установить** (~3 ГБ)
5. **Перезагрузить** компьютер

## Проверка установки

```powershell
# Должна вывести версию link.exe
& "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\*\bin\Hostx64\x64\link.exe" /?
```

## Альтернатива: Visual Studio Community

Если нужна полноценная IDE:
- Скачать: https://visualstudio.microsoft.com/downloads/
- При установке выбрать "Desktop development with C++"
