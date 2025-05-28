#!/bin/bash

# Set environment variable
export APP_ENV=dev

# Build preview version using .env.preview
eas build --profile preview --platform android --env-file .env.preview 