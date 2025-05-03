#!/bin/bash

# Test script for PostgreSQL live updates

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
elif [ -f backend/.env ]; then
  export $(grep -v '^#' backend/.env | xargs)
else
  echo "No .env file found. Using default PostgreSQL credentials."
  export PGHOST=localhost
  export PGUSER=your_postgres_username
  export PGPASSWORD=your_postgres_password
  export PGDATABASE=booksl_train
  export PGPORT=5432
fi

# Function to generate a random delay between 0 and 30 minutes
random_delay() {
  echo $((RANDOM % 31))
}

# Function to randomly select true or false
random_boolean() {
  if [ $((RANDOM % 2)) -eq 0 ]; then
    echo "TRUE"
  else
    echo "FALSE"
  fi
}

# Function to update a random train journey
update_random_journey() {
  # Get a random journey_id
  journey_id=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -p $PGPORT -t -c "SELECT journey_id FROM train_journeys ORDER BY RANDOM() LIMIT 1;")
  journey_id=$(echo $journey_id | xargs) # Trim whitespace
  
  # Generate random values
  delay=$(random_boolean)
  reserved_seats=$((RANDOM % 50 + 50)) # Random number between 50 and 99
  
  # Update the journey
  echo "Updating journey_id: $journey_id with is_delayed=$delay and reserved_seats=$reserved_seats"
  PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -p $PGPORT -c "
    UPDATE train_journeys 
    SET is_delayed = $delay, reserved_seats = $reserved_seats 
    WHERE journey_id = $journey_id;
  "
  
  if [ $? -eq 0 ]; then
    echo "Journey updated successfully!"
  else
    echo "Error updating journey."
    exit 1
  fi
}

# Function to update a random train schedule
update_random_schedule() {
  # Get a random train_id
  train_id=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -p $PGPORT -t -c "SELECT train_id FROM train_schedules ORDER BY RANDOM() LIMIT 1;")
  train_id=$(echo $train_id | xargs) # Trim whitespace
  
  # Generate random delay minutes
  delay_minutes=$(random_delay)
  
  # Update the schedule
  echo "Updating train_id: $train_id with default_delay_minutes=$delay_minutes"
  PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -p $PGPORT -c "
    UPDATE train_schedules 
    SET default_delay_minutes = $delay_minutes 
    WHERE train_id = $train_id;
  "
  
  if [ $? -eq 0 ]; then
    echo "Schedule updated successfully!"
  else
    echo "Error updating schedule."
    exit 1
  fi
}

# Main script
echo "Testing live updates for the BOOKSL Train Dashboard"
echo "This script will make random changes to the database to demonstrate live updates."
echo "Make sure the backend server and frontend are running."
echo ""
echo "Press Ctrl+C to stop the test at any time."
echo ""

# Loop to continuously update the database
counter=1
while true; do
  echo "Update #$counter"
  
  # Randomly choose between updating a journey or a schedule
  if [ $((RANDOM % 2)) -eq 0 ]; then
    update_random_journey
  else
    update_random_schedule
  fi
  
  echo "Waiting 5 seconds before next update..."
  echo ""
  sleep 5
  counter=$((counter + 1))
done
