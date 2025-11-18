#!/bin/bash

# PgBouncer Setup Script
# This script helps set up PgBouncer connection pooling for the CRM application

set -e

echo "=================================================="
echo "PgBouncer Connection Pooling Setup"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ Please edit .env file with your actual database credentials${NC}"
    echo ""
fi

# Check if userlist.txt exists
if [ ! -f userlist.txt ]; then
    echo -e "${YELLOW}Creating userlist.txt from template...${NC}"
    cp userlist.txt.example userlist.txt
    chmod 600 userlist.txt
    echo -e "${GREEN}✓ Created userlist.txt${NC}"
    echo ""
fi

# Function to generate MD5 password hash for PgBouncer
generate_md5_password() {
    local password=$1
    local username=$2
    local hash=$(echo -n "${password}${username}" | md5sum | awk '{print $1}')
    echo "md5${hash}"
}

# Interactive setup
echo "Do you want to configure PgBouncer now? (y/n)"
read -r configure_now

if [ "$configure_now" = "y" ]; then
    echo ""
    echo "Please provide the following information:"
    echo ""

    # Get database credentials
    read -p "Supabase Host (e.g., db.xxx.supabase.co): " db_host
    read -p "Database Name [postgres]: " db_name
    db_name=${db_name:-postgres}
    read -p "Database User [postgres]: " db_user
    db_user=${db_user:-postgres}
    read -sp "Database Password: " db_password
    echo ""

    # Update .env file
    sed -i "s/SUPABASE_DB_HOST=.*/SUPABASE_DB_HOST=${db_host}/" .env
    sed -i "s/SUPABASE_DB_NAME=.*/SUPABASE_DB_NAME=${db_name}/" .env
    sed -i "s/SUPABASE_DB_USER=.*/SUPABASE_DB_USER=${db_user}/" .env
    sed -i "s/SUPABASE_DB_PASSWORD=.*/SUPABASE_DB_PASSWORD=${db_password}/" .env

    echo -e "${GREEN}✓ Updated .env file${NC}"

    # Ask if they want to generate userlist
    echo ""
    echo "Do you want to generate userlist.txt with MD5 password hashes? (y/n)"
    read -r generate_userlist

    if [ "$generate_userlist" = "y" ]; then
        md5_password=$(generate_md5_password "$db_password" "$db_user")
        echo "\"${db_user}\" \"${md5_password}\"" > userlist.txt
        chmod 600 userlist.txt
        echo -e "${GREEN}✓ Generated userlist.txt with MD5 password hash${NC}"
    fi
fi

echo ""
echo "=================================================="
echo "Setup Options"
echo "=================================================="
echo ""
echo "1. Start PgBouncer with Docker Compose"
echo "2. Build PgBouncer Docker image only"
echo "3. Test PgBouncer configuration"
echo "4. View PgBouncer logs"
echo "5. Show PgBouncer stats"
echo "6. Exit"
echo ""
read -p "Choose an option (1-6): " option

case $option in
    1)
        echo ""
        echo -e "${GREEN}Starting PgBouncer...${NC}"
        docker-compose up -d
        echo ""
        echo -e "${GREEN}✓ PgBouncer is running${NC}"
        echo ""
        echo "Connection details:"
        echo "  Host: localhost"
        echo "  Port: 6432"
        echo "  Database: ${db_name:-postgres}"
        echo ""
        echo "Update your application DATABASE_URL to:"
        echo "  postgresql://${db_user:-postgres}:PASSWORD@localhost:6432/${db_name:-postgres}"
        echo ""
        echo "To view stats, run: docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c 'SHOW STATS'"
        ;;
    2)
        echo ""
        echo -e "${GREEN}Building PgBouncer Docker image...${NC}"
        docker-compose build
        echo -e "${GREEN}✓ Build complete${NC}"
        ;;
    3)
        echo ""
        echo -e "${GREEN}Testing PgBouncer configuration...${NC}"
        docker run --rm -v "$(pwd)/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini:ro" \
            pgbouncer/pgbouncer:latest \
            /usr/bin/pgbouncer -v /etc/pgbouncer/pgbouncer.ini --test
        echo -e "${GREEN}✓ Configuration is valid${NC}"
        ;;
    4)
        echo ""
        echo -e "${GREEN}Viewing PgBouncer logs...${NC}"
        docker-compose logs -f pgbouncer
        ;;
    5)
        echo ""
        echo -e "${GREEN}PgBouncer Statistics:${NC}"
        docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "SHOW STATS"
        echo ""
        echo -e "${GREEN}Pool Information:${NC}"
        docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS"
        echo ""
        echo -e "${GREEN}Client Connections:${NC}"
        docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "SHOW CLIENTS"
        echo ""
        echo -e "${GREEN}Server Connections:${NC}"
        docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "SHOW SERVERS"
        ;;
    6)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "Additional Commands"
echo "=================================================="
echo ""
echo "View stats:    docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c 'SHOW STATS'"
echo "View pools:    docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c 'SHOW POOLS'"
echo "Reload config: docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c 'RELOAD'"
echo "Stop:          docker-compose down"
echo "Logs:          docker-compose logs -f pgbouncer"
echo ""
