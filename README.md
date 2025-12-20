
# BlindMark Pro

**BlindMark Pro** is a professional-grade, client-side **Blind Watermarking** solution built with **React 19**, **TypeScript**, and **Web Workers**. 

Unlike traditional visible watermarks, BlindMark Pro embeds information invisibly into the frequency domain of the image (using Discrete Cosine Transform - DCT), making it highly robust against image processing attacks such as **cropping**, **rotation (90°/180°/270°)**, **compression**, and **noise**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tech](https://img.shields.io/badge/Tech-React%20%7C%20TypeScript%20%7C%20WebWorker-cyan)

## ✨ Key Features

### 1. Robust Invisible Watermarking
*   **Text Embedding**: Embed copyright text (e.g., "Copyright 2024") invisibly.
*   **Image Embedding**: Embed small logos or icons (automatically dithered to binary).
*   **Frequency Domain (DCT)**: Modulates mid-frequency coefficients in 8x8 blocks, ensuring visual quality while maintaining signal strength.
*   **Blind Extraction**: No original image is needed to extract the watermark.

### 2. Resilience & Durability
*   **Anti-Crop**: Uses repetitive embedding; the watermark can be recovered even if 80% of the image is cropped.
*   **Anti-Rotation**: Includes an auto-detection algorithm to recover watermarks from images rotated by 90°, 180°, or 270°.
*   **Error Correction**: Uses statistical voting and majority rule to reconstruct bits from noisy data.

### 3. Professional UI/UX
*   **Real-time Comparison**: Interactive "Before/After" slider to inspect visual quality degradation.
*   **Dark Mode**: Fully responsive dark/light theme.
*   **Performance**: Heavy mathematical operations (DCT/IDCT) run in a background **Web Worker**, keeping the UI responsive.

### 4. PDF Tools
*   **Dual Protection**: Adds visible low-opacity text overlays AND invisible metadata tags.
*   **Verification**: Scans PDF metadata to verify copyright authenticity.

---

## 🛠 Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **Processing**: Web Workers (Off-main-thread computation)
*   **Algorithms**: 
    *   DCT (Discrete Cosine Transform)
    *   Floyd-Steinberg Dithering
    *   Cyclic Redundancy Check / Majority Voting
*   **PDF**: `pdf-lib`

---

## 🧠 Algorithmic Details

### Embedding Process
1.  **Preprocessing**: The image is converted to RGBA data.
2.  **Block Division**: The image is divided into `8x8` pixel blocks.
3.  **DCT Transformation**: Each block's Luma (Y channel) is transformed into the frequency domain using DCT.
4.  **Coefficient Modulation**: Two mid-frequency coefficients ($u_1, v_1$) and ($u_2, v_2$) are selected.
    *   To embed `1`: Ensure Coefficient A > Coefficient B + Strength.
    *   To embed `0`: Ensure Coefficient B > Coefficient A + Strength.
5.  **IDCT**: The block is transformed back to the spatial domain (pixels).

### Extraction Process
1.  **Grid Search**: The extractor scans the image with different offsets and rotations (0/90/180/270).
2.  **Energy Analysis**: It calculates the signal energy (difference between coefficients) to find the best alignment.
3.  **Statistical Voting**: Since the watermark is repeated across the image, thousands of blocks "vote" for the value of each bit.
4.  **Reconstruction**: The most probable bitstream is assembled and decoded back into text or image.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v16+)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/blindmark-pro.git
    cd blindmark-pro
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:5173` (or the port shown in your terminal).

---

## ⚠️ Disclaimer

While BlindMark Pro is robust against common edits (cropping, resizing, compression), no watermarking technique is invincible. Advanced geometric attacks (e.g., severe warping, aspect ratio changes) or specialized removal AI tools may still compromise the watermark. This tool is intended for copyright assertion and ownership tracking, not military-grade steganography.
