# Firebase Integration Guide

## Setup Instructions

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the setup wizard
   - Enable Google Analytics if desired

2. **Register Your Web App**
   - In your Firebase project, click on the web icon (</>) to add a web app
   - Enter a nickname for your app (e.g., "Trinity Vision Center")
   - Register the app

3. **Firebase Configuration**
   - The Firebase configuration has already been added to your project
   - The configuration is set up in `JS/FirebaseConfig.js`
   - If you need to use a different Firebase project, you can update the configuration in this file

4. **Set Up Firebase Authentication**
   - In the Firebase Console, go to Authentication
   - Click "Get started"
   - Enable Email/Password authentication
   - Add an admin user with email and password

5. **Set Up Firebase Realtime Database**
   - In the Firebase Console, go to Realtime Database
   - Click "Create database"
   - Start in test mode (you can adjust security rules later)
   - Choose a database location close to your users

## Testing the Integration

1. **Test Authentication**
   - Open your website
   - Click on the "Admin Mode" button
   - Enter the email and password you created in Firebase Authentication
   - You should be logged in as an admin

2. **Test Pre-Order Functionality**
   - As a guest, navigate to a product page
   - Click "Pre-Order"
   - Fill out the pre-order form and submit
   - You should see a confirmation page

3. **Test Notifications**
   - Log in as an admin
   - Click on the notification bell icon
   - You should see the pre-order notification you just created
   - The notification should persist even after refreshing the page

## Security Considerations

1. **Update Database Rules**
   - In the Firebase Console, go to Realtime Database > Rules
   - Implement proper security rules to restrict access to authenticated users
   - Example rules:
   ```json
   {
     "rules": {
       "preOrders": {
         ".read": "auth != null",  // Only authenticated users can read
         ".write": true            // Anyone can write (for guest pre-orders)
       }
     }
   }
   ```

2. **Secure API Keys**
   - For production, consider using environment variables or server-side authentication
   - The current implementation is suitable for development but may need enhancement for production

## Troubleshooting

1. **Authentication Issues**
   - Check browser console for error messages
   - Verify that your Firebase configuration is correct
   - Ensure the user exists in Firebase Authentication

2. **Database Issues**
   - Check browser console for error messages
   - Verify database rules allow the operations you're attempting
   - Check network tab to see if requests to Firebase are being made

3. **General Issues**
   - Clear browser cache and cookies
   - Try in an incognito/private browsing window
   - Check if Firebase services are operational at [Firebase Status](https://status.firebase.google.com/)