using System.Text;
using Serilog.Sinks.InMemory;

namespace Pos.Api.Middleware;

public class SerilogAuthMiddleware
{
    private readonly RequestDelegate _next;

    public SerilogAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? string.Empty;

        if (path.StartsWith("/serilog-ui") || path == "/serilog-ui/stream")
        {
            string authHeader = context.Request.Headers["Authorization"].ToString();

            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var token = authHeader.Substring("Basic ".Length).Trim();
                    var credentials = Encoding.UTF8.GetString(Convert.FromBase64String(token)).Split(':', 2);

                    if (credentials.Length == 2 && credentials[0] == "administrador" && credentials[1] == "Aaron096")
                    {
                        if (path == "/serilog-ui/stream")
                        {
                            await ServeLogStreamAsync(context);
                            return;
                        }

                        await ServeDashboardHtmlAsync(context);
                        return;
                    }
                }
                catch
                {
                    // Fallthrough to 401
                }
            }

            context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Interfaz de Logs Serilog WPC Bajio\"";
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("🔐 Acceso Denegado: Autenticación requerida para la Interfaz de Logs de Serilog.\nUsuario: administrador");
            return;
        }

        await _next(context);
    }

    private static async Task ServeLogStreamAsync(HttpContext context)
    {
        context.Response.ContentType = "application/json";
        var logsList = new List<object>();

        // 1. Read InMemory Sink events
        try
        {
            var inMemoryEvents = InMemorySink.Instance.LogEvents
                .OrderByDescending(e => e.Timestamp)
                .Take(200)
                .Select(e => new
                {
                    timestamp = e.Timestamp.ToString("yyyy-MM-dd HH:mm:ss.fff zzz"),
                    level = e.Level.ToString(),
                    message = e.RenderMessage(),
                    exception = e.Exception?.ToString()
                });
            logsList.AddRange(inMemoryEvents);
        }
        catch { }

        // 2. Read physical Serilog log files if inMemory is small
        if (logsList.Count < 50)
        {
            try
            {
                var logDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
                if (!Directory.Exists(logDir))
                {
                    logDir = Path.Combine(Directory.GetCurrentDirectory(), "logs");
                }

                if (Directory.Exists(logDir))
                {
                    var latestFile = new DirectoryInfo(logDir)
                        .GetFiles("auditoria-*.log")
                        .OrderByDescending(f => f.LastWriteTimeUtc)
                        .FirstOrDefault();

                    if (latestFile != null)
                    {
                        using var stream = new FileStream(latestFile.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                        using var reader = new StreamReader(stream, Encoding.UTF8);
                        var lines = new List<string>();
                        string? line;
                        while ((line = await reader.ReadLineAsync()) != null)
                        {
                            if (!string.IsNullOrWhiteSpace(line))
                            {
                                lines.Add(line);
                            }
                        }

                        var fileLogs = lines.TakeLast(200).Reverse().Select(l =>
                        {
                            string level = "Information";
                            if (l.Contains("[WRN]")) level = "Warning";
                            else if (l.Contains("[ERR]") || l.Contains("[FTL]")) level = "Error";

                            return new
                            {
                                timestamp = l.Length >= 33 ? l.Substring(0, 33) : DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                                level,
                                message = l,
                                exception = (string?)null
                            };
                        });

                        logsList.AddRange(fileLogs);
                    }
                }
            }
            catch { }
        }

        await context.Response.WriteAsJsonAsync(logsList.Take(300));
    }

    private static async Task ServeDashboardHtmlAsync(HttpContext context)
    {
        context.Response.ContentType = "text/html; charset=utf-8";
        var html = @"<!DOCTYPE html>
<html lang=""es"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>📜 Dashboard Serilog en Tiempo Real — WPC Bajío</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-color: #f8fafc;
            --border-color: #334155;
            --accent: #38bdf8;
            --info: #38bdf8;
            --warn: #fbbf24;
            --error: #f87171;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 1.5rem;
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
        }
        h1 { margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
        .controls {
            display: flex;
            gap: 1rem;
            align-items: center;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }
        input, select, button {
            background-color: var(--card-bg);
            color: inherit;
            border: 1px solid var(--border-color);
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
        }
        button {
            background-color: #0284c7;
            border: none;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover { opacity: 0.9; }
        .log-container {
            background-color: #020617;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
            font-size: 0.85rem;
            max-height: 75vh;
            overflow-y: auto;
            padding: 1rem;
        }
        .log-entry {
            padding: 0.35rem 0.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            line-height: 1.4;
            word-break: break-all;
        }
        .level-Information { color: var(--info); }
        .level-Warning { color: var(--warn); font-weight: bold; }
        .level-Error, .level-Fatal { color: var(--error); font-weight: bold; background-color: rgba(248, 113, 113, 0.1); }
        .badge {
            display: inline-block;
            padding: 0.15rem 0.4rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            font-weight: bold;
            margin-right: 0.5rem;
        }
        .badge-Information { background: rgba(56, 189, 248, 0.2); color: var(--info); }
        .badge-Warning { background: rgba(251, 191, 36, 0.2); color: var(--warn); }
        .badge-Error { background: rgba(248, 113, 113, 0.2); color: var(--error); }
    </style>
</head>
<body>
    <header>
        <h1>📜 Dashboard Serilog WPC Bajío (Tiempo Real)</h1>
        <div>
            <span style=""color: #94a3b8; font-size: 0.875rem;"">Usuario: <strong>administrador</strong></span>
        </div>
    </header>

    <div class=""controls"">
        <input type=""text"" id=""searchInput"" placeholder=""🔍 Buscar por texto, CorrelationId, IP..."" style=""width: 320px;"" onkeyup=""filterLogs()"">
        <select id=""levelFilter"" onchange=""filterLogs()"">
            <option value="""">-- Todos los Niveles --</option>
            <option value=""Information"">Information</option>
            <option value=""Warning"">Warning</option>
            <option value=""Error"">Error</option>
        </select>
        <button onclick=""fetchLogs()"">🔄 Actualizar Ahora</button>
        <label style=""display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer;"">
            <input type=""checkbox"" id=""autoRefreshCheck"" checked onchange=""toggleAutoRefresh()""> Auto-Refresco (2s)
        </label>
        <span id=""statusText"" style=""color: #4ade80; font-size: 0.85rem;"">● Monitoreando en vivo</span>
    </div>

    <div class=""log-container"" id=""logContainer"">
        <div style=""color: #94a3b8; text-align: center; padding: 2rem;"">Cargando eventos de Serilog...</div>
    </div>

    <script>
        let rawLogs = [];
        let refreshInterval = null;

        async function fetchLogs() {
            try {
                const response = await fetch('/serilog-ui/stream');
                if (response.ok) {
                    rawLogs = await response.json();
                    renderLogs();
                } else if (response.status === 401) {
                    window.location.reload();
                }
            } catch (err) {
                document.getElementById('statusText').innerText = '⚠️ Error de conexión con Serilog';
                document.getElementById('statusText').style.color = '#f87171';
            }
        }

        function renderLogs() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const level = document.getElementById('levelFilter').value;
            const container = document.getElementById('logContainer');

            const filtered = rawLogs.filter(l => {
                const matchesSearch = !search || l.message.toLowerCase().includes(search) || l.timestamp.toLowerCase().includes(search);
                const matchesLevel = !level || l.level === level;
                return matchesSearch && matchesLevel;
            });

            if (filtered.length === 0) {
                container.innerHTML = '<div style=""color: #94a3b8; text-align: center; padding: 2rem;"">No se encontraron eventos de log para los filtros seleccionados.</div>';
                return;
            }

            container.innerHTML = filtered.map(l => `
                <div class=""log-entry level-${l.level}"">
                    <span style=""color: #64748b;"">[${l.timestamp}]</span>
                    <span class=""badge badge-${l.level}"">${l.level.toUpperCase()}</span>
                    <span>${escapeHtml(l.message)}</span>
                    ${l.exception ? `<pre style=""color: #f87171; margin-top: 0.25rem; font-size: 0.8rem;"">${escapeHtml(l.exception)}</pre>` : ''}
                </div>
            `).join('');
        }

        function filterLogs() {
            renderLogs();
        }

        function toggleAutoRefresh() {
            const check = document.getElementById('autoRefreshCheck');
            if (check.checked) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        }

        function startAutoRefresh() {
            if (!refreshInterval) {
                refreshInterval = setInterval(fetchLogs, 2000);
                document.getElementById('statusText').innerText = '● Monitoreando en vivo';
                document.getElementById('statusText').style.color = '#4ade80';
            }
        }

        function stopAutoRefresh() {
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
                document.getElementById('statusText').innerText = '○ Pausado';
                document.getElementById('statusText').style.color = '#94a3b8';
            }
        }

        function escapeHtml(str) {
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/""/g, '&quot;');
        }

        fetchLogs();
        startAutoRefresh();
    </script>
</body>
</html>";

        await context.Response.WriteAsync(html);
    }
}
