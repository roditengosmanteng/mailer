#!/bin/bash
# setup-swap.sh: Configure a 2GB swap space on Ubuntu VPS to prevent npm install OOM errors.
echo "Checking current swap space..."
if [ $(free -m | grep -i swap | awk '{print $2}') -gt 0 ]; then
  echo "Swap space is already configured!"
  free -h
else
  echo "No swap space detected. Creating 2GB swapfile..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "Swap space successfully configured!"
  free -h
fi
