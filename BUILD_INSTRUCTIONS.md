# GST Invoice Calculator - Build Instructions

## Web App (Development)

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Web App (Production Build)

```bash
npm run build
npm run preview
```

## Android APK

### Prerequisites
- Android SDK installed (set ANDROID_HOME)
- Java JDK 17+

### Build Steps

```bash
# 1. Build the web app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Build APK
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Open in Android Studio
```bash
npx cap open android
```

## Firebase Setup

The app uses Firebase Firestore. Make sure to:

1. Go to Firebase Console > Firestore Database
2. Create the database (Start in test mode for development)
3. The collections `companies`, `customers`, and `invoices` will be auto-created

### Firestore Security Rules (for production)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## First Steps

1. Go to **Settings** and fill in your company details
2. Add customers in the **Customers** page
3. Create your first invoice from **New Invoice**
4. Download or preview the PDF from the invoice view page
