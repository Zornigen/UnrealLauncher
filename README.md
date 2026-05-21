# UnrealLauncher

Autonomous CEF-ready launcher shell for **UnreaL LastChaoS**.

The UI can still be loaded as local files:

```text
UnrealLauncher/index.html
```

For the native desktop window, build and run the WebView2 shell:

```powershell
dotnet build -c Debug
.\bin\Debug\net8.0-windows\UnrealLauncher.exe
```

In `Debug`, the native shell loads `index.html`, `styles.css`, `app.js`, and `assets/` from the repository root. After rebuilding the native shell once, UI/style changes only need a launcher restart or WebView refresh, not another `dotnet build`.

## Structure

- `index.html` - static launcher markup.
- `styles.css` - cinematic launcher UI based on the UnrealSite visual direction.
- `app.js` - UI state controller and temporary native bridge fallback.
- `UnrealLauncher.csproj` - WinForms + WebView2 native shell.
- `Native/` - Windows host window and WebView2 bridge.
- `assets/` - local fonts and images copied from `UnrealSite` until CDN/deploy is split out.

## CEF Bridge

When the native host is ready, expose `window.UnrealLauncher` before the page script runs:

```js
window.UnrealLauncher = {
  play(channel) {},
  verify(channel) {},
  login() {},
  openExternal(url) {},
  minimize() {},
  close() {}
};
```

The WebView2 host injects this bridge automatically. The browser fallback logs actions to the console and opens external links normally.
