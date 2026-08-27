import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const appConfig = JSON.parse(readFileSync(resolve(root, 'app.json'), 'utf8')).expo;

const configuredPaths = {
  appIcon: appConfig.icon,
  androidLegacyIcon: appConfig.android?.icon,
  androidForeground: appConfig.android?.adaptiveIcon?.foregroundImage,
  androidBackground: appConfig.android?.adaptiveIcon?.backgroundImage,
  androidMonochrome: appConfig.android?.adaptiveIcon?.monochromeImage,
  splash: findPlugin('expo-splash-screen')?.image,
  notification: findPlugin('expo-notifications')?.icon,
};

const expectedPaths = {
  appIcon: './assets/images/icon.png',
  androidLegacyIcon: './assets/images/icon.png',
  androidForeground: './assets/images/android-icon-foreground.png',
  androidBackground: './assets/images/android-icon-background.png',
  androidMonochrome: './assets/images/android-icon-monochrome.png',
  splash: './assets/images/splash-icon.png',
  notification: './assets/images/notification-icon.png',
};

const assetRules = {
  appIcon: {
    width: 1024,
    height: 1024,
    alphaChannel: false,
  },
  androidLegacyIcon: {
    width: 1024,
    height: 1024,
    alphaChannel: false,
  },
  androidForeground: {
    width: 1024,
    height: 1024,
    alphaChannel: true,
    transparentPixels: true,
    opaquePixels: true,
    whiteArtwork: true,
    safeZoneMargin: 102,
  },
  androidBackground: {
    width: 1024,
    height: 1024,
    alphaChannel: false,
  },
  androidMonochrome: {
    width: 1024,
    height: 1024,
    alphaChannel: true,
    transparentPixels: true,
    opaquePixels: true,
    whiteArtwork: true,
    safeZoneMargin: 102,
  },
  splash: {
    width: 1024,
    height: 1024,
    alphaChannel: true,
    transparentPixels: true,
    opaquePixels: true,
    whiteArtwork: true,
  },
  notification: {
    width: 96,
    height: 96,
    alphaChannel: true,
    transparentPixels: true,
    opaquePixels: true,
    whiteArtwork: true,
  },
};

const failures = [];
const inspectedFiles = new Map();

for (const [name, expectedPath] of Object.entries(expectedPaths)) {
  const configuredPath = configuredPaths[name];
  check(
    configuredPath === expectedPath,
    `${name}: expected config path ${expectedPath}, received ${configuredPath ?? 'missing'}`,
  );

  const absolutePath = resolve(root, expectedPath);
  let image = inspectedFiles.get(absolutePath);

  try {
    image ??= inspectPng(absolutePath);
    inspectedFiles.set(absolutePath, image);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    continue;
  }

  const rule = assetRules[name];
  check(
    image.width === rule.width && image.height === rule.height,
    `${name}: expected ${rule.width}x${rule.height}, received ${image.width}x${image.height}`,
  );
  check(
    image.hasAlphaChannel === rule.alphaChannel,
    `${name}: expected alpha channel=${rule.alphaChannel}, received ${image.hasAlphaChannel}`,
  );

  if (rule.transparentPixels) {
    check(image.alphaBounds.transparent > 0, `${name}: expected transparent pixels`);
  }
  if (rule.opaquePixels) {
    check(image.alphaBounds.visible > 0, `${name}: expected visible artwork`);
  }
  if (rule.whiteArtwork) {
    check(image.nonWhiteVisiblePixels === 0, `${name}: visible artwork must be pure white`);
  }
  if (rule.safeZoneMargin !== undefined && image.alphaBounds.visible > 0) {
    const { minX, minY, maxX, maxY } = image.alphaBounds;
    check(
      minX >= rule.safeZoneMargin &&
        minY >= rule.safeZoneMargin &&
        maxX < image.width - rule.safeZoneMargin &&
        maxY < image.height - rule.safeZoneMargin,
      `${name}: visible artwork exceeds the ${rule.safeZoneMargin}px adaptive-icon safety margin`,
    );
  }

  console.log(
    `✓ ${name}: ${expectedPath} (${image.width}x${image.height}, alpha=${image.hasAlphaChannel})`,
  );
}

