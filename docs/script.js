// script.js

// Set the default date to today when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("dateField").value = today;
  
  // Attach a submit event listener to the form
  const habitForm = document.getElementById("habitForm");
  habitForm.addEventListener("submit", async (event) => {
    // Prevent the default form submission
    event.preventDefault();

    // Gather form data
    const date = document.getElementById("dateField").value;
    const water = document.getElementById("waterSlider").value;
    const running = document.getElementById("runningRange").value;
    const gym = document.getElementById("gymSlider").value;
    const reading = document.getElementById("readingSlider").value;
    const friends = document.getElementById("friendsDropdown").value;

    // Create data object
    const formData = {
      date,
      water,
      running,
      gym,
      reading,
      friends,
    };

    // Send data to your backend (e.g. Render) for processing
    // Replace 'https://your-app-name.onrender.com/api/habits' with your actual endpoint
    try {
      const response = await fetch('https://habits-y6qj.onrender.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        alert('Data submitted successfully!');
      } else {
        alert('Error submitting data.');
      }
    } catch (error) {
      console.error('Request failed', error);
      alert('Failed to connect to the server.');
    }
  });
});
