
export const textToBits = (text: string): number[] => {
  const bits: number[] = [];
  const content = text + '\u0003'; 
  
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    for (let j = 7; j >= 0; j--) {
      bits.push((code >> j) & 1);
    }
  }
  return bits;
};

export const bitsToText = (bits: number[]): string => {
  // Helper to score a string's "English-ness" and validity
  const scoreText = (str: string): number => {
      if (!str || str.length < 3) return 0;
      let valid = 0;
      let alpha = 0;
      // Filter out the delimiter for scoring
      const cleanStr = str.replace(/\u0003/g, '');
      
      for(let i=0; i<cleanStr.length; i++) {
          const c = cleanStr.charCodeAt(i);
          if ((c>=32 && c<=126)) valid++;
          if ((c>=65 && c<=90) || (c>=97 && c<=122) || (c>=48 && c<=57)) alpha++;
      }
      
      const len = cleanStr.length;
      if (len === 0) return 0;
      const density = valid / len;
      if (density < 0.7) return 0; 
      
      let score = (alpha / len) * 10;
      
      // Bonus for common patterns in watermarks
      if (/\b(19|20)\d{2}\b/.test(cleanStr)) score += 5; // Year
      if (/Copyright|©|Reserved/i.test(cleanStr)) score += 5;
      if (/^[A-Z]/.test(cleanStr)) score += 2; // Starts with capital
      
      return score;
  };

  // Helper to recover text from a bitstream assuming a specific starting alignment
  const attemptRecovery = (shiftedBits: number[]): string => {
      // 1. Bits to Bytes
      const bytes: number[] = [];
      for (let i = 0; i < shiftedBits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j++) {
          if (i + j < shiftedBits.length) {
            byte = (byte << 1) | shiftedBits[i + j];
          }
        }
        bytes.push(byte);
      }
      
      // 2. Statistical Folding
      let bestLocalStr = "";
      let bestLocalScore = -1;

      for (let period = 4; period <= 40; period++) {
          let recoveredRaw = "";
          
          // Reconstruct the FULL period, do not stop at delimiter
          for(let i=0; i<period; i++) {
              const counts: Record<number, number> = {};
              // Collect votes from all repetitions
              for(let j=i; j<bytes.length; j+=period) {
                  const b = bytes[j];
                  if ((b>=32 && b<=126) || b===3) counts[b] = (counts[b]||0)+1;
              }
              
              // Find most frequent char
              let maxC = 0, winner = 0;
              for(const [k,v] of Object.entries(counts)) {
                  if(v > maxC) { maxC = v; winner = Number(k); }
              }
              
              if (winner > 0) recoveredRaw += String.fromCharCode(winner);
              else recoveredRaw += "?"; // Placeholder for bad signal
          }
          
          // 3. Delimiter Rotation Logic with Overlap Detection
          let candidate = recoveredRaw;
          if (recoveredRaw.includes('\u0003')) {
              const parts = recoveredRaw.split('\u0003');
              // parts[0] is Tail, parts[1] is Head
              // e.g. "opyright 2024" and "C" -> "C" + "opyright 2024"
              
              const tail = parts[0];
              const head = parts.length > 1 ? parts[1] : "";

              // Check for Overshoot (Duplication)
              // If Tail starts with Head (e.g. Tail="Copyright...", Head="Co"), 
              // it means we captured the start of the next cycle in Head. Discard Head.
              if (head.length > 0 && tail.startsWith(head)) {
                  candidate = tail;
              } else {
                  candidate = head + tail;
              }
          }

          // Clean up any remaining artifacts or nulls
          const cleanCandidate = candidate.replace(/\u0003/g, '').replace(/\?/g, '');

          if (cleanCandidate.length > 2) {
              const s = scoreText(cleanCandidate);
              if (s > bestLocalScore) {
                  bestLocalScore = s;
                  bestLocalStr = cleanCandidate;
              }
          }
      }
      return bestLocalStr;
  };

  let globalBest = "";
  let globalMaxScore = -1;

  // CRITICAL FIX: Block Shift Compensation
  for(let offset=0; offset<8; offset++) {
      const subBits = bits.slice(offset);
      const res = attemptRecovery(subBits);
      const score = scoreText(res);
      
      if (score > globalMaxScore) {
          globalMaxScore = score;
          globalBest = res;
      }
  }

  return globalBest || "No legible watermark found";
};

export const imageToBits = async (file: File): Promise<number[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 64; 
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve([]);
      
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      
      const grayData = new Float32Array(size * size);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        grayData[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b; 
      }

      // Floyd-Steinberg Dithering
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = y * size + x;
          const oldPixel = grayData[idx];
          const newPixel = oldPixel < 128 ? 0 : 255;
          
          grayData[idx] = newPixel;
          const quantError = oldPixel - newPixel;

          if (x + 1 < size) 
            grayData[y * size + (x + 1)] += quantError * 7 / 16;
          if (x - 1 >= 0 && y + 1 < size) 
            grayData[(y + 1) * size + (x - 1)] += quantError * 3 / 16;
          if (y + 1 < size) 
            grayData[(y + 1) * size + x] += quantError * 5 / 16;
          if (x + 1 < size && y + 1 < size) 
            grayData[(y + 1) * size + (x + 1)] += quantError * 1 / 16;
        }
      }

      const bits: number[] = [];
      for (let i = 0; i < grayData.length; i++) {
         bits.push(grayData[i] > 128 ? 1 : 0);
      }
      
      resolve(bits);
    };
    img.src = URL.createObjectURL(file);
  });
};

export const bitsToImageCanvas = (bits: number[], size: number = 64): HTMLCanvasElement => {
    let renderSize = size;
    let renderBits = bits;
    
    // Legacy 2x2 Tiling Check for 64x64
    if (size === 64) {
        const half = 32;
        let similarityScore = 0;
        let checks = 0;
        for(let i=0; i<100; i++) {
            const y = Math.floor(Math.random() * half);
            const x = Math.floor(Math.random() * half);
            const tl = bits[y*size + x];
            const tr = bits[y*size + (x+half)];
            const bl = bits[(y+half)*size + x];
            const br = bits[(y+half)*size + (x+half)];
            if (tl === tr && tl === bl && tl === br) similarityScore++;
            checks++;
        }
        if (similarityScore / checks > 0.8) {
            renderSize = 32;
            const mergedBits = [];
            for(let y=0; y<32; y++) {
                for(let x=0; x<32; x++) {
                    const tl = bits[y*size + x];
                    const tr = bits[y*size + (x+half)];
                    const bl = bits[(y+half)*size + x];
                    const br = bits[(y+half)*size + (x+half)];
                    const sum = tl + tr + bl + br;
                    mergedBits.push(sum >= 2 ? 1 : 0);
                }
            }
            renderBits = mergedBits;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = renderSize;
    canvas.height = renderSize;
    const ctx = canvas.getContext('2d');
    if(!ctx) return canvas;
    
    const imgData = ctx.createImageData(renderSize, renderSize);
    
    for(let i=0; i<renderBits.length; i++) {
        const val = renderBits[i]; 
        if (val === 1) {
            imgData.data[i*4] = 255;   
            imgData.data[i*4+1] = 255; 
            imgData.data[i*4+2] = 255; 
            imgData.data[i*4+3] = 255; 
        } else {
            imgData.data[i*4] = 0;
            imgData.data[i*4+1] = 0;
            imgData.data[i*4+2] = 0;
            imgData.data[i*4+3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
}
