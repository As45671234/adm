#!/bin/bash
# VPS Deployment Script for ADM Mebel Astana
# Usage: ssh ubuntu@213.155.23.229, then paste and run this script

set -e

echo "=== ADM Mebel Deployment ==="

# 1. Update system
echo ">>> Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
echo ">>> Installing dependencies..."
sudo apt install -y curl git wget nginx

# 3. Install Node.js 22
echo ">>> Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Install PM2
echo ">>> Installing PM2..."
sudo npm install -g pm2
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 5. Clone repository
echo ">>> Cloning repository..."
cd /home/ubuntu
rm -rf adm 2>/dev/null || true
git clone https://github.com/As45671234/adm.git
cd adm

# 6. Create .env files
echo ">>> Creating environment files..."
cat > backend/.env << 'EOF'
PORT=3001
DATABASE_URL="file:./prisma/dev.db"

ADMIN_PASSWORD=admin1234
JWT_SECRET=change_me_to_strong_random_secret

MAIL_TO=your_email@gmail.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="ADM Mebel <your_email@gmail.com>"
MAIL_REPLY_TO=your_email@gmail.com
EOF

cat > frontend/.env << 'EOF'
VITE_WHATSAPP_PHONE=77074064499
VITE_INSTAGRAM_URL=https://www.instagram.com/adm_mebel_astana/
EOF

echo "⚠️  EDIT backend/.env with strong ADMIN_PASSWORD and JWT_SECRET!"
echo "⚠️  Also set SMTP credentials if you need email!"

# 7. Backend setup
echo ">>> Setting up backend..."
cd /home/ubuntu/adm/backend
npm ci
npm run prisma:generate
npm run db:push

# 8. Start backend with PM2
echo ">>> Starting backend with PM2..."
pm2 start ecosystem.config.js
pm2 save

# 9. Frontend build
echo ">>> Building frontend..."
cd /home/ubuntu/adm/frontend
npm ci
npm run build

# 10. Setup Nginx
echo ">>> Configuring Nginx..."
sudo cp /home/ubuntu/adm/nginx.conf.example /etc/nginx/sites-available/adm
sudo ln -sf /etc/nginx/sites-available/adm /etc/nginx/sites-enabled/adm
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 11. Setup SSL (optional, using certbot)
echo ">>> To setup SSL, run: sudo certbot --nginx -d your-domain.kz"

# 12. Health check
echo ">>> Health check..."
sleep 2
curl -s http://localhost:3001/health | jq . || echo "Backend health check skipped"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. SSH into VPS: ssh ubuntu@213.155.23.229"
echo "2. Edit backend/.env with strong credentials"
echo "3. Setup SSL: sudo certbot --nginx"
echo "4. View logs: pm2 logs adm-backend"
echo "5. Access site: http://223.155.23.229"
