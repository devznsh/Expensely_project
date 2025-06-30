const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Tesseract = require('tesseract.js');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/ocr', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image not provided' });
  }

  try {
    const result = await Tesseract.recognize(
      `data:image/png;base64,${image}`,
      'eng',
      {
        logger: (m) => console.log('OCR Progress:', m),
      }
    );

    const extractedText = result.data.text.trim();
    console.log('Extracted Text:', extractedText);
    res.json({ text: extractedText });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.listen(PORT, () => {
  console.log(`OCR server running at http://localhost:${PORT}`);
});
