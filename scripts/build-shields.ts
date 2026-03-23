/**
 * Build highway shield sprites for a specific basemap
 * 
 * Converts SVG shields to PNG and adds them to the sprite sheet.
 * Reads shield colors from the basemap's theme.ts.
 * 
 * Usage: npx tsx scripts/build-shields.ts <basemap-name>
 * Example: npx tsx scripts/build-shields.ts dark-blue
 * 
 * Note: Requires 'sharp' package: npm install sharp --save-dev
 */

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get basemap name from command line argument
const basemapName = "my-custom-map-fixed"; // Fixed for this spinoff
const BASEMAP_DIR = join(__dirname, "..");  // Current directory is the basemap
const SPRITES_DIR = join(BASEMAP_DIR, 'sprites');
const SHIELDS_DIR = join(__dirname, "..", "sprites", "shields");  // Shields in local sprites dir

// Dynamically import theme based on basemap name
async function getBasemapShields() {
  try {
    // Try to import the theme module
    const themeModule = await import("../styles/theme.js");
    const theme = themeModule.myCustomMapFixedTheme || themeModule;
    
    if (theme?.shields) {
      return theme.shields;
    }
    
    throw new Error(`No shields configuration found in theme for ${basemapName}`);
  } catch (error) {
    console.error(`Error loading theme for ${basemapName}:`, error);
    throw error;
  }
}

interface SpriteDefinition {
  width: number;
  height: number;
  x: number;
  y: number;
  pixelRatio: number;
  sdf?: boolean;
}

interface SpriteSheet {
  [name: string]: SpriteDefinition;
}

const shields = [
  // Custom shields (uses theme colors from basemap theme)
  { name: 'shield-interstate-custom', file: 'shield-interstate-custom.svg', width: 28, height: 28, useTheme: 'interstate' },
  { name: 'shield-ushighway-custom', file: 'shield-ushighway-custom.svg', width: 26, height: 26, useTheme: 'usHighway' },
  { name: 'shield-state-custom', file: 'shield-state-custom.svg', width: 34, height: 34, useTheme: 'stateHighway' },
];

/**
 * Generate custom Interstate shield SVG with theme colors
 */
function generateCustomInterstateShield(config: any): string {
  // Default values if not specified in theme
  const upperBg = config.upperBackground || '#2a3444';
  const lowerBg = config.lowerBackground || '#1e2530';
  const stroke = config.strokeColor || '#4a5a6a';
  const strokeWidth = config.strokeWidth || 2;
  
  console.log(`  Generating custom Interstate shield:`);
  console.log(`    Upper background: ${upperBg}`);
  console.log(`    Lower background: ${lowerBg}`);
  console.log(`    Stroke color: ${stroke}`);
  console.log(`    Stroke width: ${strokeWidth}`);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 126 127.195">
  <!-- Interstate shield - configurable design -->
  <!-- Upper background (the pointed top section) -->
  <path id="upper-bg" fill="${upperBg}" d="M105.641,6.931c1.471,1.92,4.06,5.614,6.623,10.817c1.428,2.898,2.965,6.522,4.295,10.774H9.442c3.471-11.056,8.596-18.556,10.921-21.592c3.528,1.204,11.163,3.373,20.353,3.373c10.34,0,19.353-2.578,22.285-3.515c2.934,0.937,11.946,3.515,22.286,3.515C94.478,10.304,102.112,8.136,105.641,6.931z"/>
  <!-- Lower background (shield body below divider) -->
  <path id="lower-bg" fill="${lowerBg}" d="M5.939,51.446c0-7.455,1.067-14.154,2.643-19.985h108.831c1.549,5.745,2.649,12.468,2.649,19.985c0,8-1.564,23.702-12.037,38.992C98.106,104.921,82.959,115.16,63,120.883c-19.959-5.723-35.106-15.962-45.024-30.444C7.502,75.148,5.939,59.446,5.939,51.446z"/>
  <!-- Outline/border -->
  <path id="outline" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" d="M107.388,0.007l-1.957,0.817c-0.088,0.037-8.947,3.686-20.146,3.686c-11.3,0-21.18-3.465-21.276-3.499L63,0.652L61.993,1.01c-0.099,0.035-9.979,3.5-21.279,3.5c-11.198,0-20.057-3.648-20.142-3.684L18.612,0l-1.428,1.577C16.482,2.353,0,20.91,0,51.591c0,28.054,16.338,62.589,62.194,75.38L63,127.195l0.806-0.225C109.662,114.18,126,79.645,126,51.591c0-30.681-16.482-49.238-17.184-50.014L107.388,0.007z"/>
</svg>`;
}

/**
 * Generate custom US Highway shield SVG with theme colors
 */
function generateCustomUSHighwayShield(config: any): string {
  // Default values if not specified in theme
  const background = config.background || '#1e2530';
  const stroke = config.strokeColor || '#4a5a6a';
  const strokeWidth = config.strokeWidth || 3;
  
  console.log(`  Generating custom US Highway shield:`);
  console.log(`    Background: ${background}`);
  console.log(`    Stroke color: ${stroke}`);
  console.log(`    Stroke width: ${strokeWidth}`);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- US Highway shield - configurable design -->
  <!-- Background fill -->
  <path id="background" fill="${background}" d="M50,91.8c2.8-3.4,9.3-5.5,15.5-7.3c2-0.6,3.8-1.1,5.4-1.7c0.4-0.1,0.8-0.3,1.3-0.4c6.5-2.2,17.4-5.9,17.4-16.9c0-8-2.3-13-4.3-17.5c-1.5-3.3-2.8-6.2-2.8-9.5c0-6.5,5.1-14.8,6.6-17.2l-12-12.2c-9,4.6-19.5,3.7-24.9,0.5C51.4,9,50,8,50,8S48.6,9,47.6,9.6c-5.4,3.2-15.8,4-24.9-0.5l-12,12.2c1.6,2.4,6.6,10.7,6.6,17.2c0,3.3-1.3,6.2-2.8,9.5c-2,4.5-4.3,9.5-4.3,17.5c0,10.9,10.9,14.6,17.4,16.9c0.5,0.2,0.9,0.3,1.3,0.4c1.6,0.6,3.5,1.1,5.4,1.7C40.7,86.3,47.2,88.4,50,91.8z"/>
  <!-- Outline/border -->
  <path id="outline" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" d="M50,95c0,0-2.6-4.5-15-8.3c-2-0.6-5-1.5-6.6-2c-0.4-0.1-0.8-0.3-1.3-0.4C20.6,82,8.4,77.9,8.4,65.5c0-8.4,2.5-13.9,4.5-18.3c1.4-3.1,2.6-5.8,2.6-8.6c0-7-6.7-16.7-6.7-16.8L8.2,21L22.4,6.6L23.1,7c9.1,4.9,19.2,3.5,23.5,0.9C48.1,7,50,5,50,5s1.9,2,3.4,2.9c4.3,2.6,14.5,4,23.5-0.9l0.7-0.4L91.8,21l-0.5,0.7c-0.1,0.1-6.7,9.8-6.7,16.8c0,2.9,1.2,5.6,2.6,8.6c2,4.4,4.5,9.9,4.5,18.3c0,12.4-12.2,16.5-18.7,18.8c-0.5,0.2-0.9,0.3-1.3,0.4c-1.6,0.6-4.6,1.4-6.6,2C52.6,90.5,50,95,50,95L50,95z"/>
</svg>`;
}

