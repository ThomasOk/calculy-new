import type { ConfigContext, ExpoConfig } from '@expo/config';

import type { AppIconBadgeConfig } from 'app-icon-badge/types';

import 'tsx/cjs';

// adding lint exception as we need to import tsx/cjs before env.ts is imported
// eslint-disable-next-line perfectionist/sort-imports
import Env from './env';

const EAS_PROJECT_ID = '72c9f9f9-982c-4a04-bd75-c656655bc688';

// Google's iOS client ID looks like `<id>.apps.googleusercontent.com`; the
// reversed-DNS URL scheme Google Sign-In needs on iOS is just that `<id>`
// prefixed with `com.googleusercontent.apps.`.
const GOOGLE_IOS_URL_SCHEME = `com.googleusercontent.apps.${Env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.split('.')[0]}`;

// Resolved through Node's own module resolution rather than a literal
// `node_modules/...` path — with the workspace's hoisted pnpm linker, these
// packages live in the monorepo root's node_modules, not this app's, so a
// relative path (which the native Xcode/Gradle copy scripts read literally,
// unlike a JS import) would silently miss.
const FONT_INTER_400 = require.resolve('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf');
const FONT_INTER_500 = require.resolve('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf');
const FONT_INTER_600 = require.resolve('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');
const FONT_INTER_700 = require.resolve('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf');
const FONT_MPLUS_ROUNDED_700 = require.resolve('@expo-google-fonts/m-plus-rounded-1c/700Bold/MPLUSRounded1c_700Bold.ttf');

const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: Env.EXPO_PUBLIC_APP_ENV !== 'production',
  badges: [
    {
      text: Env.EXPO_PUBLIC_APP_ENV,
      type: 'banner',
      color: 'white',
    },
    {
      text: Env.EXPO_PUBLIC_VERSION.toString(),
      type: 'ribbon',
      color: 'white',
    },
  ],
};

const PLUGINS: ExpoConfig['plugins'] = [
  [
    'expo-splash-screen',
    {
      backgroundColor: '#2E3C4B',
      image: './assets/splash-icon.png',
      imageWidth: 150,
    },
  ],
  [
    'expo-font',
    {
      ios: {
        fonts: [
          FONT_INTER_400,
          FONT_INTER_500,
          FONT_INTER_600,
          FONT_INTER_700,
          // Challenge digits. One weight only: each is ~3.5 MB, the font
          // carries Japanese glyphs.
          FONT_MPLUS_ROUNDED_700,
        ],
      },
      android: {
        fonts: [
          {
            fontFamily: 'Inter',
            fontDefinitions: [
              {
                path: FONT_INTER_400,
                weight: 400,
              },
              {
                path: FONT_INTER_500,
                weight: 500,
              },
              {
                path: FONT_INTER_600,
                weight: 600,
              },
              {
                path: FONT_INTER_700,
                weight: 700,
              },
            ],
          },
          {
            // Named after the font's iOS PostScript name so one fontFamily
            // works on both platforms.
            fontFamily: 'RoundedMplus1c-Bold',
            fontDefinitions: [
              {
                path: FONT_MPLUS_ROUNDED_700,
                weight: 700,
              },
            ],
          },
        ],
      },
    },
  ],
  'expo-localization',
  'expo-router',
  'expo-web-browser',
  'expo-apple-authentication',
  [
    '@react-native-google-signin/google-signin',
    {
      iosUrlScheme: GOOGLE_IOS_URL_SCHEME,
    },
  ],
  ['app-icon-badge', appIconBadgeConfig],
  ['react-native-edge-to-edge'],
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.EXPO_PUBLIC_NAME,
  description: `${Env.EXPO_PUBLIC_NAME} Mobile App`,
  scheme: Env.EXPO_PUBLIC_SCHEME,
  slug: 'calculy',
  version: Env.EXPO_PUBLIC_VERSION.toString(),
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.EXPO_PUBLIC_BUNDLE_ID,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2E3C4B',
    },
    package: Env.EXPO_PUBLIC_PACKAGE,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: PLUGINS,
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
});
