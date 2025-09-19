# Deployment Guide: Hosting Cartevo API Sandbox

This guide provides step-by-step instructions for deploying the Cartevo API sandbox project to a production server with PM2 and Nginx reverse proxy, accessible at https://apisandbox.cartevo.co.

## Prerequisites

- Server access via SSH (`ssh admin@wavlet`)
- Project located at `/home/apps/cartevo-api-sandbox`
- Domain `apisandbox.cartevo.co` configured to point to server IP
- Node.js and npm installed on server
- PM2 installed globally (`npm install -g pm2`)
- Git repository set up on server

## Deployment Steps

### 1. Connect to Server

```bash
ssh admin@wavlet
```

### 2. Navigate to Project Directory

```bash
cd /home/apps/cartevo-api-sandbox
```

### 3. Pull Latest Code Changes

```bash
git pull origin main
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Optional: Seed database
npx prisma db seed
```

### 6. Build Application

```bash
npm run build
```

### 7. Create Logs Directory

```bash
mkdir -p logs
```

### 8. Configure PM2

The PM2 ecosystem file is already created (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: "cartevo-api-sandbox",
      script: "dist/src/main.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
```

### 9. Install and Configure Nginx

#### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

#### Install Certbot for SSL

```bash
sudo apt install certbot python3-certbot-nginx
```

#### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/apisandbox.cartevo.co
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name apisandbox.cartevo.co;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/apisandbox.cartevo.co /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 10. Obtain SSL Certificate

```bash
sudo certbot --nginx -d apisandbox.cartevo.co
```

Follow the prompts to configure SSL certificate.

### 11. Set Up Automatic Certificate Renewal

```bash
sudo crontab -e
```

Add this line to the crontab:

```bash
0 12 * * * /usr/bin/certbot renew --quiet
```

### 12. Start Application with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 13. Domain Configuration

Ensure your domain `apisandbox.cartevo.co` points to your server's IP address:

- Go to your domain registrar
- Add A record: `apisandbox` → `[YOUR_SERVER_IP]`

## Verification Steps

### Check PM2 Status

```bash
pm2 status
pm2 logs cartevo-api-sandbox
```

### Test Application

```bash
curl https://apisandbox.cartevo.co
curl https://apisandbox.cartevo.co/health  # If you have a health endpoint
```

### Check Nginx Status

```bash
sudo systemctl status nginx
```

## Management Commands

### PM2 Commands

```bash
# Restart application
pm2 restart cartevo-api-sandbox

# Stop application
pm2 stop cartevo-api-sandbox

# View logs
pm2 logs cartevo-api-sandbox

# Monitor resources
pm2 monit

# Delete application
pm2 delete cartevo-api-sandbox
```

### Nginx Commands

```bash
# Reload configuration
sudo nginx -s reload

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Environment Configuration

Ensure your `.env` file contains production-appropriate values:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://username:password@localhost:5432/cartevo_sandbox"
JWT_SECRET="your-production-jwt-secret"
# Add other production environment variables
```

## Security Considerations

1. **Firewall**: Ensure only necessary ports (22, 80, 443) are open
2. **Fail2Ban**: Consider installing fail2ban for SSH protection
3. **Updates**: Keep server packages updated
4. **SSL**: Certificate auto-renewal is configured
5. **Environment Variables**: Never commit secrets to version control

## Troubleshooting

### Common Issues

1. **Port 80/443 blocked**: Check firewall settings
2. **SSL certificate issues**: Run `sudo certbot certificates` to check
3. **Application not starting**: Check PM2 logs with `pm2 logs`
4. **Database connection**: Verify DATABASE_URL in .env
5. **Domain not resolving**: Check DNS propagation (may take up to 24 hours)

### Logs Locations

- Application logs: `./logs/` directory
- Nginx logs: `/var/log/nginx/`
- PM2 logs: `~/.pm2/logs/`

## Monitoring

Consider setting up monitoring for:

- Application health checks
- Server resources (CPU, memory, disk)
- SSL certificate expiration
- Error rates and response times

## Backup Strategy

1. **Database backups**: Set up automated PostgreSQL backups
2. **Application backups**: Backup configuration files
3. **SSL certificates**: Certbot handles this automatically

## Support

For issues with this deployment:

1. Check logs in the locations mentioned above
2. Verify all steps were completed successfully
3. Ensure environment variables are correct
4. Check network connectivity and firewall rules
