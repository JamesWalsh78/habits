// server.js - Node.js backend to handle form submission and save to Excel

const express = require('express');
const cors = require('cors');
const xlsx = require('xlsx');
const fs = require('fs');

const app = express();
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON body

const FILE_NAME = 'habits_data.xlsx';
const SHEET_NAME = 'Habits';

// Handle POST requests
app.post('/api/habits', (req, res) => {
  const data = req.body;

  let workbook;
  if (fs.existsSync(FILE_NAME)) {
    workbook = xlsx.readFile(FILE_NAME);
  } else {
    workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet([
      ["Date", "Water", "Running", "Gym", "Reading", "Friends"]
    ]);
    xlsx.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
    xlsx.writeFile(workbook, FILE_NAME);
    workbook = xlsx.readFile(FILE_NAME);
  }

  const worksheet = workbook.Sheets[SHEET_NAME];
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  const nextRow = range.e.r + 1;

  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 0 })] = { v: data.date };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 1 })] = { v: data.water };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 2 })] = { v: data.running };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 3 })] = { v: data.gym };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 4 })] = { v: data.reading };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 5 })] = { v: data.friends };

  range.e.r = nextRow;
  worksheet['!ref'] = xlsx.utils.encode_range(range);
  xlsx.writeFile(workbook, FILE_NAME);

  res.status(200).json({ message: 'Data saved successfully' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get('/api/download-excel', (req, res) => {
  if (fs.existsSync(FILE_NAME)) {
    res.download(FILE_NAME);
  } else {
    res.status(404).send('No data found.');
  }
});