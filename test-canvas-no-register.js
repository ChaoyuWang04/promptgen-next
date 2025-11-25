/**
 * Test WITHOUT registerFont - use system Arial only
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create canvas
const canvas = createCanvas(800, 200);
const ctx = canvas.getContext('2d');

// Fill background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 800, 200);
console.log('Background filled');

// Set font WITHOUT registration - just use system Arial
ctx.font = '110px Arial';
console.log(`Font set to: "${ctx.font}"`);

const testText = "I've tried 465 times but";
const width = ctx.measureText(testText).width;
console.log(`Text: "${testText}"`);
console.log(`Measured width: ${width}px`);

// Draw text
ctx.fillStyle = '#000000';
ctx.fillText(testText, 50, 120);
console.log('Text drawn');

// Save to file
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, 'test-canvas-no-register.png'), buffer);
console.log('Saved to test-canvas-no-register.png');

// Check result
if (width > 500) {
  console.log('✅ SUCCESS with system Arial: Width is correct!');
  process.exit(0);
} else {
  console.error(`❌ FAIL: Width still wrong (${width}px)`);
  process.exit(1);
}
