#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

# Check if PostgreSQL credentials are set
if [ -z "$PGUSER" ] || [ -z "$PGPASSWORD" ] || [ -z "$PGDATABASE" ] || [ -z "$PGHOST" ] || [ -z "$PGPORT" ]; then
  echo "Error: PostgreSQL credentials not set in .env file"
  exit 1
fi

# Connect to PostgreSQL
echo "Connecting to PostgreSQL database..."
echo "Host: $PGHOST"
echo "Database: $PGDATABASE"
echo "User: $PGUSER"
echo "Port: $PGPORT"

# Test connection
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -p $PGPORT -c "SELECT 'Connection successful!' as status;"

if [ $? -eq 0 ]; then
  echo "PostgreSQL connection successful!"
else
  echo "Error: Failed to connect to PostgreSQL"
  exit 1
fi

# Run the setup-database.sql script if it exists
if [ -f setup-database.sql ]; then
  echo "Running setup-database.sql script..."
  PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -p $PGPORT -f setup-database.sql
  
  if [ $? -eq 0 ]; then
    echo "Database setup completed successfully!"
  else
    echo "Error: Failed to run setup-database.sql script"
    exit 1
  fi
else
  echo "Warning: setup-database.sql file not found"
fi

echo "PostgreSQL connection script completed"