if (process.argv.includes('--native')) {
  validateNativeArtifacts();
}

if (failures.length > 0) {
  console.error('\nIcon validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    process.argv.includes('--native')
      ? '\nAll Gasp source and generated native icon checks passed.'
      : '\nAll Gasp icon configuration and asset checks passed.',
  );
}

function findPlugin(name) {
  const entry = appConfig.plugins?.find(
    (plugin) => plugin === name || (Array.isArray(plugin) && plugin[0] === name),
  );
  return Array.isArray(entry) ? entry[1] : undefined;
}

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function validateNativeArtifacts() {
  const nativeRules = [
    {
      name: 'iOS app icon',
      path: 'ios/GASP/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png',
      width: 1024,
      height: 1024,
      alphaChannel: false,
    },
    ...[
      ['image.png', 200],
      ['image@2x.png', 400],
      ['image@3x.png', 600],
    ].map(([filename, size]) => ({
      name: `iOS splash ${filename}`,
      path: `ios/GASP/Images.xcassets/SplashScreenLogo.imageset/${filename}`,
      width: size,
      height: size,
      alphaChannel: true,
      transparentPixels: true,
      grayscaleArtwork: true,
    })),
  ];

  const androidDensities = [
    { name: 'mdpi', legacy: 48, adaptive: 108, notification: 24, splash: 288 },
    { name: 'hdpi', legacy: 72, adaptive: 162, notification: 36, splash: 432 },
    { name: 'xhdpi', legacy: 96, adaptive: 216, notification: 48, splash: 576 },
    { name: 'xxhdpi', legacy: 144, adaptive: 324, notification: 72, splash: 864 },
    { name: 'xxxhdpi', legacy: 192, adaptive: 432, notification: 96, splash: 1152 },
  ];

  for (const density of androidDensities) {
    nativeRules.push(
      {
        name: `Android ${density.name} legacy icon`,
        path: `android/app/src/main/res/mipmap-${density.name}/ic_launcher.webp`,
        width: density.legacy,
        height: density.legacy,
        noTransparentPixels: true,
      },
      {
        name: `Android ${density.name} adaptive background`,
        path: `android/app/src/main/res/mipmap-${density.name}/ic_launcher_background.webp`,
        width: density.adaptive,
        height: density.adaptive,
        noTransparentPixels: true,
      },
      {
        name: `Android ${density.name} adaptive foreground`,
        path: `android/app/src/main/res/mipmap-${density.name}/ic_launcher_foreground.webp`,
        width: density.adaptive,
        height: density.adaptive,
        transparentPixels: true,
        opaquePixels: true,
        whiteArtwork: true,
      },
      {
        name: `Android ${density.name} monochrome icon`,
        path: `android/app/src/main/res/mipmap-${density.name}/ic_launcher_monochrome.webp`,
        width: density.adaptive,
        height: density.adaptive,
        transparentPixels: true,
        opaquePixels: true,
        whiteArtwork: true,
      },
      {
        name: `Android ${density.name} notification icon`,
        path: `android/app/src/main/res/drawable-${density.name}/notification_icon.png`,
        width: density.notification,
        height: density.notification,
        transparentPixels: true,
        opaquePixels: true,
        whiteArtwork: true,
      },
      {
        name: `Android ${density.name} splash logo`,
        path: `android/app/src/main/res/drawable-${density.name}/splashscreen_logo.png`,
        width: density.splash,
        height: density.splash,
        noTransparentPixels: true,
        containsWhite: true,
        containsSplashBackground: true,
      },
    );
  }

  console.log('\nGenerated native resources:');
  for (const rule of nativeRules) {
    const absolutePath = resolve(root, rule.path);
    let image;
    try {
      image = inspectPng(absolutePath);
    } catch (error) {
      failures.push(`${rule.name}: ${error.message}`);
      continue;
    }

    check(
      image.width === rule.width && image.height === rule.height,
      `${rule.name}: expected ${rule.width}x${rule.height}, received ${image.width}x${image.height}`,
    );
    if (rule.alphaChannel !== undefined) {
      check(
        image.hasAlphaChannel === rule.alphaChannel,
        `${rule.name}: expected alpha channel=${rule.alphaChannel}, received ${image.hasAlphaChannel}`,
      );
    }
    if (rule.transparentPixels) {
      check(image.alphaBounds.transparent > 0, `${rule.name}: expected transparent pixels`);
    }
    if (rule.noTransparentPixels) {
      check(
        image.alphaBounds.transparent === 0,
        `${rule.name}: expected every pixel to be opaque`,
      );
    }
    if (rule.opaquePixels) {
      check(image.alphaBounds.visible > 0, `${rule.name}: expected visible artwork`);
    }
    if (rule.whiteArtwork) {
      check(
        image.nonWhiteVisiblePixels === 0,
        `${rule.name}: visible artwork must be pure white`,
      );
    }
    if (rule.grayscaleArtwork) {
      check(
        image.nonGrayscaleVisiblePixels === 0,
        `${rule.name}: visible artwork must remain neutral greyscale`,
      );
    }
    if (rule.containsWhite) {
      check(image.opaqueWhitePixels > 0, `${rule.name}: expected white logo pixels`);
    }
    if (rule.containsSplashBackground) {
      check(
        image.splashBackgroundPixels > 0,
        `${rule.name}: expected #0A0A0F splash background pixels`,
      );
    }

    console.log(`✓ ${rule.name}: ${rule.width}x${rule.height}`);
  }

  validateNativeTextReferences();
}

