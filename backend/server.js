// server.js

const express = require('express');
const cors = require('cors');
const xlsx = require('xlsx');
const fs = require('fs');

const app = express();
app.use(cors());           // <-- Allows requests from different origins
app.use(express.json());   // <-- Allows Express to parse JSON body

// POST endpoint to handle form submissions
app.post('/api/habits', (req, res) => {
  const data = req.body;
  
  const fileName = 'habits_data.xlsx';  // <-- Excel file we want to write to
  const sheetName = 'Habits';
  let workbook;

  // Check if the Excel file already exists
  if (fs.existsSync(fileName)) {
    // If yes, read the existing file
    workbook = xlsx.readFile(fileName);
  } else {
    // If not, create a new workbook and add a header row
    workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet([
      ["Date", "Water", "Running", "Gym", "Reading", "Friends"]
    ]);
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    xlsx.writeFile(workbook, fileName);
    
    // Re-read the file so it's up to date in memory
    workbook = xlsx.readFile(fileName);
  }

  // Retrieve the worksheet where we'll put new data
  const worksheet = workbook.Sheets[sheetName];
  // Determine the next row to write data to
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  const nextRow = range.e.r + 1;

  // Write each field into the next row of the sheet
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 0 })] = { v: data.date };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 1 })] = { v: data.water };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 2 })] = { v: data.running };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 3 })] = { v: data.gym };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 4 })] = { v: data.reading };
  worksheet[xlsx.utils.encode_cell({ r: nextRow, c: 5 })] = { v: data.friends };

  // Update the sheet range to include the new row
  range.e.r = nextRow;
  worksheet['!ref'] = xlsx.utils.encode_range(range);

  // Finally, write the updated workbook back to the file
  xlsx.writeFile(workbook, fileName);

  // Respond to the client
  res.status(200).json({ message: 'Data saved successfully' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