/**
 * Generate custom State Highway shield SVG with theme colors
 */
function generateCustomStateHighwayShield(config: any): string {
  // Default values if not specified in theme
  const background = config.background || '#1e2530';
  const stroke = config.strokeColor || '#4a5a6a';
  const strokeWidth = config.strokeWidth || 2;
  
  console.log(`  Generating custom State Highway shield:`);
  console.log(`    Background: ${background}`);
  console.log(`    Stroke color: ${stroke}`);
  console.log(`    Stroke width: ${strokeWidth}`);
  
  // Read the SVG template and replace template variables
  const svgPath = join(SHIELDS_DIR, 'shield-state-custom.svg');
  let svgTemplate = readFileSync(svgPath, 'utf8');
  
  // Replace template variables
  svgTemplate = svgTemplate.replace(/\{\{background\}\}/g, background);
  svgTemplate = svgTemplate.replace(/\{\{stroke\}\}/g, stroke);
  svgTemplate = svgTemplate.replace(/\{\{strokeWidth\}\}/g, strokeWidth.toString());
  
  return svgTemplate;
}

async function buildShields() {
  console.log(`Building highway shield sprites for basemap: ${basemapName}\n`);
  
  // Ensure sprite directory exists
  mkdirSync(SPRITES_DIR, { recursive: true });
  
  // Load basemap-specific theme
  const basemapShields = await getBasemapShields();
  
  // Build both 1x and 2x versions
  await buildSpriteSheet(1, basemapShields);
  await buildSpriteSheet(2, basemapShields);
  
  console.log(`\n✓ Highway shields added to sprite sheets for ${basemapName}!`);
}