function validateNativeTextReferences() {
  const manifest = readFileSync(
    resolve(root, 'android/app/src/main/AndroidManifest.xml'),
    'utf8',
  );
  for (const reference of [
    'android:icon="@mipmap/ic_launcher"',
    'android:roundIcon="@mipmap/ic_launcher_round"',
    'android:resource="@drawable/notification_icon"',
    'android:resource="@color/notification_icon_color"',
  ]) {
    check(
      manifest.includes(reference),
      `AndroidManifest.xml is missing native resource reference: ${reference}`,
    );
  }

  for (const filename of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const adaptiveXml = readFileSync(
      resolve(root, `android/app/src/main/res/mipmap-anydpi-v26/${filename}`),
      'utf8',
    );
    for (const reference of [
      '@mipmap/ic_launcher_background',
      '@mipmap/ic_launcher_foreground',
      '@mipmap/ic_launcher_monochrome',
    ]) {
      check(
        adaptiveXml.includes(reference),
        `${filename} is missing adaptive resource reference: ${reference}`,
      );
    }
  }

  const colors = readFileSync(
    resolve(root, 'android/app/src/main/res/values/colors.xml'),
    'utf8',
  );
  check(
    colors.includes('<color name="notification_icon_color">#7C3AED</color>'),
    'Android notification tint did not generate as #7C3AED',
  );

  console.log('✓ Native manifests reference launcher, themed, and notification resources');
}

