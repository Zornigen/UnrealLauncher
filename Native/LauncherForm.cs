using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace UnrealLauncher;

public sealed class LauncherForm : Form
{
    private const string VirtualHost = "launcher.local";
    private const int WmNchittest = 0x0084;
    private const int WmNclbuttondown = 0x00A1;
    private const int Htclient = 1;
    private const int Htcaption = 2;
    private const int DragHeight = 84;
    private readonly WebView2 webView = new();

    public LauncherForm()
    {
        Text = "UnreaL LastChaoS Launcher";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(1100, 720);
        Size = new Size(1280, 800);
        BackColor = Color.FromArgb(5, 7, 10);
        FormBorderStyle = FormBorderStyle.None;

        webView.Dock = DockStyle.Fill;
        webView.DefaultBackgroundColor = Color.FromArgb(5, 7, 10);
        Controls.Add(webView);

        Load += async (_, _) => await InitializeWebViewAsync();
    }

    private async Task InitializeWebViewAsync()
    {
        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "UnrealLauncher",
            "WebView2");

        var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
        await webView.EnsureCoreWebView2Async(environment);

        var webRoot = AppContext.BaseDirectory;
        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            VirtualHost,
            webRoot,
            CoreWebView2HostResourceAccessKind.Allow);

        webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
        webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
        await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(CreateBridgeScript());
        webView.CoreWebView2.Navigate($"https://{VirtualHost}/index.html");
    }

    protected override void WndProc(ref Message m)
    {
        base.WndProc(ref m);

        if (m.Msg != WmNchittest || (int)m.Result != Htclient)
        {
            return;
        }

        var point = PointToClient(GetPointFromLParam(m.LParam));
        if (point.Y < DragHeight && point.X < Width - 260)
        {
            m.Result = Htcaption;
        }
    }

    private static Point GetPointFromLParam(IntPtr lParam)
    {
        var value = lParam.ToInt64();
        var x = unchecked((short)(value & 0xffff));
        var y = unchecked((short)((value >> 16) & 0xffff));
        return new Point(x, y);
    }

    private static string CreateBridgeScript()
    {
        return """
            window.UnrealLauncher = {
              play: function(channel) {
                chrome.webview.postMessage({ action: "play", channel: channel });
              },
              verify: function(channel) {
                chrome.webview.postMessage({ action: "verify", channel: channel });
              },
              login: function() {
                chrome.webview.postMessage({ action: "login" });
              },
              openExternal: function(url) {
                chrome.webview.postMessage({ action: "openExternal", url: url });
              },
              minimize: function() {
                chrome.webview.postMessage({ action: "minimize" });
              },
              close: function() {
                chrome.webview.postMessage({ action: "close" });
              },
              beginDrag: function() {
                chrome.webview.postMessage({ action: "beginDrag" });
              }
            };
            """;
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        using var message = JsonDocument.Parse(args.WebMessageAsJson);
        var root = message.RootElement;

        if (!root.TryGetProperty("action", out var actionElement))
        {
            return;
        }

        var action = actionElement.GetString();

        switch (action)
        {
            case "minimize":
                WindowState = FormWindowState.Minimized;
                break;
            case "close":
                Close();
                break;
            case "beginDrag":
                BeginDragMove();
                break;
            case "openExternal":
                OpenExternal(root);
                break;
            case "play":
            case "verify":
            case "login":
                Debug.WriteLine($"Launcher action: {args.WebMessageAsJson}");
                break;
        }
    }

    private static void OpenExternal(JsonElement root)
    {
        if (!root.TryGetProperty("url", out var urlElement))
        {
            return;
        }

        var url = urlElement.GetString();
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = uri.ToString(),
            UseShellExecute = true
        });
    }

    private void BeginDragMove()
    {
        ReleaseCapture();
        SendMessage(Handle, WmNclbuttondown, Htcaption, 0);
    }

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);
}