async function buildSpriteSheet(pixelRatio: number, basemapShields: any) {
  const suffix = pixelRatio === 1 ? '' : `@${pixelRatio}x`;
  const jsonPath = join(SPRITES_DIR, `basemap${suffix}.json`);
  const pngPath = join(SPRITES_DIR, `basemap${suffix}.png`);
  
  console.log(`\nBuilding ${pixelRatio}x sprite sheet...`);
  
  // Load existing sprite sheet JSON (or create empty if doesn't exist)
  let spriteJson: SpriteSheet = {};
  if (existsSync(jsonPath)) {
    spriteJson = JSON.parse(readFileSync(jsonPath, 'utf8'));
  }
  
  // Find the max Y position in existing sprites (in logical pixels)
  let maxY = 0;
  for (const sprite of Object.values(spriteJson)) {
    const spriteRatio = sprite.pixelRatio || 1;
    const logicalY = sprite.y / spriteRatio;
    const logicalHeight = sprite.height / spriteRatio;
    maxY = Math.max(maxY, logicalY + logicalHeight);
  }
  
  // Remove any existing shield entries from JSON to prevent duplicates
  for (const shield of shields) {
    if (spriteJson[shield.name]) {
      console.log(`  Removing existing ${shield.name} entry to prevent duplicates`);
      delete spriteJson[shield.name];
    }
  }
  
  // Recalculate maxY after removing shields (in case shields were at the end)
  maxY = 0;
  for (const sprite of Object.values(spriteJson)) {
    const spriteRatio = sprite.pixelRatio || 1;
    const logicalY = sprite.y / spriteRatio;
    const logicalHeight = sprite.height / spriteRatio;
    maxY = Math.max(maxY, logicalY + logicalHeight);
  }
  
  // Add shield definitions (in physical pixels for this ratio)
  let currentY = Math.ceil(maxY * pixelRatio);
  for (const shield of shields) {
    const physicalWidth = shield.width * pixelRatio;
    const physicalHeight = shield.height * pixelRatio;
    
    spriteJson[shield.name] = {
      width: physicalWidth,
      height: physicalHeight,
      x: 0,
      y: currentY,
      pixelRatio: pixelRatio,
    };
    console.log(`  Added ${shield.name}: ${physicalWidth}x${physicalHeight} at y=${currentY}`);
    currentY += physicalHeight;
  }
  
  // Write updated JSON
  writeFileSync(jsonPath, JSON.stringify(spriteJson, null, 2), 'utf8');
  console.log(`  Updated ${jsonPath}`);
  
  // Load existing sprite sheet or create new one
  let existingSprite: sharp.Sharp | null = null;
  let metadata: sharp.Metadata | null = null;
  let spriteWidth = 0;
  
  if (existsSync(pngPath)) {
    existingSprite = sharp(pngPath);
    metadata = await existingSprite.metadata();
    spriteWidth = metadata.width || 0;
  } else {
    // Create new sprite sheet - determine width from shields
    spriteWidth = Math.max(...shields.map(s => s.width)) * pixelRatio;
  }
  
  // Create composite operations for new shields
  const composites: any[] = [];
  currentY = Math.ceil(maxY * pixelRatio);
  
  for (const shield of shields) {
    let svgBuffer: Buffer;
    const shieldWithTheme = shield as any;
    
    if (shieldWithTheme.useTheme === 'interstate') {
      // Generate custom Interstate shield with theme colors
      svgBuffer = Buffer.from(generateCustomInterstateShield(basemapShields.interstate));
    } else if (shieldWithTheme.useTheme === 'usHighway') {
      // Generate custom US Highway shield with theme colors
      svgBuffer = Buffer.from(generateCustomUSHighwayShield(basemapShields.usHighway));
    } else if (shieldWithTheme.useTheme === 'stateHighway') {
      // Generate custom State Highway shield with theme colors
      svgBuffer = Buffer.from(generateCustomStateHighwayShield(basemapShields.stateHighway));
    } else {
      // Use existing SVG file
      const svgPath = join(SHIELDS_DIR, shield.file);
      if (!existsSync(svgPath)) {
        console.log(`  Warning: ${svgPath} not found, skipping`);
        continue;
      }
      svgBuffer = readFileSync(svgPath);
    }
    
    const physicalWidth = shield.width * pixelRatio;
    const physicalHeight = shield.height * pixelRatio;
    
    const pngBuffer = await sharp(svgBuffer)
      .resize(physicalWidth, physicalHeight)
      .png()
      .toBuffer();
    
    composites.push({
      input: pngBuffer,
      left: 0,
      top: currentY,
    });
    currentY += physicalHeight;
  }
  
  // Extend the sprite sheet height and add shields
  const newHeight = currentY;
  const existingHeight = metadata?.height || 0;
  
  if (existsSync(pngPath)) {
    // Check if shields already exist in the PNG by checking if height matches expected shield area
    // If shields are already at the end, we need to crop them out first
    const expectedShieldArea = Math.ceil(maxY * pixelRatio);
    
    // If the existing height is greater than expected (meaning shields might already be there),
    // crop the image to remove the shield area before adding new ones
    let baseImage = sharp(pngPath);
    if (existingHeight > expectedShieldArea) {
      console.log(`  Cropping existing sprite to remove old shields (${existingHeight}px → ${expectedShieldArea}px)`);
      baseImage = baseImage.extract({
        left: 0,
        top: 0,
        width: spriteWidth,
        height: expectedShieldArea,
      });
    }
    
    // Extend existing sprite with new shields
    await sharp({
      create: {
        width: spriteWidth,
        height: newHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: await baseImage.toBuffer(), left: 0, top: 0 },
        ...composites,
      ])
      .png()
      .toFile(pngPath + '.new');
    
    // Replace old file
    renameSync(pngPath + '.new', pngPath);
  } else {
    // Create new sprite
    await sharp({
      create: {
        width: spriteWidth,
        height: newHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toFile(pngPath);
  }
  
  console.log(`  Updated ${pngPath} (${spriteWidth}x${newHeight}px)`);
}

buildShields().catch(console.error);
