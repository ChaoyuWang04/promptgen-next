/**
 * Standalone test for node-canvas font rendering
 * Run with: node test-canvas.js
 */

const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Register Arial font
const fontPath = path.join(__dirname, 'public', 'fonts', 'ARIAL.TTF');
console.log(`Font path: ${fontPath}`);
console.log(`Font exists: ${fs.existsSync(fontPath)}`);

registerFont(fontPath, { family: 'Arial' });
console.log('Registered Arial font');

// Create canvas
const canvas = createCanvas(800, 200);
const ctx = canvas.getContext('2d');

// Fill background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 800, 200);
console.log('Background filled');

// Set font and measure text
ctx.font = '110px Arial';
console.log(`Font set to: "${ctx.font}"`);

const testText = "I've tried 465 times but";
const width = ctx.measureText(testText).width;
console.log(`Text: "${testText}"`);
console.log(`Measured width: ${width}px`);
console.log(`Expected width: ~500-600px`);

// Draw text
ctx.fillStyle = '#000000';
ctx.fillText(testText, 50, 120);
console.log('Text drawn');

// Save to file
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, 'test-canvas-output.png'), buffer);
console.log('Saved to test-canvas-output.png');

// Check if width is correct
if (width < 200) {
  console.error('❌ ERROR: Text width is way too small! Font is not being applied correctly.');
  process.exit(1);
} else {
  console.log('✅ SUCCESS: Text width looks reasonable. Font is working.');
  process.exit(0);
}
