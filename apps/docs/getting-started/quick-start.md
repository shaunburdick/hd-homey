# Quick Start

Get HD Homey up and running in minutes with this streamlined guide.

## What You'll Accomplish

By the end of this guide, you will:

1. Install and start HD Homey
2. Create your administrator account
3. Sign in and access the dashboard
4. Understand the main navigation

**Time required**: 5-10 minutes

## Step 1: Install HD Homey

Follow the installation method that best suits your environment:

::: code-group

```bash [Docker Compose]
# Download configuration files
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/compose.yml
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/.env-example

# Configure environment
cp .env-example .env
sed -i "s/some-random-string/$(openssl rand -base64 32)/" .env

# Start HD Homey
docker compose up -d

# View logs
docker compose logs -f
```

```bash [Docker Run]
docker run -d \
  --name hd-homey \
  -p 3000:3000 \
  -v hd-homey-data:/app/data \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  ghcr.io/shaunburdick/hd-homey:latest
```

```bash [From Source]
# Clone repository
git clone https://github.com/shaunburdick/hd-homey.git
cd hd-homey

# Install and configure
npm ci
cp .env-example .env
# Edit .env and set AUTH_SECRET

# Start development server
npm run dev
```

:::

For detailed installation instructions, see the [Installation Guide](/getting-started/installation).

## Step 2: Create Your Admin Account

1. **Open your browser** and navigate to `http://localhost:3000`

2. **Automatic redirect**: Since this is your first visit, you'll be redirected to the account creation page at `/get-started`

3. **Create admin account**:
   - **Username**: Choose a memorable username (3-50 characters)
   - **Password**: Create a strong password (8+ characters)
   - Click **"Create Administrator Account"**

::: tip First User Advantage
The first account created is automatically assigned the **Administrator** role with full access to all features. Additional users can be created later with either Admin or Viewer permissions.
:::

4. **Automatic sign-in**: After creating your account, you'll be signed in automatically and redirected to the home page

## Step 3: Explore the Dashboard

Once signed in, you'll see the HD Homey home page with the main navigation menu.

### Main Navigation

| Page | Description | Access Level |
|------|-------------|--------------|
| **Home** | Browse all available channels from configured tuners | All users |
| **Tuners** | View and manage HDHomeRun devices | All users (Admin to add/edit) |
| **Channels** | View detailed channel information | All users |
| **Users** | Manage user accounts and permissions | Admin only |
| **Settings** | Configure stream security and application settings | Admin only |
| **About** | Version information and system details | All users |
| **Profile** | Change your password | All users |

### User Indicator

The navigation bar displays your username and role in the top-right corner:
- **Admin** users see: `username (admin)`
- **Viewer** users see: `username (viewer)`

## Step 4: Configure Remote Access (Optional)

If you plan to access HD Homey from outside your local network:

### Option 1: Use Auto-Detection (Recommended)

HD Homey automatically detects your external URL from incoming requests. For most setups, **no configuration is needed**!

**Requirements for auto-detection**:
- Simple reverse proxy that forwards headers correctly
- Set `AUTH_TRUST_HOST=true` if behind a reverse proxy
- Access HD Homey through a consistent URL (same domain)

### Option 2: Set Explicit External URL

Only needed if auto-detection doesn't work or you have complex proxy routing:

1. **Determine your external URL**: This could be a domain name or public IP address
   - Example: `https://tuner.example.com` or `https://203.0.113.42:3000`

2. **Update environment variables**:

   ::: code-group

   ```bash [Docker Compose]
   # Edit your .env file
   nano .env
   
   # Add or update:
   HD_HOMEY_PROXY_HOST=https://tuner.example.com
   AUTH_TRUST_HOST=true  # If behind reverse proxy
   
   # Restart container
   docker compose restart
   ```

   ```bash [Docker Run]
   # Stop container
   docker stop hd-homey
   docker rm hd-homey
   
   # Start with HD_HOMEY_PROXY_HOST
   docker run -d \
     --name hd-homey \
     -p 3000:3000 \
     -v hd-homey-data:/app/data \
     -e AUTH_SECRET=your-existing-secret \
     -e HD_HOMEY_PROXY_HOST=https://tuner.example.com \
     -e AUTH_TRUST_HOST=true \
     ghcr.io/shaunburdick/hd-homey:latest
   ```

   ```bash [From Source]
   # Edit .env file
   nano .env
   
   # Add or update:
   HD_HOMEY_PROXY_HOST=https://tuner.example.com
   AUTH_TRUST_HOST=true  # If behind reverse proxy
   
   # Restart dev server
   npm run dev
   ```

   :::

3. **Configure network access**:
   - Set up port forwarding on your router (external port → internal 3000)
   - Configure firewall rules to allow inbound traffic
   - Consider using a reverse proxy (nginx, Caddy) for HTTPS

::: tip Auto-Detection vs Explicit URL
**Try auto-detection first** by leaving `HD_HOMEY_PROXY_HOST` blank. Only set it explicitly if:
- Stream URLs contain internal IPs instead of your domain
- You have multiple access points (different domains/IPs)
- Complex proxy configuration with non-standard routing
:::

::: warning Security Consideration
If exposing HD Homey to the internet:
- Use strong passwords for all accounts
- Keep HD Homey updated to the latest version
- Consider implementing additional security measures (VPN, firewall rules, rate limiting)
- Use HTTPS with a valid SSL certificate via reverse proxy
:::

## What's Next?

Now that HD Homey is running and you're signed in, you're ready to start streaming!

### Next Steps

1. **[Add Your First Tuner](/getting-started/first-stream)** - Connect an HDHomeRun device and start watching live TV
2. **[Environment Variables](/config/environment-variables)** - Learn about advanced configuration options
3. **[User Management](/features/user-management)** - Create additional accounts for family members or viewers

### Common Tasks

- **Add more users**: Navigate to **Users** → **Add User**
- **Change your password**: Navigate to **Profile** → Enter new password
- **View application version**: Navigate to **About**
- **Sign out**: Click your username in the top-right → **Sign Out**

## Troubleshooting

### Can't Access at localhost:3000

**Check if HD Homey is running:**
```bash
# Docker Compose
docker compose ps

# Docker Run
docker ps | grep hd-homey
```

**View logs for errors:**
```bash
# Docker Compose
docker compose logs hd-homey

# Docker Run
docker logs hd-homey
```

**Common causes:**
- Port 3000 already in use (change port mapping to `-p 3001:3000`)
- Container failed to start (check logs for error messages)
- Firewall blocking connections

### Authentication Not Working

- Verify `AUTH_SECRET` is set in your environment variables
- Clear browser cookies and cache
- Ensure cookies are enabled in your browser
- Check browser console (F12 → Console) for errors

### More Help

For additional troubleshooting assistance, see:
- [Troubleshooting Guide](/troubleshooting/)
- [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues)
- [GitHub Discussions](https://github.com/shaunburdick/hd-homey/discussions)
