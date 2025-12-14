#!/bin/bash
# Install required libraries for Android Emulator in WSL2

echo "Installing required libraries for Android Emulator..."
echo "You'll need to enter your sudo password."
echo ""

# PulseAudio (for audio, even if disabled)
sudo apt-get update
sudo apt-get install -y \
    libpulse0 \
    libnss3 \
    libnss3-tools \
    libxkbfile1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0

echo ""
echo "Installation complete!"
echo "Now try running the emulator again."
