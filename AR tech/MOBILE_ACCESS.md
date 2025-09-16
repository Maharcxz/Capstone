# Accessing the AR Glasses Try-On Application on Mobile Devices

## Overview

This document provides instructions for accessing and using the AR Glasses Try-On application on mobile devices. The application has been optimized for mobile use with responsive design, touch controls, and mobile-specific camera handling.

## Methods to Access on Mobile

### Method 1: Direct URL Access

1. Host the application on a web server (local network or internet)
2. Access the URL directly from your mobile browser
3. For local testing, ensure your mobile device is on the same network as your development server

### Method 2: QR Code (Recommended)

1. Open the included `qr-generator.html` file in your browser
2. The page will automatically generate a QR code for your application
3. Scan the QR code with your mobile device's camera
4. Your mobile browser will open the application

## Mobile Usage Instructions

### First-Time Setup

1. **Camera Permissions**: When prompted, allow the application to access your camera
2. **Orientation**: Use your device in portrait mode for the best experience
3. **Instructions**: Read the on-screen instructions that appear when you first open the app

### Using the Application

1. **Positioning**: Center your face in the camera view
2. **Selecting Glasses**: Use the dropdown menu at the bottom of the screen to try different glasses styles
3. **Fullscreen Mode**: Double-tap anywhere on the screen to toggle fullscreen mode
4. **Back Button**: Use the back button in the top-left corner to exit the application

### Tips for Best Results

- Use in well-lit environments for better face tracking
- Hold your device at arm's length for optimal face detection
- Avoid rapid movements for more stable glasses positioning
- If glasses appear misaligned, try adjusting the distance between your face and the camera

## Troubleshooting

### Camera Not Working

- Ensure you've granted camera permissions
- Try refreshing the page
- Check if your camera works in other applications

### Performance Issues

- Close other applications running in the background
- Ensure your device has a modern browser (Chrome, Safari, Firefox)
- If the application runs slowly, try using a device with better specifications

### Glasses Not Appearing

- Make sure your face is clearly visible and well-lit
- Try selecting a different glasses style from the dropdown
- Refresh the page and try again

## Browser Compatibility

The application works best on the following mobile browsers:

- Chrome (Android/iOS)
- Safari (iOS)
- Firefox (Android/iOS)

## Technical Requirements

- Modern smartphone with front-facing camera
- Updated mobile browser
- Internet connection (for initial loading)
- Device with WebGL support