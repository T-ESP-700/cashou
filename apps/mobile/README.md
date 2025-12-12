# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## ⚠️ Important: Development Client Required

This project uses `expo-dev-client`, which means **Expo Go cannot be used**. You need to install a development build on your device.

### Why is expo-dev-client required?

1. **Push Notifications**: Starting from Expo SDK 53, push notifications are no longer supported in Expo Go for Android. Since this project uses Expo SDK 54 and `expo-notifications`, a development build is required for notifications to work properly.

2. **Native Modules**: The project uses native modules that require a custom build:
   - `react-native-reanimated` (animations)
   - `react-native-gesture-handler` (gestures)
   - `react-native-screens` (navigation)
   - `expo-notifications` (push notifications)

3. **iOS Limitations**: While Expo Go may work for iOS in some cases, push notifications and other native features may not function correctly.

### Why `npx expo start` works but the QR code shows "no usable data found":

When you run `npx expo start` (or `cd apps/mobile && npx expo start`), Expo automatically detects that `expo-dev-client` is installed and starts in dev-client mode. **The server works correctly**, but:

1. The QR code generated uses a special URL scheme (`exp://...`) that the default iOS camera app doesn't recognize
2. You must scan the QR code **from within the Expo Development Client app**, not from the camera app
3. Expo Go doesn't support projects with `expo-dev-client`, so even if you could scan it, it wouldn't work

### Solutions:

**Option 1: Use Development Client (Recommended)**
1. Build and install a development client on your device:
   ```bash
   # For iOS
   bun run build:mobile:ios

   # For Android
   bun run build:mobile:android
   ```
2. Install the app on your device
3. Scan the QR code **from within the Expo Development Client app** (not the camera app)

**Option 2: Use Tunnel Mode (Better network connectivity)**
```bash
bun run dev:mobile:tunnel
```
This uses Expo's tunnel service which can help with network issues.

**Option 3: Try Expo Go Mode (Not Recommended - notifications won't work)**
```bash
bun run dev:mobile:go
```
⚠️ **Warning**: Expo Go mode will NOT work properly because:
- Push notifications are not supported in Expo Go (SDK 53+)
- Native modules like `react-native-reanimated` require a dev client
- You will encounter runtime errors with notifications and animations

## Get started

1. Install dependencies

   ```bash
   bun install
   ```

2. Start the app

   ```bash
   # Development client mode (default)
   bun run dev:mobile

   # With tunnel (if you have network issues)
   bun run dev:mobile:tunnel

   # Expo Go mode (limited support)
   bun run dev:mobile:go
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