function inspectPng(filePath) {
  const file = readFileSync(filePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!file.subarray(0, 8).equals(signature)) {
    throw new Error(`${filePath} is not a PNG file`);
  }

  let offset = 8;
  let header;
  const imageDataChunks = [];

  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('ascii', offset + 4, offset + 8);
    const data = file.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;

    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      imageDataChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!header) {
    throw new Error(`${filePath} has no PNG header`);
  }
  if (header.bitDepth !== 8 || header.interlace !== 0) {
    throw new Error(`${filePath} must be a non-interlaced 8-bit PNG`);
  }

  const channelsByColorType = new Map([
    [0, 1],
    [2, 3],
    [4, 2],
    [6, 4],
  ]);
  const channels = channelsByColorType.get(header.colorType);
  if (!channels) {
    throw new Error(`${filePath} uses unsupported PNG colour type ${header.colorType}`);
  }

  const inflated = inflateSync(Buffer.concat(imageDataChunks));
  const rowLength = header.width * channels;
  const pixels = Buffer.alloc(rowLength * header.height);
  let sourceOffset = 0;

  for (let y = 0; y < header.height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * rowLength;

    for (let x = 0; x < rowLength; x += 1) {
      const raw = inflated[sourceOffset + x];
      const left = x >= channels ? pixels[rowOffset + x - channels] : 0;
      const above = y > 0 ? pixels[rowOffset - rowLength + x] : 0;
      const upperLeft =
        y > 0 && x >= channels ? pixels[rowOffset - rowLength + x - channels] : 0;

      pixels[rowOffset + x] = unfilter(filter, raw, left, above, upperLeft);
    }

    sourceOffset += rowLength;
  }

  const hasAlphaChannel = header.colorType === 4 || header.colorType === 6;
  const alphaBounds = {
    transparent: 0,
    visible: 0,
    minX: header.width,
    minY: header.height,
    maxX: -1,
    maxY: -1,
  };
  let nonWhiteVisiblePixels = 0;
  let nonGrayscaleVisiblePixels = 0;
  let opaqueWhitePixels = 0;
  let splashBackgroundPixels = 0;

  for (let y = 0; y < header.height; y += 1) {
    for (let x = 0; x < header.width; x += 1) {
      const pixelOffset = (y * header.width + x) * channels;
      const [red, green, blue, alpha] = rgbaForPixel(
        pixels,
        pixelOffset,
        header.colorType,
      );

      if (alpha === 0) {
        alphaBounds.transparent += 1;
        continue;
      }

      alphaBounds.visible += 1;
      alphaBounds.minX = Math.min(alphaBounds.minX, x);
      alphaBounds.minY = Math.min(alphaBounds.minY, y);
      alphaBounds.maxX = Math.max(alphaBounds.maxX, x);
      alphaBounds.maxY = Math.max(alphaBounds.maxY, y);

      if (red !== 255 || green !== 255 || blue !== 255) {
        nonWhiteVisiblePixels += 1;
      }
      if (red !== green || green !== blue) {
        nonGrayscaleVisiblePixels += 1;
      }
      if (alpha === 255 && red === 255 && green === 255 && blue === 255) {
        opaqueWhitePixels += 1;
      }
      if (alpha === 255 && red === 10 && green === 10 && blue === 15) {
        splashBackgroundPixels += 1;
      }
    }
  }

  return {
    ...header,
    hasAlphaChannel,
    alphaBounds,
    nonWhiteVisiblePixels,
    nonGrayscaleVisiblePixels,
    opaqueWhitePixels,
    splashBackgroundPixels,
  };
}

function unfilter(filter, raw, left, above, upperLeft) {
  switch (filter) {
    case 0:
      return raw;
    case 1:
      return (raw + left) & 255;
    case 2:
      return (raw + above) & 255;
    case 3:
      return (raw + Math.floor((left + above) / 2)) & 255;
    case 4:
      return (raw + paeth(left, above, upperLeft)) & 255;
    default:
      throw new Error(`Unsupported PNG filter ${filter}`);
  }
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function rgbaForPixel(pixels, offset, colorType) {
  switch (colorType) {
    case 0:
      return [pixels[offset], pixels[offset], pixels[offset], 255];
    case 2:
      return [pixels[offset], pixels[offset + 1], pixels[offset + 2], 255];
    case 4:
      return [pixels[offset], pixels[offset], pixels[offset], pixels[offset + 1]];
    case 6:
      return [
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
        pixels[offset + 3],
      ];
    default:
      throw new Error(`Unsupported PNG colour type ${colorType}`);
  }
}
