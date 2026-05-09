Deployment Plan
================
Here's a deployment plan for your YunoHost/Debian/Nginx setup:

## Deployment Strategy

Since YunoHost manages Nginx configs, the cleanest approach is to run the Node.js backend as a systemd service and serve the Vite-built static files through Nginx, with Nginx proxying `/api` requests to the Express server.

---

## Step-by-step

### 1. Build the client for production

```bash
cd client && npx vite build
```

This outputs static files to `client/dist/`.

### 2. Prepare the server for production

Install a process runner. On the server:

```bash
cd server && npm install
npm run seed   # populate the database
```

### 3. Upload to your server

Copy the project to your Debian server (e.g., `/opt/chat-agentes/`):

```bash
rsync -avz --exclude node_modules --exclude .git . user@yourserver:/opt/chat-agentes/
```

Then on the server:

```bash
cd /opt/chat-agentes/server && npm install --production
cd /opt/chat-agentes/client && npm install && npx vite build
cd /opt/chat-agentes/server && npx ts-node src/seed.ts
```

### 4. Create a systemd service

Create `/etc/systemd/system/chat-agentes.service`:

```ini
[Unit]
Description=Chat Asignacion Agentes API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/chat-agentes/server
ExecStart=/usr/bin/npx ts-node src/index.ts
Environment=NODE_ENV=production
Environment=PORT=3001
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable chat-agentes
sudo systemctl start chat-agentes
```

### 5. Configure Nginx

Since YunoHost manages Nginx, you'll want to add a custom config. Create `/etc/nginx/conf.d/yourdomain.tld.d/chat-agentes.conf`:

```nginx
location /chat-agentes/ {
    alias /opt/chat-agentes/client/dist/;
    try_files $uri $uri/ /chat-agentes/index.html;
}

location /chat-agentes/api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

If you prefer it at the root of a subdomain instead, create a dedicated domain in YunoHost and use:

```nginx
location / {
    root /opt/chat-agentes/client/dist;
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 6. Adjust Vite base path (if using a subpath)

If you're serving under `/chat-agentes/`, update `client/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/chat-agentes/',
  // ...
});
```

Then rebuild: `cd client && npx vite build`

Also update the API calls in `client/src/api.ts` to use the correct prefix, or keep them as `/api/...` since Nginx will handle the rewrite.

---

## Key considerations

- **ts-node in production** — For better performance, consider compiling the server to JS first (`npx tsc`) and running `node dist/index.js` instead. This avoids the TypeScript compilation overhead at runtime.
- **Database path** — The SQLite file defaults to `server/data.db`. Make sure the `www-data` user has write permissions to that directory.
- **YunoHost firewall** — Port 3001 only needs to be accessible from localhost (Nginx proxies to it), so no firewall changes needed.
- **HTTPS** — YunoHost handles Let's Encrypt certificates automatically for your domain.

Want me to create a production build script or adjust the server to compile to plain JS for better runtime performance?