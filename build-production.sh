#!/bin/bash

# Build production version using .env.production
eas build --profile production --platform android --env-file .env.production 