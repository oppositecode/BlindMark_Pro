
/**
 * This file contains the raw worker code as a string.
 */

export const workerScript = `
// DCT Constants
const N = 8;

// 1D DCT Matrix Precompute
const T = new Float32Array(N * N);
for (let i = 0; i < N; i++) {
  for (let j = 0; j < N; j++) {
    const a = i === 0 ? 1 / Math.sqrt(N) : Math.sqrt(2 / N);
    T[i * N + j] = a * Math.cos(((2 * j + 1) * i * Math.PI) / (2 * N));
  }
}

function dct8x8(block) {
  const temp = new Float32Array(64);
  const output = new Float32Array(64);
  
  // Row-wise DCT
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let k = 0; k < N; k++) {
        sum += T[j * N + k] * block[i * N + k];
      }
      temp[i * N + j] = sum;
    }
  }
  
  // Col-wise DCT
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let k = 0; k < N; k++) {
        sum += T[i * N + k] * temp[k * N + j];
      }
      output[i * N + j] = sum;
    }
  }
  return output;
}

function idct8x8(block) {
  const temp = new Float32Array(64);
  const output = new Float32Array(64);
  
  // Row-wise IDCT
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let k = 0; k < N; k++) {
        sum += T[k * N + j] * block[i * N + k]; // Transposed T
      }
      temp[i * N + j] = sum;
    }
  }
  
  // Col-wise IDCT
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let k = 0; k < N; k++) {
        sum += T[k * N + i] * temp[k * N + j]; // Transposed T
      }
      output[i * N + j] = sum;
    }
  }
  return output;
}

self.onmessage = function(e) {
  const { type, imageData, watermarkData, config } = e.data;
  
  try {
    if (type === 'EMBED') {
      const result = embedWatermark(imageData, watermarkData, config.strength, config.watermarkWidth);
      self.postMessage({ type: 'EMBED_RESULT', imageData: result });
    } else if (type === 'EXTRACT') {
      const { bits, confidence, debugInfo } = robustExtractWatermark(imageData, config.strength, config.watermarkWidth || 0);
      self.postMessage({ type: 'EXTRACT_RESULT', extractedBits: bits, confidence, debugInfo });
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', error: err.message });
  }
};

function getBitIndex(x, y, bitLength, wmWidth) {
   const blockX = Math.floor(x / N);
   const blockY = Math.floor(y / N);
   
   if (wmWidth) {
       // 2D Spatial Tiling
       const w = wmWidth;
       const h = wmWidth;
       return (blockY % h) * w + (blockX % w);
   } else {
       // 1D Spatial Tiling for Text
       const w = 64; 
       const h = 64;
       const spatialIndex = (blockY % h) * w + (blockX % w);
       return spatialIndex % bitLength;
   }
}

function embedWatermark(imgData, bits, strength, wmWidth) {
  const width = imgData.width;
  const height = imgData.height;
  const data = imgData.data; // RGBA
  const bitLength = bits.length;
  
  for (let y = 0; y <= height - N; y += N) {
    for (let x = 0; x <= width - N; x += N) {
      
      const bitIndex = getBitIndex(x, y, bitLength, wmWidth);
      const currentBit = bits[bitIndex % bitLength];
      
      const block = new Float32Array(64);
      // Read Luma
      for (let by = 0; by < N; by++) {
        for (let bx = 0; bx < N; bx++) {
          const pixelIdx = ((y + by) * width + (x + bx)) * 4;
          const r = data[pixelIdx];
          const g = data[pixelIdx + 1];
          const b = data[pixelIdx + 2];
          // Y = 0.299R + 0.587G + 0.114B
          block[by * N + bx] = (0.299 * r + 0.587 * g + 0.114 * b) - 128;
        }
      }
      
      const dctBlock = dct8x8(block);
      
      // Mid-frequency coefficients (robust against compression)
      const u1 = 4, v1 = 3;
      const u2 = 3, v2 = 4;
      const P = strength; 
      
      if (currentBit === 1) {
        if (dctBlock[u1 * N + v1] <= dctBlock[u2 * N + v2]) {
           const diff = dctBlock[u2 * N + v2] - dctBlock[u1 * N + v1];
           dctBlock[u1 * N + v1] += (diff + P) / 2;
           dctBlock[u2 * N + v2] -= (diff + P) / 2;
        }
      } else {
        if (dctBlock[u1 * N + v1] >= dctBlock[u2 * N + v2]) {
           const diff = dctBlock[u1 * N + v1] - dctBlock[u2 * N + v2];
           dctBlock[u1 * N + v1] -= (diff + P) / 2;
           dctBlock[u2 * N + v2] += (diff + P) / 2;
        }
      }
      
      // Ensure Margin
      if (currentBit === 1) {
         if (dctBlock[u1 * N + v1] - dctBlock[u2 * N + v2] < P) {
             const target = (dctBlock[u1 * N + v1] + dctBlock[u2 * N + v2]) / 2;
             dctBlock[u1 * N + v1] = target + P/2;
             dctBlock[u2 * N + v2] = target - P/2;
         }
      } else {
         if (dctBlock[u2 * N + v2] - dctBlock[u1 * N + v1] < P) {
             const target = (dctBlock[u1 * N + v1] + dctBlock[u2 * N + v2]) / 2;
             dctBlock[u1 * N + v1] = target - P/2;
             dctBlock[u2 * N + v2] = target + P/2;
         }
      }

      const idctBlock = idct8x8(dctBlock);
      
      // Write back Luma difference to RGB
      for (let by = 0; by < N; by++) {
        for (let bx = 0; bx < N; bx++) {
          const pixelIdx = ((y + by) * width + (x + bx)) * 4;
          
          const oldLuma = block[by*N+bx] + 128;
          const newLuma = idctBlock[by*N+bx] + 128;
          const diff = newLuma - oldLuma;
          
          // Distribute diff equally to RGB to maintain color balance roughly
          // newR = R + diff, newG = G + diff ... => newLuma = Luma + diff
          
          data[pixelIdx] = Math.max(0, Math.min(255, data[pixelIdx] + diff));
          data[pixelIdx + 1] = Math.max(0, Math.min(255, data[pixelIdx + 1] + diff));
          data[pixelIdx + 2] = Math.max(0, Math.min(255, data[pixelIdx + 2] + diff));
        }
      }
    }
  }
  
  return imgData;
}

function robustExtractWatermark(imgData, strength, wmWidthInput) {
  const N = 8;
  const wmWidth = wmWidthInput > 0 ? wmWidthInput : 0;
  const bufferSize = wmWidth > 0 ? (wmWidth * wmWidth) : 4096; 
  
  // Search parameters
  let bestScore = -Infinity;
  let bestBits = new Float32Array(bufferSize).fill(0);
  let bestConfig = { rotation: 0, ox: 0, oy: 0 };
  
  const rotations = [0, 90, 180, 270];
  
  // 1. Grid Search Loop (Coarse)
  for (let rIdx = 0; rIdx < rotations.length; rIdx++) {
    const rotation = rotations[rIdx];
    // Check offsets 0, 2, 4, 6
    for (let oy = 0; oy < N; oy+=2) { 
      for (let ox = 0; ox < N; ox+=2) {
          const { energy } = analyzeSignal(imgData, rotation, ox, oy, wmWidth, bufferSize, true);
          if (energy > bestScore) {
              bestScore = energy;
              bestConfig = { rotation, ox, oy };
          }
      }
    }
  }
  
  // 2. Refine Grid Search (Local Neighborhood)
  let refinedScore = bestScore;
  let refinedConfig = { ...bestConfig };
  
  for(let dy = -1; dy <= 1; dy++) {
      for(let dx = -1; dx <= 1; dx++) {
          if (dx===0 && dy===0) continue;
          const tox = (bestConfig.ox + dx + 8) % 8;
          const toy = (bestConfig.oy + dy + 8) % 8;
          const { energy } = analyzeSignal(imgData, bestConfig.rotation, tox, toy, wmWidth, bufferSize, true);
          if (energy > refinedScore) {
              refinedScore = energy;
              refinedConfig = { rotation: bestConfig.rotation, ox: tox, oy: toy };
          }
      }
  }

  // 3. Full Extraction
  const finalResult = analyzeSignal(imgData, refinedConfig.rotation, refinedConfig.ox, refinedConfig.oy, wmWidth, bufferSize, false);
  
  const extractedBits = [];
  for(let i=0; i<bufferSize; i++) {
    extractedBits.push(finalResult.votes[i] > 0 ? 1 : 0);
  }
  
  return { 
    bits: extractedBits, 
    confidence: refinedScore,
    debugInfo: \`Grid: \${refinedConfig.ox}x\${refinedConfig.oy}, Rot: \${refinedConfig.rotation}°\` 
  };
}

function getUnrotatedBlock(data, width, height, sx, sy, rotation) {
    const block = new Float32Array(64);
    
    for (let by = 0; by < N; by++) {
        for (let bx = 0; bx < N; bx++) {
             const x = sx + bx;
             const y = sy + by;
             if (x >= width || y >= height) {
                 block[by*N + bx] = 0;
                 continue;
             }
             const pixelIdx = (y * width + x) * 4;
             const r = data[pixelIdx];
             const g = data[pixelIdx+1];
             const b = data[pixelIdx+2];
             block[by * N + bx] = (0.299 * r + 0.587 * g + 0.114 * b) - 128;
        }
    }
    
    if (rotation === 0) return block;

    const fixedBlock = new Float32Array(64);
    const fixRot = (360 - rotation) % 360; 
    
    for(let i=0; i<64; i++) {
        const y = Math.floor(i / 8);
        const x = i % 8;
        let nx, ny;
        if (fixRot === 90) { nx = 7 - y; ny = x; } 
        else if (fixRot === 180) { nx = 7 - x; ny = 7 - y; } 
        else if (fixRot === 270) { nx = y; ny = 7 - x; } 
        else { nx = x; ny = y; }
        fixedBlock[ny * 8 + nx] = block[y * 8 + x];
    }
    return fixedBlock;
}

function analyzeSignal(imgData, rotation, offsetx, offsety, wmWidth, bufferSize, isSampling) {
    const width = imgData.width;
    const height = imgData.height;
    const data = imgData.data;
    
    const votes = new Float32Array(bufferSize).fill(0);
    let totalEnergy = 0;
    let blockCount = 0;
    
    const u1 = 4, v1 = 3;
    const u2 = 3, v2 = 4;
    
    const step = isSampling ? N * 2 : N;
    
    // Original dimensions (approximate for tiling logic)
    const bw = Math.floor(width / N);
    const bh = Math.floor(height / N);
    
    for (let y = offsety; y <= height - N; y += step) {
      for (let x = offsetx; x <= width - N; x += step) {
        
        const block = getUnrotatedBlock(data, width, height, x, y, rotation);
        const dctBlock = dct8x8(block);
        const val1 = dctBlock[u1 * N + v1];
        const val2 = dctBlock[u2 * N + v2];
        const diff = val1 - val2;
        
        totalEnergy += Math.abs(diff);
        blockCount++;
        
        // Coordinate Mapping logic
        const currentBlockX = Math.floor((x - offsetx) / N);
        const currentBlockY = Math.floor((y - offsety) / N);
        
        let ox = currentBlockX;
        let oy = currentBlockY;
        
        if (rotation === 90) {
            ox = currentBlockY;
            oy = bw - 1 - currentBlockX; 
        } else if (rotation === 180) {
            ox = bw - 1 - currentBlockX;
            oy = bh - 1 - currentBlockY;
        } else if (rotation === 270) {
            ox = bh - 1 - currentBlockY;
            oy = currentBlockX;
        }
        
        const safeOx = (ox % 100000 + 100000) % 100000; 
        const safeOy = (oy % 100000 + 100000) % 100000;

        let index;
        if (wmWidth > 0) {
            const w = wmWidth;
            const h = wmWidth;
            index = (safeOy % h) * w + (safeOx % w);
        } else {
            const w = 64; 
            const h = 64;
            index = ((safeOy % h) * w + (safeOx % w));
        }
        
        if (index < bufferSize) {
            votes[index] += diff;
        }
      }
    }
    
    const normalizedEnergy = blockCount > 0 ? totalEnergy / blockCount : 0;
    return { energy: normalizedEnergy, votes };
}
`;
