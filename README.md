# Archipelago Client for Firebot

This script is an extension for [Firebot](https://firebot.app) that allows it to connect to Archipelago MultiWorlds and send and receive data as well as hook into various events.

### Setup

- In Firebot, go to Settings > Scripts
  - Enable Custom Scripts if they are not currently enabled
  - Click Manage Startup Scripts
  - Click Add New Script
  - Click the "scripts folder" link to open the Scripts Folder and place the oceanityArchipelago folder from the downloaded .zip file there there
  - Refresh the list of scripts and pick oceanityArchipelago/index.js from the dropdown
  - Click Save
- A new tab will be added to the main window of Firebot, "Archipelago"
  - Inside you will see a chat box with connection fields at the top
  - Insert credentials and click "Connect" or hit Enter
  - If successful, a new tab with the slot name and address should appear and begin to load events/messages from the client
