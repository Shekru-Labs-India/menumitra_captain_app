#!/bin/bash

# Set environment variable
export APP_ENV=prod

# Run the build command with environment variable
APP_ENV=prod eas build --profile production --platform android 